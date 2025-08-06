"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const nodemailer = __importStar(require("nodemailer"));
let NotificationProcessor = NotificationProcessor_1 = class NotificationProcessor {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(NotificationProcessor_1.name);
        // Initialize email transporter
        this.emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    async handleSendNotification(job) {
        const { notificationId } = job.data;
        try {
            // Get notification details
            const notification = await this.prisma.notification.findUnique({
                where: { id: notificationId },
                include: {
                    recipient: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                    template: {
                        select: { id: true, name: true, type: true },
                    },
                },
            });
            if (!notification) {
                throw new Error(`Notification ${notificationId} not found`);
            }
            if (notification.status !== client_1.NotificationStatus.PENDING) {
                this.logger.warn(`Notification ${notificationId} is not pending, skipping`);
                return;
            }
            // Process based on notification type
            switch (notification.type) {
                case client_1.NotificationType.EMAIL:
                    await this.sendEmailNotification(notification);
                    break;
                case client_1.NotificationType.IN_APP:
                    await this.sendInAppNotification(notification);
                    break;
                case client_1.NotificationType.PUSH:
                    await this.sendPushNotification(notification);
                    break;
                case client_1.NotificationType.SMS:
                    await this.sendSMSNotification(notification);
                    break;
                default:
                    throw new Error(`Unsupported notification type: ${notification.type}`);
            }
            // Mark as sent
            await this.prisma.notification.update({
                where: { id: notificationId },
                data: {
                    status: client_1.NotificationStatus.SENT,
                    sentAt: new Date(),
                },
            });
            this.logger.log(`Successfully sent notification ${notificationId}`);
        }
        catch (error) {
            console.error('Failed to send notification:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to send notification: ${errorMessage}`);
            // Mark as failed
            await this.prisma.notification.update({
                where: { id: notificationId },
                data: {
                    status: client_1.NotificationStatus.FAILED,
                    failedAt: new Date(),
                    errorMessage: error instanceof Error ? error.message : String(error),
                },
            });
            throw error;
        }
    }
    /**
     * Send email notification
     */
    async sendEmailNotification(notification) {
        if (!notification.recipient.email) {
            throw new Error('Recipient email not found');
        }
        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@muralla.org',
            to: notification.recipient.email,
            subject: notification.subject || 'Notification from Muralla',
            html: this.formatEmailContent(notification),
            text: this.stripHtml(notification.content),
        };
        await this.emailTransporter.sendMail(mailOptions);
        this.logger.log(`Email sent to ${notification.recipient.email}`);
    }
    /**
     * Send in-app notification (already stored in database)
     */
    async sendInAppNotification(notification) {
        // In-app notifications are already stored in the database
        // We could emit a WebSocket event here for real-time updates
        this.logger.log(`In-app notification ready for ${notification.recipient.id}`);
    }
    /**
     * Send push notification
     */
    async sendPushNotification(notification) {
        // Implement push notification logic here
        // This could integrate with services like Firebase Cloud Messaging, Apple Push Notifications, etc.
        this.logger.log(`Push notification would be sent to ${notification.recipient.id}`);
        // Placeholder implementation
        // In a real implementation, you would:
        // 1. Get user's push notification tokens from database
        // 2. Send to push notification service (FCM, APNS, etc.)
        // 3. Handle delivery receipts and failures
    }
    /**
     * Send SMS notification
     */
    async sendSMSNotification(notification) {
        // Implement SMS logic here
        // This could integrate with services like Twilio, AWS SNS, etc.
        this.logger.log(`SMS notification would be sent to ${notification.recipient.id}`);
        // Placeholder implementation
        // In a real implementation, you would:
        // 1. Get user's phone number from database
        // 2. Send via SMS service (Twilio, AWS SNS, etc.)
        // 3. Handle delivery receipts and failures
    }
    /**
     * Format email content with HTML template
     */
    formatEmailContent(notification) {
        const recipientName = `${notification.recipient.firstName} ${notification.recipient.lastName}`.trim();
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.subject || 'Notification'}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background: white;
            padding: 30px 20px;
            border: 1px solid #e1e5e9;
            border-top: none;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #6c757d;
            border: 1px solid #e1e5e9;
            border-top: none;
            border-radius: 0 0 8px 8px;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .metadata {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Muralla Notification</h1>
        </div>
        <div class="content">
          <p>Hello ${recipientName},</p>
          <div>
            ${this.formatContentAsHtml(notification.content)}
          </div>
          ${notification.entityType ? `
            <div class="metadata">
              <strong>Related to:</strong> ${notification.entityType}
              ${notification.entityId ? `<br><strong>ID:</strong> ${notification.entityId}` : ''}
            </div>
          ` : ''}
          <p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/notifications" class="button">
              View in App
            </a>
          </p>
        </div>
        <div class="footer">
          <p>This notification was sent by Muralla Org Management System.</p>
          <p>If you no longer wish to receive these notifications, you can update your preferences in the app.</p>
        </div>
      </body>
      </html>
    `;
    }
    /**
     * Format content as HTML (basic markdown-like formatting)
     */
    formatContentAsHtml(content) {
        return content
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }
    /**
     * Strip HTML tags for plain text version
     */
    stripHtml(html) {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
    }
};
exports.NotificationProcessor = NotificationProcessor;
__decorate([
    (0, bull_1.Process)('send-notification'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationProcessor.prototype, "handleSendNotification", null);
exports.NotificationProcessor = NotificationProcessor = NotificationProcessor_1 = __decorate([
    (0, bull_1.Processor)('notifications'),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationProcessor);
