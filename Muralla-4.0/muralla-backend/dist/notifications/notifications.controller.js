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
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../common/roles.guard");
const roles_decorator_1 = require("../common/roles.decorator");
const public_decorator_1 = require("../auth/public.decorator");
const notifications_service_1 = require("./notifications.service");
const common_2 = require("@muralla/common");
let NotificationsController = class NotificationsController {
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }
    // ==================== TEMPLATES ====================
    async createTemplate(createTemplateDto, req) {
        return this.notificationsService.createTemplate(createTemplateDto, req.user.id);
    }
    async getTemplates(query) {
        return this.notificationsService.getTemplates(query);
    }
    async getTemplate(id) {
        return this.notificationsService.getTemplate(id);
    }
    async updateTemplate(id, updateTemplateDto, req) {
        return this.notificationsService.updateTemplate(id, updateTemplateDto, req.user.id);
    }
    async deleteTemplate(id, req) {
        return this.notificationsService.deleteTemplate(id, req.user.id);
    }
    // ==================== RULES ====================
    async createRule(createRuleDto, req) {
        return this.notificationsService.createRule(createRuleDto, req.user.id);
    }
    async getRules(query) {
        return this.notificationsService.getRules(query);
    }
    async updateRule(id, updateRuleDto, req) {
        return this.notificationsService.updateRule(id, updateRuleDto, req.user.id);
    }
    // ==================== NOTIFICATIONS ====================
    async sendNotification(sendNotificationDto, req) {
        return this.notificationsService.sendNotification(sendNotificationDto, req.user.id);
    }
    async getMyNotifications(query, req) {
        return this.notificationsService.getUserNotifications(req.user.id, query);
    }
    async markAsRead(id, req) {
        return this.notificationsService.markAsRead(id, req.user.id);
    }
    async markAllAsRead(req) {
        // TODO: Implement markAllAsRead method
        return { message: 'Mark all as read not implemented yet' };
    }
    // ==================== WEBHOOK FOR TESTING ====================
    async testWebhook(body) {
        // This endpoint can be used for testing rule-based notifications
        // In a real scenario, this would be called by other services or external webhooks
        const context = {
            entityType: body.entityType || 'Task',
            entityId: body.entityId || 'test-id',
            entityData: body.entityData || { title: 'Test Task', status: 'completed' },
            userId: body.userId,
            metadata: body.metadata || {},
        };
        await this.notificationsService.processRules(context.entityType, context.entityId, context.entityData);
        return { message: 'Webhook processed successfully' };
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Post)('templates'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [common_2.CreateNotificationTemplateDto, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "createTemplate", null);
__decorate([
    (0, common_1.Get)('templates'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [common_2.NotificationQueryDto]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getTemplates", null);
__decorate([
    (0, common_1.Get)('templates/:id'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getTemplate", null);
__decorate([
    (0, common_1.Put)('templates/:id'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, common_2.UpdateNotificationTemplateDto, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "updateTemplate", null);
__decorate([
    (0, common_1.Delete)('templates/:id'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "deleteTemplate", null);
__decorate([
    (0, common_1.Post)('rules'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [common_2.CreateNotificationRuleDto, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "createRule", null);
__decorate([
    (0, common_1.Get)('rules'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [common_2.NotificationQueryDto]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getRules", null);
__decorate([
    (0, common_1.Put)('rules/:id'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, common_2.UpdateNotificationRuleDto, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "updateRule", null);
__decorate([
    (0, common_1.Post)('send'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [common_2.SendNotificationDto, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "sendNotification", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [common_2.NotificationQueryDto, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getMyNotifications", null);
__decorate([
    (0, common_1.Put)(':id/read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Put)('read-all'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markAllAsRead", null);
__decorate([
    (0, common_1.Post)('webhook/test'),
    (0, public_decorator_1.Public)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "testWebhook", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], NotificationsController);
