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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../common/audit.service");
const client_1 = require("@prisma/client");
let NotificationsService = class NotificationsService {
    constructor(prisma, auditService, notificationQueue) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.notificationQueue = notificationQueue;
    }
    // Template Management
    async createTemplate(data, userId) {
        var _a;
        const template = await this.prisma.notificationTemplate.create({
            data: {
                name: data.name,
                type: data.type,
                subject: data.subject,
                content: data.content,
                variables: data.variables || {},
                isActive: (_a = data.isActive) !== null && _a !== void 0 ? _a : true,
                createdBy: userId,
                tenantId: data.tenantId,
            },
            include: {
                creator: { select: { id: true, firstName: true, lastName: true, email: true } },
                _count: { select: { rules: true, notifications: true } },
            },
        });
        await this.auditService.logAuditTrail({
            tableName: 'NotificationTemplate',
            recordId: template.id,
            operation: 'CREATE',
            afterData: template,
            userId: userId,
        });
        return template;
    }
    async getTemplates(query) {
        const where = {};
        if (query.type) {
            where.type = query.type;
        }
        if (query.userId) {
            where.createdBy = query.userId;
        }
        const templates = await this.prisma.notificationTemplate.findMany({
            where,
            include: {
                creator: { select: { id: true, firstName: true, lastName: true, email: true } },
                _count: { select: { rules: true, notifications: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: query.first || 20,
            skip: query.after ? 1 : 0,
            cursor: query.after ? { id: query.after } : undefined,
        });
        return templates;
    }
    async getTemplate(id) {
        const template = await this.prisma.notificationTemplate.findUnique({
            where: { id },
            include: {
                creator: { select: { id: true, firstName: true, lastName: true, email: true } },
                rules: true,
                _count: { select: { rules: true, notifications: true } },
            },
        });
        if (!template) {
            throw new common_1.NotFoundException('Notification template not found');
        }
        return template;
    }
    async updateTemplate(id, data, userId) {
        const existingTemplate = await this.getTemplate(id);
        const updatedTemplate = await this.prisma.notificationTemplate.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.type && { type: data.type }),
                ...(data.subject !== undefined && { subject: data.subject }),
                ...(data.content && { content: data.content }),
                ...(data.variables && { variables: data.variables }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
            include: {
                creator: { select: { id: true, firstName: true, lastName: true, email: true } },
                _count: { select: { rules: true, notifications: true } },
            },
        });
        await this.auditService.logAuditTrail({
            tableName: 'NotificationTemplate',
            recordId: id,
            operation: 'UPDATE',
            beforeData: existingTemplate,
            afterData: updatedTemplate,
            userId: userId,
        });
        return updatedTemplate;
    }
    async deleteTemplate(id, userId) {
        const template = await this.getTemplate(id);
        await this.prisma.notificationTemplate.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });
        await this.auditService.logAuditTrail({
            tableName: 'NotificationTemplate',
            recordId: id,
            operation: 'DELETE',
            beforeData: template,
            userId: userId,
        });
        return { message: 'Notification template deleted successfully' };
    }
    // Rule Management
    async createRule(data, userId) {
        var _a;
        const template = await this.getTemplate(data.templateId);
        const rule = await this.prisma.notificationRule.create({
            data: {
                name: data.name,
                templateId: data.templateId,
                trigger: data.trigger,
                conditions: data.conditions,
                recipients: data.recipients,
                isActive: (_a = data.isActive) !== null && _a !== void 0 ? _a : true,
                createdBy: userId,
                tenantId: data.tenantId,
            },
            include: {
                template: true,
                creator: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
        });
        await this.auditService.logAuditTrail({
            tableName: 'NotificationRule',
            recordId: rule.id,
            operation: 'CREATE',
            afterData: rule,
            userId: userId,
        });
        return rule;
    }
    async getRules(query) {
        const where = {};
        if (query.userId) {
            where.createdBy = query.userId;
        }
        const rules = await this.prisma.notificationRule.findMany({
            where,
            include: {
                template: true,
                creator: { select: { id: true, firstName: true, lastName: true, email: true } },
                _count: { select: { notifications: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: query.first || 20,
            skip: query.after ? 1 : 0,
            cursor: query.after ? { id: query.after } : undefined,
        });
        return rules;
    }
    async getRule(id) {
        const rule = await this.prisma.notificationRule.findUnique({
            where: { id },
            include: {
                template: true,
                creator: { select: { id: true, firstName: true, lastName: true, email: true } },
                _count: { select: { notifications: true } },
            },
        });
        if (!rule) {
            throw new common_1.NotFoundException('Notification rule not found');
        }
        return rule;
    }
    async updateRule(id, data, userId) {
        const existingRule = await this.getRule(id);
        if (data.templateId) {
            await this.getTemplate(data.templateId);
        }
        const updatedRule = await this.prisma.notificationRule.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.templateId && { templateId: data.templateId }),
                ...(data.trigger && { trigger: data.trigger }),
                ...(data.conditions && { conditions: data.conditions }),
                ...(data.recipients && { recipients: data.recipients }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
            include: {
                template: true,
                creator: { select: { id: true, firstName: true, lastName: true, email: true } },
                _count: { select: { notifications: true } },
            },
        });
        await this.auditService.logAuditTrail({
            tableName: 'NotificationRule',
            recordId: id,
            operation: 'UPDATE',
            beforeData: existingRule,
            afterData: updatedRule,
            userId: userId,
        });
        return updatedRule;
    }
    // Direct Notification Sending
    async sendNotification(data, userId) {
        var _a;
        const template = await this.getTemplate(data.templateId);
        const notifications = [];
        for (const recipientId of data.recipientIds) {
            const notification = await this.prisma.notification.create({
                data: {
                    templateId: data.templateId,
                    recipientId,
                    status: client_1.NotificationStatus.PENDING,
                    // createdBy: userId, // Removed - not in Prisma schema
                    tenantId: data.tenantId,
                },
                include: {
                    template: true,
                    recipient: { select: { id: true, firstName: true, lastName: true, email: true } },
                },
            });
            // Add to queue for processing
            await this.notificationQueue.add('send-notification', {
                notificationId: notification.id,
                templateId: template.id,
                recipientId,
                type: template.type,
                subject: template.subject,
                content: template.content,
                variables: data.variables || {},
            });
            notifications.push(notification);
        }
        await this.auditService.logAuditTrail({
            tableName: 'Notification',
            recordId: ((_a = notifications[0]) === null || _a === void 0 ? void 0 : _a.id) || 'batch',
            operation: 'CREATE',
            afterData: { count: notifications.length, recipientIds: data.recipientIds },
            userId: userId,
        });
        return notifications;
    }
    // Rule Processing
    async processRules(trigger, entityData, userId) {
        const rules = await this.prisma.notificationRule.findMany({
            where: {
                trigger,
                isActive: true,
            },
            include: {
                template: true,
            },
        });
        const processedRules = [];
        for (const rule of rules) {
            try {
                // Evaluate rule conditions
                const conditions = rule.conditions;
                if (await this.evaluateConditions(conditions, entityData)) {
                    // Get recipients based on rule
                    const recipientRules = rule.recipients;
                    const recipients = await this.resolveRecipients(recipientRules, entityData, userId);
                    // Create notifications for each recipient
                    for (const recipientId of recipients) {
                        const notification = await this.prisma.notification.create({
                            data: {
                                templateId: rule.templateId,
                                recipientId,
                                ruleId: rule.id,
                                status: client_1.NotificationStatus.PENDING,
                                // createdBy: userId, // Removed - not in Prisma schema
                            },
                            include: {
                                template: true,
                                recipient: { select: { id: true, firstName: true, lastName: true, email: true } },
                            },
                        });
                        // Add to queue for processing
                        await this.notificationQueue.add('send-notification', {
                            notificationId: notification.id,
                            templateId: rule.template.id,
                            recipientId,
                            type: rule.template.type,
                            subject: rule.template.subject,
                            content: rule.template.content,
                            variables: entityData,
                        });
                    }
                    processedRules.push({
                        ruleId: rule.id,
                        ruleName: rule.name,
                        recipientCount: recipients.length,
                    });
                }
            }
            catch (error) {
                console.error(`Error processing rule ${rule.id}:`, error);
            }
        }
        return processedRules;
    }
    // Get User Notifications
    async getUserNotifications(userId, query) {
        const where = { recipientId: userId };
        if (query.status === 'unread') {
            where.readAt = null;
        }
        else if (query.status === 'read') {
            where.readAt = { not: null };
        }
        if (query.type) {
            where.template = { type: query.type };
        }
        if (query.contextType) {
            where.contextType = query.contextType;
        }
        if (query.contextId) {
            where.contextId = query.contextId;
        }
        const notifications = await this.prisma.notification.findMany({
            where,
            include: {
                template: true,
                rule: true,
            },
            orderBy: { createdAt: 'desc' },
            take: query.first || 20,
            skip: query.after ? 1 : 0,
            cursor: query.after ? { id: query.after } : undefined,
        });
        return notifications;
    }
    // Mark Notification as Read
    async markAsRead(notificationId, userId) {
        const notification = await this.prisma.notification.findFirst({
            where: {
                id: notificationId,
                recipientId: userId,
            },
        });
        if (!notification) {
            throw new common_1.NotFoundException('Notification not found');
        }
        const updatedNotification = await this.prisma.notification.update({
            where: { id: notificationId },
            data: { readAt: new Date() },
            include: {
                template: true,
                rule: true,
            },
        });
        return updatedNotification;
    }
    // Helper Methods
    async evaluateConditions(conditions, entityData) {
        if (!conditions || conditions.length === 0)
            return true;
        for (const condition of conditions) {
            const fieldValue = this.getNestedValue(entityData, condition.field);
            switch (condition.operator) {
                case 'equals':
                    if (fieldValue !== condition.value)
                        return false;
                    break;
                case 'not_equals':
                    if (fieldValue === condition.value)
                        return false;
                    break;
                case 'contains':
                    if (!String(fieldValue).includes(String(condition.value)))
                        return false;
                    break;
                case 'greater_than':
                    if (Number(fieldValue) <= Number(condition.value))
                        return false;
                    break;
                case 'less_than':
                    if (Number(fieldValue) >= Number(condition.value))
                        return false;
                    break;
                default:
                    return false;
            }
        }
        return true;
    }
    async resolveRecipients(recipientRules, entityData, userId) {
        const recipients = new Set();
        for (const rule of recipientRules) {
            switch (rule.type) {
                case 'user':
                    if (rule.value)
                        recipients.add(rule.value);
                    break;
                case 'role':
                    if (rule.value) {
                        const users = await this.prisma.user.findMany({
                            where: { roleId: rule.value },
                            select: { id: true },
                        });
                        users.forEach(user => recipients.add(user.id));
                    }
                    break;
                case 'creator':
                    if (entityData.createdBy)
                        recipients.add(entityData.createdBy);
                    break;
                case 'assignee':
                    if (entityData.assigneeId)
                        recipients.add(entityData.assigneeId);
                    break;
                case 'all':
                    const allUsers = await this.prisma.user.findMany({
                        select: { id: true },
                    });
                    allUsers.forEach(user => recipients.add(user.id));
                    break;
            }
        }
        return Array.from(recipients);
    }
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current === null || current === void 0 ? void 0 : current[key], obj);
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bull_1.InjectQueue)('notifications')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService, Object])
], NotificationsService);
