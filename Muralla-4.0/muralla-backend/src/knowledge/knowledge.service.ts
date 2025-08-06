import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditOperation } from '../common/audit.service';
import { Prisma, DocumentType, DocumentStatus } from '@prisma/client';

interface CreateDocumentDto {
  title: string;
  content: string;
  summary?: string;
  type: DocumentType;
  tags?: string[];
  parentId?: string;
  tenantId?: string;
}

interface UpdateDocumentDto {
  title?: string;
  content?: string;
  summary?: string;
  tags?: string[];
  status?: DocumentStatus;
  changeLog?: string;
}

interface DocumentQueryDto {
  type?: DocumentType;
  status?: DocumentStatus;
  authorId?: string;
  tags?: string[];
  search?: string;
  parentId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class KnowledgeService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ==================== DOCUMENT CRUD ====================

  async createDocument(data: CreateDocumentDto, userId: string) {
    // Generate URL-friendly slug from title
    const slug = this.generateSlug(data.title);
    
    // Ensure slug is unique
    const existingDoc = await this.prisma.document.findUnique({ where: { slug } });
    if (existingDoc) {
      throw new BadRequestException(`Document with slug '${slug}' already exists`);
    }

    const document = await this.prisma.document.create({
      data: {
        title: data.title,
        content: data.content,
        slug,
        summary: data.summary,
        type: data.type,
        tags: data.tags || [],
        parentId: data.parentId,
        authorId: userId,
        createdBy: userId,
        tenantId: data.tenantId,
        status: DocumentStatus.DRAFT,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
        parent: { select: { id: true, title: true, slug: true } },
        revisions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    // Create initial revision
    await this.createRevision(document.id, {
      title: data.title,
      content: data.content,
      summary: data.summary,
      changeLog: 'Initial document creation',
    }, userId);

    // Audit log
    await this.auditService.logAuditTrail({
      tableName: 'documents',
      recordId: document.id,
      operation: AuditOperation.CREATE,
      afterData: document,
      userId,
    });

    return document;
  }

  async getDocuments(query: DocumentQueryDto = {}) {
    const { page = 1, limit = 20, search, type, status, authorId, tags, parentId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = {
      isDeleted: false,
      ...(type && { type }),
      ...(status && { status }),
      ...(authorId && { authorId }),
      ...(parentId && { parentId }),
      ...(tags && tags.length > 0 && { tags: { hasSome: tags } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, email: true } },
          parent: { select: { id: true, title: true, slug: true } },
          _count: { select: { children: true, revisions: true } },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      documents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDocumentById(id: string, incrementView = false) {
    const document = await this.prisma.document.findUnique({
      where: { id, isDeleted: false },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
        parent: { select: { id: true, title: true, slug: true } },
        children: {
          select: { id: true, title: true, slug: true, type: true, status: true, updatedAt: true },
          where: { isDeleted: false },
          orderBy: { title: 'asc' },
        },
        revisions: {
          orderBy: { version: 'desc' },
          take: 5,
          include: {
            author: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Increment view count if requested
    if (incrementView) {
      await this.prisma.document.update({
        where: { id },
        data: {
          viewCount: { increment: 1 },
          lastViewedAt: new Date(),
        },
      });
    }

    return document;
  }

  async getDocumentBySlug(slug: string, incrementView = false) {
    const document = await this.prisma.document.findUnique({
      where: { slug, isDeleted: false },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
        parent: { select: { id: true, title: true, slug: true } },
        children: {
          select: { id: true, title: true, slug: true, type: true, status: true, updatedAt: true },
          where: { isDeleted: false },
          orderBy: { title: 'asc' },
        },
        revisions: {
          orderBy: { version: 'desc' },
          take: 5,
          include: {
            author: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Increment view count if requested
    if (incrementView) {
      await this.prisma.document.update({
        where: { slug },
        data: {
          viewCount: { increment: 1 },
          lastViewedAt: new Date(),
        },
      });
    }

    return document;
  }

  async updateDocument(id: string, data: UpdateDocumentDto, userId: string) {
    const existingDoc = await this.getDocumentById(id);
    
    // Check if content has actually changed to create revision
    const contentChanged = data.content && data.content !== existingDoc.content;
    const titleChanged = data.title && data.title !== existingDoc.title;
    
    let newSlug = existingDoc.slug;
    if (titleChanged) {
      newSlug = this.generateSlug(data.title!);
      // Ensure new slug is unique (excluding current document)
      const existingSlug = await this.prisma.document.findFirst({
        where: { slug: newSlug, id: { not: id } },
      });
      if (existingSlug) {
        throw new BadRequestException(`Document with slug '${newSlug}' already exists`);
      }
    }

    const updatedDocument = await this.prisma.document.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title, slug: newSlug }),
        ...(data.content && { content: data.content }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.tags && { tags: data.tags }),
        ...(data.status && { status: data.status }),
        ...(data.status === DocumentStatus.PUBLISHED && { publishedAt: new Date() }),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
        parent: { select: { id: true, title: true, slug: true } },
        revisions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    // Create revision if content or title changed
    if (contentChanged || titleChanged) {
      await this.createRevision(id, {
        title: updatedDocument.title,
        content: updatedDocument.content,
        summary: updatedDocument.summary,
        changeLog: data.changeLog || 'Document updated',
      }, userId);
    }

    // Audit log
    await this.auditService.logAuditTrail({
      tableName: 'documents',
      recordId: id,
      operation: AuditOperation.UPDATE,
      beforeData: existingDoc,
      afterData: updatedDocument,
      userId,
    });

    return updatedDocument;
  }

  async deleteDocument(id: string, userId: string) {
    const existingDoc = await this.getDocumentById(id);

    const deletedDocument = await this.prisma.document.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    // Audit log
    await this.auditService.logAuditTrail({
      tableName: 'documents',
      recordId: id,
      operation: AuditOperation.DELETE,
      beforeData: existingDoc,
      userId,
    });

    return { message: 'Document deleted successfully' };
  }

  // ==================== REVISION HISTORY ====================

  async createRevision(documentId: string, data: {
    title: string;
    content: string;
    summary?: string | null;
    changeLog?: string;
  }, userId: string) {
    // Get next version number
    const lastRevision = await this.prisma.documentRevision.findFirst({
      where: { documentId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (lastRevision?.version || 0) + 1;

    return this.prisma.documentRevision.create({
      data: {
        documentId,
        version: nextVersion,
        title: data.title,
        content: data.content,
        summary: data.summary,
        changeLog: data.changeLog || `Version ${nextVersion}`,
        authorId: userId,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getDocumentRevisions(documentId: string) {
    return this.prisma.documentRevision.findMany({
      where: { documentId },
      orderBy: { version: 'desc' },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getRevisionById(revisionId: string) {
    const revision = await this.prisma.documentRevision.findUnique({
      where: { id: revisionId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        document: { select: { id: true, title: true, slug: true } },
      },
    });

    if (!revision) {
      throw new NotFoundException('Revision not found');
    }

    return revision;
  }

  async restoreRevision(documentId: string, revisionId: string, userId: string) {
    const revision = await this.getRevisionById(revisionId);
    
    if (revision.documentId !== documentId) {
      throw new BadRequestException('Revision does not belong to this document');
    }

    // Update document with revision content
    const updatedDocument = await this.updateDocument(documentId, {
      title: revision.title,
      content: revision.content,
      summary: revision.summary || undefined,
      changeLog: `Restored from version ${revision.version}`,
    }, userId);

    return updatedDocument;
  }

  // ==================== UTILITY METHODS ====================

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  async getDocumentStats() {
    const [totalDocs, publishedDocs, draftDocs, wikiPages, sopDocs, policies] = await Promise.all([
      this.prisma.document.count({ where: { isDeleted: false } }),
      this.prisma.document.count({ where: { isDeleted: false, status: DocumentStatus.PUBLISHED } }),
      this.prisma.document.count({ where: { isDeleted: false, status: DocumentStatus.DRAFT } }),
      this.prisma.document.count({ where: { isDeleted: false, type: DocumentType.WIKI } }),
      this.prisma.document.count({ where: { isDeleted: false, type: DocumentType.SOP } }),
      this.prisma.document.count({ where: { isDeleted: false, type: DocumentType.PLAYBOOK } }),
    ]);

    return {
      totalDocuments: totalDocs,
      publishedDocuments: publishedDocs,
      draftDocuments: draftDocs,
      wikiPages,
      sopDocuments: sopDocs,
      policyDocuments: policies,
    };
  }

  async getPopularDocuments(limit = 10) {
    return this.prisma.document.findMany({
      where: { isDeleted: false, status: DocumentStatus.PUBLISHED },
      orderBy: { viewCount: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        viewCount: true,
        lastViewedAt: true,
        author: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async getRecentDocuments(limit = 10) {
    return this.prisma.document.findMany({
      where: { isDeleted: false },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        status: true,
        updatedAt: true,
        author: { select: { firstName: true, lastName: true } },
      },
    });
  }
}
