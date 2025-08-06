import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import {
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  CreateNotificationRuleDto,
  UpdateNotificationRuleDto,
  SendNotificationDto,
  NotificationQueryDto,
} from '@muralla/common';
import { NotificationType, NotificationStatus, RuleTrigger } from '@prisma/client';

interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

interface RecipientRule {
  type: 'user' | 'role' | 'creator' | 'assignee' | 'all';
  value?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    @InjectQueue('notifications') private notificationQueue: Queue,
  ) {}

  // Template Management
  async createTemplate(data: CreateNotificationTemplateDto, userId: string) {
    const template = await this.prisma.notificationTemplate.create({
      data: {
        name: data.name,
        type: data.type as NotificationType,
        subject: data.subject,
        content: data.content,
        variables: data.variables as any || {},
        isActive: data.isActive ?? true,
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
      operation: 'CREATE' as any,
      afterData: template,
      userId: userId,
    });

    return template;
  }

  async getTemplates(query: NotificationQueryDto) {
    const where: any = {};
    
    if (query.type) {
      where.type = query.type as NotificationType;
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

  async getTemplate(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        rules: true,
        _count: { select: { rules: true, notifications: true } },
      },
    });

    if (!template) {
      throw new NotFoundException('Notification template not found');
    }

    return template;
  }

  async updateTemplate(id: string, data: UpdateNotificationTemplateDto, userId: string) {
    const existingTemplate = await this.getTemplate(id);

    const updatedTemplate = await this.prisma.notificationTemplate.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type as NotificationType }),
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.content && { content: data.content }),
        ...(data.variables && { variables: data.variables as any }),
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
      operation: 'UPDATE' as any,
      beforeData: existingTemplate,
      afterData: updatedTemplate,
      userId: userId,
    });

    return updatedTemplate;
  }

  async deleteTemplate(id: string, userId: string) {
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
      operation: 'DELETE' as any,
      beforeData: template,
      userId: userId,
    });

    return { message: 'Notification template deleted successfully' };
  }

  // Rule Management
  async createRule(data: CreateNotificationRuleDto, userId: string) {
    const template = await this.getTemplate(data.templateId);

    const rule = await this.prisma.notificationRule.create({
      data: {
        name: data.name,
        templateId: data.templateId,
        trigger: data.trigger as RuleTrigger,
        conditions: data.conditions as any,
        recipients: data.recipients as any,
        isActive: data.isActive ?? true,
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
      operation: 'CREATE' as any,
      afterData: rule,
      userId: userId,
    });

    return rule;
  }

  async getRules(query: NotificationQueryDto) {
    const where: any = {};
    
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

  async getRule(id: string) {
    const rule = await this.prisma.notificationRule.findUnique({
      where: { id },
      include: {
        template: true,
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { notifications: true } },
      },
    });

    if (!rule) {
      throw new NotFoundException('Notification rule not found');
    }

    return rule;
  }

  async updateRule(id: string, data: UpdateNotificationRuleDto, userId: string) {
    const existingRule = await this.getRule(id);

    if (data.templateId) {
      await this.getTemplate(data.templateId);
    }

    const updatedRule = await this.prisma.notificationRule.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.templateId && { templateId: data.templateId }),
        ...(data.trigger && { trigger: data.trigger as RuleTrigger }),
        ...(data.conditions && { conditions: data.conditions as any }),
        ...(data.recipients && { recipients: data.recipients as any }),
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
      operation: 'UPDATE' as any,
      beforeData: existingRule,
      afterData: updatedRule,
      userId: userId,
    });

    return updatedRule;
  }

  // Direct Notification Sending
  async sendNotification(data: SendNotificationDto, userId: string) {
    const template = await this.getTemplate(data.templateId);

    const notifications = [];
    for (const recipientId of data.recipientIds) {
      const notification = await this.prisma.notification.create({
        data: {
          templateId: data.templateId,
          recipientId,
          status: NotificationStatus.PENDING,



          // createdBy: userId, // Removed - not in Prisma schema
          tenantId: data.tenantId,
        } as any,
        include: {
          template: true,
          recipient: { select: { id: true, firstName: true, lastName: true, email: true } },
        } as any,
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
      recordId: notifications[0]?.id || 'batch',
      operation: 'CREATE' as any,
      afterData: { count: notifications.length, recipientIds: data.recipientIds },
      userId: userId,
    });

    return notifications;
  }

  // Rule Processing
  async processRules(trigger: RuleTrigger, entityData: any, userId: string) {
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
        const conditions = rule.conditions as unknown as RuleCondition[];
        if (await this.evaluateConditions(conditions, entityData)) {
          // Get recipients based on rule
          const recipientRules = rule.recipients as unknown as RecipientRule[];
          const recipients = await this.resolveRecipients(recipientRules, entityData, userId);

          // Create notifications for each recipient
          for (const recipientId of recipients) {
            const notification = await this.prisma.notification.create({
              data: {
                templateId: rule.templateId,
                recipientId,
                ruleId: rule.id,
                status: NotificationStatus.PENDING,



                // createdBy: userId, // Removed - not in Prisma schema
              } as any,
              include: {
                template: true,
                recipient: { select: { id: true, firstName: true, lastName: true, email: true } },
              } as any,
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
      } catch (error) {
        console.error(`Error processing rule ${rule.id}:`, error);
      }
    }

    return processedRules;
  }

  // Get User Notifications
  async getUserNotifications(userId: string, query: NotificationQueryDto) {
    const where: any = { recipientId: userId };
    
    if (query.status === 'unread') {
      where.readAt = null;
    } else if (query.status === 'read') {
      where.readAt = { not: null };
    }

    if (query.type) {
      where.template = { type: query.type as NotificationType };
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
  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientId: userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
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
  private async evaluateConditions(conditions: RuleCondition[], entityData: any): Promise<boolean> {
    if (!conditions || conditions.length === 0) return true;

    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(entityData, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          if (fieldValue !== condition.value) return false;
          break;
        case 'not_equals':
          if (fieldValue === condition.value) return false;
          break;
        case 'contains':
          if (!String(fieldValue).includes(String(condition.value))) return false;
          break;
        case 'greater_than':
          if (Number(fieldValue) <= Number(condition.value)) return false;
          break;
        case 'less_than':
          if (Number(fieldValue) >= Number(condition.value)) return false;
          break;
        default:
          return false;
      }
    }

    return true;
  }

  private async resolveRecipients(recipientRules: RecipientRule[], entityData: any, userId: string): Promise<string[]> {
    const recipients = new Set<string>();

    for (const rule of recipientRules) {
      switch (rule.type) {
        case 'user':
          if (rule.value) recipients.add(rule.value);
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
          if (entityData.createdBy) recipients.add(entityData.createdBy);
          break;
        case 'assignee':
          if (entityData.assigneeId) recipients.add(entityData.assigneeId);
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

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
