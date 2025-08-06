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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeController = void 0;
const common_1 = require("@nestjs/common");
const knowledge_service_1 = require("./knowledge.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../common/roles.guard");
const roles_decorator_1 = require("../common/roles.decorator");
const client_1 = require("@prisma/client");
const common_2 = require("@muralla/common");
let KnowledgeController = class KnowledgeController {
    constructor(knowledgeService) {
        this.knowledgeService = knowledgeService;
    }
    // ==================== DOCUMENT CRUD ====================
    async createDocument(createDocumentDto, req) {
        return this.knowledgeService.createDocument(createDocumentDto, req.user.id);
    }
    async getDocuments(page, limit, search, type, status, authorId, parentId, tags) {
        const query = {
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
    async getDocumentById(id, incrementView) {
        return this.knowledgeService.getDocumentById(id, incrementView);
    }
    async getDocumentBySlug(slug, incrementView) {
        return this.knowledgeService.getDocumentBySlug(slug, incrementView);
    }
    async updateDocument(id, updateDocumentDto, req) {
        return this.knowledgeService.updateDocument(id, updateDocumentDto, req.user.id);
    }
    async deleteDocument(id, req) {
        return this.knowledgeService.deleteDocument(id, req.user.id);
    }
    // ==================== REVISION HISTORY ====================
    async getDocumentRevisions(id) {
        return this.knowledgeService.getDocumentRevisions(id);
    }
    async getRevisionById(revisionId) {
        return this.knowledgeService.getRevisionById(revisionId);
    }
    async restoreRevision(documentId, revisionId, req) {
        return this.knowledgeService.restoreRevision(documentId, revisionId, req.user.id);
    }
    // ==================== ANALYTICS & STATS ====================
    async getDocumentStats() {
        return this.knowledgeService.getDocumentStats();
    }
    async getPopularDocuments(limit) {
        return this.knowledgeService.getPopularDocuments(limit);
    }
    async getRecentDocuments(limit) {
        return this.knowledgeService.getRecentDocuments(limit);
    }
    // ==================== LEGACY COMPATIBILITY ====================
    // Keep old endpoints for backward compatibility
    async create(createDocumentDto, req) {
        return this.knowledgeService.createDocument(createDocumentDto, req.user.id);
    }
    async findAll(type, authorId, search) {
        const query = { type, authorId, search };
        const result = await this.knowledgeService.getDocuments(query);
        return result.documents; // Return just documents for legacy compatibility
    }
    async findOne(id) {
        return this.knowledgeService.getDocumentById(id, true); // Increment view count
    }
    async update(id, updateDocumentDto, req) {
        return this.knowledgeService.updateDocument(id, updateDocumentDto, req.user.id);
    }
    async remove(id, req) {
        return this.knowledgeService.deleteDocument(id, req.user.id);
    }
};
exports.KnowledgeController = KnowledgeController;
__decorate([
    (0, common_1.Post)('documents'),
    (0, roles_decorator_1.Roles)('admin', 'manager', 'staff'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [common_2.CreateDocumentDto, Object]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "createDocument", null);
__decorate([
    (0, common_1.Get)('documents'),
    (0, roles_decorator_1.Roles)('admin', 'manager', 'staff'),
    __param(0, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('type')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('authorId')),
    __param(6, (0, common_1.Query)('parentId')),
    __param(7, (0, common_1.Query)('tags')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "getDocuments", null);
__decorate([
    (0, common_1.Get)('documents/:id'),
    (0, roles_decorator_1.Roles)('admin', 'manager', 'staff'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('incrementView', new common_1.DefaultValuePipe(false), common_1.ParseBoolPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "getDocumentById", null);
__decorate([
    (0, common_1.Get)('documents/slug/:slug'),
    (0, roles_decorator_1.Roles)('admin', 'manager', 'staff'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Query)('incrementView', new common_1.DefaultValuePipe(false), common_1.ParseBoolPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "getDocumentBySlug", null);
__decorate([
    (0, common_1.Patch)('documents/:id'),
    (0, roles_decorator_1.Roles)('admin', 'manager', 'staff'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, common_2.UpdateDocumentDto, Object]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "updateDocument", null);
__decorate([
    (0, common_1.Delete)('documents/:id'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "deleteDocument", null);
__decorate([
    (0, common_1.Get)('documents/:id/revisions'),
    (0, roles_decorator_1.Roles)('admin', 'manager', 'staff'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "getDocumentRevisions", null);
__decorate([
    (0, common_1.Get)('revisions/:revisionId'),
    (0, roles_decorator_1.Roles)('admin', 'manager', 'staff'),
    __param(0, (0, common_1.Param)('revisionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "getRevisionById", null);
__decorate([
    (0, common_1.Post)('documents/:id/revisions/:revisionId/restore'),
    (0, roles_decorator_1.Roles)('admin', 'manager', 'staff'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('revisionId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "restoreRevision", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "getDocumentStats", null);
__decorate([
    (0, common_1.Get)('popular'),
    (0, roles_decorator_1.Roles)('admin', 'manager', 'staff'),
    __param(0, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(10), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "getPopularDocuments", null);
__decorate([
    (0, common_1.Get)('recent'),
    (0, roles_decorator_1.Roles)('admin', 'manager', 'staff'),
    __param(0, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(10), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "getRecentDocuments", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('admin', 'manager', 'staff'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [common_2.CreateDocumentDto, Object]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('admin', 'manager', 'staff'),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('authorId')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('admin', 'manager', 'staff'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('admin', 'manager', 'staff'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, common_2.UpdateDocumentDto, Object]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "remove", null);
exports.KnowledgeController = KnowledgeController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('knowledge'),
    __metadata("design:paramtypes", [knowledge_service_1.KnowledgeService])
], KnowledgeController);
