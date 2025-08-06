import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  ParseBoolPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { DocumentType, DocumentStatus } from '@prisma/client';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentQueryDto,
} from '@muralla/common';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  // ==================== DOCUMENT CRUD ====================

  @Post('documents')
  @Roles('admin', 'manager', 'staff')
  async createDocument(@Body() createDocumentDto: CreateDocumentDto, @Request() req: any) {
    return this.knowledgeService.createDocument(createDocumentDto, req.user.id);
  }

  @Get('documents')
  @Roles('admin', 'manager', 'staff')
  async getDocuments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('type') type?: DocumentType,
    @Query('status') status?: DocumentStatus,
    @Query('authorId') authorId?: string,
    @Query('parentId') parentId?: string,
    @Query('tags') tags?: string,
  ) {
    const query: DocumentQueryDto = {
      page,
      limit,
      search,
      type,
      status: status === 'REVIEW' ? 'DRAFT' : status,
      authorId,
      parentId,
      ...(tags && { tags: tags.split(',') }),
    };
    return this.knowledgeService.getDocuments(query);
  }

  @Get('documents/:id')
  @Roles('admin', 'manager', 'staff')
  async getDocumentById(
    @Param('id') id: string,
    @Query('incrementView', new DefaultValuePipe(false), ParseBoolPipe) incrementView: boolean,
  ) {
    return this.knowledgeService.getDocumentById(id, incrementView);
  }

  @Get('documents/slug/:slug')
  @Roles('admin', 'manager', 'staff')
  async getDocumentBySlug(
    @Param('slug') slug: string,
    @Query('incrementView', new DefaultValuePipe(false), ParseBoolPipe) incrementView: boolean,
  ) {
    return this.knowledgeService.getDocumentBySlug(slug, incrementView);
  }

  @Patch('documents/:id')
  @Roles('admin', 'manager', 'staff')
  async updateDocument(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Request() req: any,
  ) {
    return this.knowledgeService.updateDocument(id, updateDocumentDto, req.user.id);
  }

  @Delete('documents/:id')
  @Roles('admin', 'manager')
  async deleteDocument(@Param('id') id: string, @Request() req: any) {
    return this.knowledgeService.deleteDocument(id, req.user.id);
  }

  // ==================== REVISION HISTORY ====================

  @Get('documents/:id/revisions')
  @Roles('admin', 'manager', 'staff')
  async getDocumentRevisions(@Param('id') id: string) {
    return this.knowledgeService.getDocumentRevisions(id);
  }

  @Get('revisions/:revisionId')
  @Roles('admin', 'manager', 'staff')
  async getRevisionById(@Param('revisionId') revisionId: string) {
    return this.knowledgeService.getRevisionById(revisionId);
  }

  @Post('documents/:id/revisions/:revisionId/restore')
  @Roles('admin', 'manager', 'staff')
  async restoreRevision(
    @Param('id') documentId: string,
    @Param('revisionId') revisionId: string,
    @Request() req: any,
  ) {
    return this.knowledgeService.restoreRevision(documentId, revisionId, req.user.id);
  }

  // ==================== ANALYTICS & STATS ====================

  @Get('stats')
  @Roles('admin', 'manager')
  async getDocumentStats() {
    return this.knowledgeService.getDocumentStats();
  }

  @Get('popular')
  @Roles('admin', 'manager', 'staff')
  async getPopularDocuments(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.knowledgeService.getPopularDocuments(limit);
  }

  @Get('recent')
  @Roles('admin', 'manager', 'staff')
  async getRecentDocuments(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.knowledgeService.getRecentDocuments(limit);
  }

  // ==================== LEGACY COMPATIBILITY ====================
  // Keep old endpoints for backward compatibility

  @Post()
  @Roles('admin', 'manager', 'staff')
  async create(@Body() createDocumentDto: CreateDocumentDto, @Request() req: any) {
    return this.knowledgeService.createDocument(createDocumentDto, req.user.id);
  }

  @Get()
  @Roles('admin', 'manager', 'staff')
  async findAll(
    @Query('type') type?: DocumentType,
    @Query('authorId') authorId?: string,
    @Query('search') search?: string,
  ) {
    const query: DocumentQueryDto = { type, authorId, search };
    const result = await this.knowledgeService.getDocuments(query);
    return result.documents; // Return just documents for legacy compatibility
  }

  @Get(':id')
  @Roles('admin', 'manager', 'staff')
  async findOne(@Param('id') id: string) {
    return this.knowledgeService.getDocumentById(id, true); // Increment view count
  }

  @Patch(':id')
  @Roles('admin', 'manager', 'staff')
  async update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Request() req: any,
  ) {
    return this.knowledgeService.updateDocument(id, updateDocumentDto, req.user.id);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.knowledgeService.deleteDocument(id, req.user.id);
  }
}
