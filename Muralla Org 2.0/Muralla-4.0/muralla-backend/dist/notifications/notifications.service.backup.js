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
    // ==================== TEMPLATES ====================
    /**
     * Create a new notification template
     */
    async createTemplate(createTemplateDto, userId) {
        const { name, description, type, subject, content, variables } = createTemplateDto;
        // Check if template name already exists
        const existingTemplate = await this.prisma.notificationTemplate.findUnique({
            where: { name },
        });
        if (existingTemplate) {
            throw new common_1.BadRequestException(`Template with name '${name}' already exists`);
        }
        const template = await this.prisma.notificationTemplate.create({
            data: {
                name,
                description,
                type: type,
                subject,
                content,
                variables: variables,
                createdBy: userId,
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
    /**
     * Get all notification templates
     */
    async getTemplates(query = {}) {
        const { page = 1, limit = 20, type, isActive } = query;
        const skip = (page - 1) * limit;
        const where = {
            isDeleted: false,
            ...(type && { type: type }),
            ...(isActive !== undefined && { isActive }),
        };
        const [templates, total] = await Promise.all([
            this.prisma.notificationTemplate.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    creator: { select: { id: true, firstName: true, lastName: true, email: true } },
                    _count: { select: { rules: true, notifications: true } },
                },
            }),
            this.prisma.notificationTemplate.count({ where }),
        ]);
        return {
            templates,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Get template by ID
     */
    async getTemplate(id) {
        const template = await this.prisma.notificationTemplate.findUnique({
            where: { id, isDeleted: false },
            include: {
                creator: { select: { id: true, firstName: true, lastName: true, email: true } },
                rules: {
                    where: { isDeleted: false },
                    select: { id: true, name: true, trigger: true, isActive: true },
                },
                _count: { select: { notifications: true } },
            },
        });
        if (!template) {
            throw new common_1.NotFoundException('Notification template not found');
        }
        return template;
    }
    /**
     * Update notification template
     */
    async updateTemplate(id, updateTemplateDto, userId) {
        const existingTemplate = await this.prisma.notificationTemplate.findUnique({
            where: { id, isDeleted: false },
        });
        if (!existingTemplate) {
            throw new common_1.NotFoundException('Notification template not found');
        }
        const { name, description, type, subject, content, variables, isActive } = updateTemplateDto;
        // Check if new name conflicts with existing template
        if (name && name !== existingTemplate.name) {
            const nameExists = await this.prisma.notificationTemplate.findFirst({
                where: { name, id: { not: id }, isDeleted: false },
            });
            if (nameExists) {
                throw new common_1.BadRequestException(`Template with name '${name}' already exists`);
            }
        }
        const updatedTemplate = await this.prisma.notificationTemplate.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(type && { type: type }),
                ...(subject !== undefined && { subject }),
                ...(content && { content }),
                ...(variables && { variables: variables }),
                ...(isActive !== undefined && { isActive }),
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
    /**
     * Delete notification template
     */
    async deleteTemplate(id, userId) {
        const template = await this.prisma.notificationTemplate.findUnique({
            where: { id, isDeleted: false },
        });
        if (!template) {
            throw new common_1.NotFoundException('Notification template not found');
        }
        await this.prisma.notificationTemplate.update({
            where: { id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: userId,
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
    // ==================== RULES ====================
    /**
     * Create a new notification rule
     */
    async createRule(createRuleDto, userId) {
        const { name, description, trigger, conditions, templateId, recipients, delay } = createRuleDto;
        // Validate template exists
        const template = await this.prisma.notificationTemplate.findUnique({
            where: { id: templateId, isDeleted: false },
        });
        if (!template) {
            throw new common_1.NotFoundException('Notification template not found');
        }
        const rule = await this.prisma.notificationRule.create({
            data: {
                name,
                description,
                trigger: trigger,
                conditions: conditions,
                templateId,
                recipients: recipients,
                delay,
                createdBy: userId,
            },
            include: {
                template: { select: { id: true, name: true, type: true } },
                creator: { select: { id: true, firstName: true, lastName: true, email: true } },
                _count: { select: { notifications: true } },
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
    /**
     * Get all notification rules
     */
    async getRules(query = {}) {
        const { page = 1, limit = 20, trigger, isActive } = query;
        const skip = (page - 1) * limit;
        const where = {
            isDeleted: false,
            ...(trigger && { trigger: trigger }),
            ...(isActive !== undefined && { isActive }),
        };
        const [rules, total] = await Promise.all([
            this.prisma.notificationRule.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    template: { select: { id: true, name: true, type: true } },
                    creator: { select: { id: true, firstName: true, lastName: true, email: true } },
                    _count: { select: { notifications: true } },
                },
            }),
            this.prisma.notificationRule.count({ where }),
        ]);
        return {
            rules,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Update notification rule
     */
    async updateRule(id, updateRuleDto, userId) {
        const existingRule = await this.prisma.notificationRule.findUnique({
            where: { id, isDeleted: false },
        });
        if (!existingRule) {
            throw new common_1.NotFoundException('Notification rule not found');
        }
        const { name, description, trigger, conditions, templateId, recipients, delay, isActive } = updateRuleDto;
        // Validate template exists if provided
        if (templateId) {
            const template = await this.prisma.notificationTemplate.findUnique({
                where: { id: templateId, isDeleted: false },
            });
            if (!template) {
                throw new common_1.NotFoundException('Notification template not found');
            }
        }
        const updatedRule = await this.prisma.notificationRule.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(trigger && { trigger: trigger }),
                ...(conditions && { conditions: conditions }),
                ...(templateId && { templateId }),
                ...(recipients && { recipients: recipients }),
                ...(delay !== undefined && { delay }),
                ...(isActive !== undefined && { isActive }),
            },
            include: {
                template: { select: { id: true, name: true, type: true } },
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
    // ==================== NOTIFICATIONS ====================
    /**
     * Send a direct notification
     */
    async sendNotification(sendNotificationDto, userId) {
        const { type, recipientId, subject, content, templateId, entityType, entityId, metadata, scheduledAt } = sendNotificationDto;
        // Validate recipient exists
        const recipient = await this.prisma.user.findUnique({
            where: { id: recipientId, isDeleted: false },
        });
        if (!recipient) {
            throw new common_1.NotFoundException('Recipient not found');
        }
        // Validate template if provided
        let template = null;
        if (templateId) {
            template = await this.prisma.notificationTemplate.findUnique({
                where: { id: templateId, isDeleted: false },
            });
            if (!template) {
                throw new common_1.NotFoundException('Notification template not found');
            }
        }
        const notification = await this.prisma.notification.create({
            data: {
                type: type,
                subject,
                content,
                recipientId,
                templateId,
                entityType,
                entityId,
                metadata: metadata,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
            },
            include: {
                recipient: { select: { id: true, firstName: true, lastName: true, email: true } },
                template: { select: { id: true, name: true } },
            },
        });
        // Queue the notification for processing
        await this.queueNotification(notification.id, scheduledAt ? new Date(scheduledAt) : undefined);
        return notification;
    }
    /**
     * Process rule-based notifications
     */
    async processRuleNotifications(context) {
        const { entityType, entityId, entityData, userId, metadata } = context;
        // Find all active rules for this trigger
        const trigger = this.mapEntityTypeToTrigger(entityType);
        if (!trigger)
            return;
        const rules = await this.prisma.notificationRule.findMany({
            where: {
                trigger,
                isActive: true,
                isDeleted: false,
            },
            include: {
                template: true,
            },
        });
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
                        const processedContent = this.processTemplate(rule.template.content, entityData, metadata);
                        const processedSubject = rule.template.subject
                            ? this.processTemplate(rule.template.subject, entityData, metadata)
                            : undefined;
                        const scheduledAt = rule.delay
                            ? new Date(Date.now() + rule.delay * 60 * 1000)
                            : new Date();
                        const notification = await this.prisma.notification.create({
                            data: {
                                type: rule.template.type,
                                subject: processedSubject,
                                content: processedContent,
                                recipientId,
                                templateId: rule.templateId,
                                ruleId: rule.id,
                                entityType,
                                entityId,
                                metadata: metadata,
                                scheduledAt,
                            },
                        });
                        // Queue the notification
                        await this.queueNotification(notification.id, scheduledAt);
                    }
                }
            }
            catch (error) {
                console.error(`Error processing rule ${rule.id}:`, error);
            }
        }
    }
    /**
     * Get notifications for a user
     */
    async getUserNotifications(userId, query = {}) {
        const { page = 1, limit = 20, status, type, unreadOnly } = query;
        const skip = (page - 1) * limit;
        const where = {
            recipientId: userId,
            ...(status && { status: status }),
            ...(type && { type: type }),
            ...(unreadOnly && { readAt: null }),
        };
        const [notifications, total, unreadCount] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    template: { select: { id: true, name: true } },
                    rule: { select: { id: true, name: true } },
                },
            }),
            this.prisma.notification.count({ where }),
            this.prisma.notification.count({
                where: { recipientId: userId, readAt: null }
            }),
        ]);
        return {
            notifications,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
            unreadCount,
        };
    }
    /**
     * Mark notification as read
     */
    async markAsRead(notificationId, userId) {
        const notification = await this.prisma.notification.findFirst({
            where: { id: notificationId, recipientId: userId },
        });
        if (!notification) {
            throw new common_1.NotFoundException('Notification not found');
        }
        return this.prisma.notification.update({
            where: { id: notificationId },
            data: { readAt: new Date() },
        });
    }
    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId) {
        return this.prisma.notification.updateMany({
            where: { recipientId: userId, readAt: null },
            data: { readAt: new Date() },
        });
    }
    // ==================== PRIVATE METHODS ====================
    /**
     * Queue notification for processing
     */
    async queueNotification(notificationId, scheduledAt) {
        const delay = scheduledAt ? scheduledAt.getTime() - Date.now() : 0;
        await this.notificationQueue.add('send-notification', { notificationId }, {
            delay: Math.max(0, delay),
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
        });
    }
    /**
     * Map entity type to rule trigger
     */
    mapEntityTypeToTrigger(entityType) {
        const mapping = {
            'Task': client_1.RuleTrigger.TASK_CREATED,
            'Document': client_1.RuleTrigger.DOCUMENT_CREATED,
            'User': client_1.RuleTrigger.USER_REGISTERED,
            'Project': client_1.RuleTrigger.PROJECT_CREATED,
        };
        return mapping[entityType] || null;
    }
    /**
     * Evaluate rule conditions against entity data
     */
    async evaluateConditions(conditions, entityData) {
        for (const condition of conditions) {
            const fieldValue = this.getNestedValue(entityData, condition.field);
            if (!this.evaluateCondition(fieldValue, condition.operator, condition.value)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Evaluate a single condition
     */
    evaluateCondition(fieldValue, operator, expectedValue) {
        switch (operator) {
            case 'equals':
                return fieldValue === expectedValue;
            case 'contains':
                return String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
            case 'gt':
                return Number(fieldValue) > Number(expectedValue);
            case 'lt':
                return Number(fieldValue) < Number(expectedValue);
            case 'gte':
                return Number(fieldValue) >= Number(expectedValue);
            case 'lte':
                return Number(fieldValue) <= Number(expectedValue);
            case 'in':
                return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
            case 'not_in':
                return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue);
            default:
                return false;
        }
    }
    /**
     * Get nested object value by path
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current === null || current === void 0 ? void 0 : current[key], obj);
    }
    /**
     * Resolve recipients based on recipient rules
     */
    async resolveRecipients(recipientRules, entityData, userId) {
        const recipients = new Set();
        for (const rule of recipientRules) {
            switch (rule.type) {
                case 'user':
                    if (rule.value) {
                        recipients.add(rule.value);
                    }
                    break;
                case 'role':
                    if (rule.value) {
                        const users = await this.prisma.user.findMany({
                            where: {
                                role: { name: rule.value },
                                isDeleted: false,
                                isActive: true,
                            },
                            select: { id: true },
                        });
                        users.forEach(user => recipients.add(user.id));
                    }
                    break;
                case 'creator':
                    if (entityData.createdBy || entityData.authorId) {
                        recipients.add(entityData.createdBy || entityData.authorId);
                    }
                    break;
                case 'assignee':
                    if (entityData.assigneeId) {
                        recipients.add(entityData.assigneeId);
                    }
                    break;
                case 'all':
                    const allUsers = await this.prisma.user.findMany({
                        where: { isDeleted: false, isActive: true },
                        select: { id: true },
                    });
                    allUsers.forEach(user => recipients.add(user.id));
                    break;
            }
        }
        return Array.from(recipients);
    }
    /**
     * Process template with variable substitution
     */
    processTemplate(template, entityData, metadata) {
        let processed = template;
        // Replace entity data variables
        processed = processed.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
            const value = this.getNestedValue(entityData, path);
            return value !== undefined ? String(value) : match;
        });
        // Replace metadata variables
        if (metadata) {
            processed = processed.replace(/\{\{meta\.(\w+)\}\}/g, (match, key) => {
                const value = metadata[key];
                return value !== undefined ? String(value) : match;
            });
        }
        return processed;
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bull_1.InjectQueue)('notifications')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService, Object])
], NotificationsService);
