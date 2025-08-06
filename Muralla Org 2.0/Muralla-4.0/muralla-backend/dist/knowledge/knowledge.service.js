"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../common/audit.service");
const client_1 = require("@prisma/client");
let KnowledgeService = class KnowledgeService {
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    // ==================== DOCUMENT CRUD ====================
    async createDocument(data, userId) {
        // Generate URL-friendly slug from title
        const slug = this.generateSlug(data.title);
        // Ensure slug is unique
        const existingDoc = await this.prisma.document.findUnique({ where: { slug } });
        if (existingDoc) {
            throw new common_1.BadRequestException(`Document with slug '${slug}' already exists`);
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
                status: client_1.DocumentStatus.DRAFT,
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
            operation: audit_service_1.AuditOperation.CREATE,
            afterData: document,
            userId,
        });
        return document;
    }
    async getDocuments(query = {}) {
        const { page = 1, limit = 20, search, type, status, authorId, tags, parentId } = query;
        const skip = (page - 1) * limit;
        const where = {
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
    async getDocumentById(id, incrementView = false) {
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
            throw new common_1.NotFoundException('Document not found');
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
    async getDocumentBySlug(slug, incrementView = false) {
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
            throw new common_1.NotFoundException('Document not found');
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
    async updateDocument(id, data, userId) {
        const existingDoc = await this.getDocumentById(id);
        // Check if content has actually changed to create revision
        const contentChanged = data.content && data.content !== existingDoc.content;
        const titleChanged = data.title && data.title !== existingDoc.title;
        let newSlug = existingDoc.slug;
        if (titleChanged) {
            newSlug = this.generateSlug(data.title);
            // Ensure new slug is unique (excluding current document)
            const existingSlug = await this.prisma.document.findFirst({
                where: { slug: newSlug, id: { not: id } },
            });
            if (existingSlug) {
                throw new common_1.BadRequestException(`Document with slug '${newSlug}' already exists`);
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
                ...(data.status === client_1.DocumentStatus.PUBLISHED && { publishedAt: new Date() }),
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
            operation: audit_service_1.AuditOperation.UPDATE,
            beforeData: existingDoc,
            afterData: updatedDocument,
            userId,
        });
        return updatedDocument;
    }
    async deleteDocument(id, userId) {
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
            operation: audit_service_1.AuditOperation.DELETE,
            beforeData: existingDoc,
            userId,
        });
        return { message: 'Document deleted successfully' };
    }
    // ==================== REVISION HISTORY ====================
    async createRevision(documentId, data, userId) {
        // Get next version number
        const lastRevision = await this.prisma.documentRevision.findFirst({
            where: { documentId },
            orderBy: { version: 'desc' },
        });
        const nextVersion = ((lastRevision === null || lastRevision === void 0 ? void 0 : lastRevision.version) || 0) + 1;
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
    async getDocumentRevisions(documentId) {
        return this.prisma.documentRevision.findMany({
            where: { documentId },
            orderBy: { version: 'desc' },
            include: {
                author: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
    async getRevisionById(revisionId) {
        const revision = await this.prisma.documentRevision.findUnique({
            where: { id: revisionId },
            include: {
                author: { select: { id: true, firstName: true, lastName: true } },
                document: { select: { id: true, title: true, slug: true } },
            },
        });
        if (!revision) {
            throw new common_1.NotFoundException('Revision not found');
        }
        return revision;
    }
    async restoreRevision(documentId, revisionId, userId) {
        const revision = await this.getRevisionById(revisionId);
        if (revision.documentId !== documentId) {
            throw new common_1.BadRequestException('Revision does not belong to this document');
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
    generateSlug(title) {
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
            this.prisma.document.count({ where: { isDeleted: false, status: client_1.DocumentStatus.PUBLISHED } }),
            this.prisma.document.count({ where: { isDeleted: false, status: client_1.DocumentStatus.DRAFT } }),
            this.prisma.document.count({ where: { isDeleted: false, type: client_1.DocumentType.WIKI } }),
            this.prisma.document.count({ where: { isDeleted: false, type: client_1.DocumentType.SOP } }),
            this.prisma.document.count({ where: { isDeleted: false, type: client_1.DocumentType.PLAYBOOK } }),
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
            where: { isDeleted: false, status: client_1.DocumentStatus.PUBLISHED },
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
};
exports.KnowledgeService = KnowledgeService;
exports.KnowledgeService = KnowledgeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], KnowledgeService);
