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
exports.QueueService = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
let QueueService = class QueueService {
    constructor(taskQueue, notificationQueue, emailQueue) {
        this.taskQueue = taskQueue;
        this.notificationQueue = notificationQueue;
        this.emailQueue = emailQueue;
    }
    // Task-related jobs
    async addTaskReminderJob(taskId, dueDate) {
        const delay = dueDate.getTime() - Date.now() - (24 * 60 * 60 * 1000); // 1 day before due
        if (delay > 0) {
            await this.taskQueue.add('task-reminder', { taskId }, { delay });
        }
    }
    async addTaskOverdueJob(taskId, dueDate) {
        const delay = dueDate.getTime() - Date.now();
        if (delay > 0) {
            await this.taskQueue.add('task-overdue', { taskId }, { delay });
        }
    }
    // Notification jobs
    async addNotificationJob(userId, message, type) {
        await this.notificationQueue.add('send-notification', {
            userId,
            message,
            type,
        });
    }
    async addBulkNotificationJob(userIds, message, type) {
        await this.notificationQueue.add('bulk-notification', {
            userIds,
            message,
            type,
        });
    }
    // Email jobs
    async addEmailJob(to, subject, template, data) {
        await this.emailQueue.add('send-email', {
            to,
            subject,
            template,
            data,
        });
    }
    async addWelcomeEmailJob(userEmail, userName) {
        await this.emailQueue.add('welcome-email', {
            email: userEmail,
            name: userName,
        });
    }
    // Recurring jobs
    async addDailyReportJob() {
        await this.taskQueue.add('daily-report', {}, {
            repeat: { cron: '0 9 * * *' }, // 9 AM daily
        });
    }
    async addWeeklyBackupJob() {
        await this.taskQueue.add('weekly-backup', {}, {
            repeat: { cron: '0 2 * * 0' }, // 2 AM every Sunday
        });
    }
    // Queue management
    async getQueueStats(queueName) {
        const queue = this.getQueue(queueName);
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();
        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
        };
    }
    getQueue(name) {
        switch (name) {
            case 'tasks':
                return this.taskQueue;
            case 'notifications':
                return this.notificationQueue;
            case 'emails':
                return this.emailQueue;
            default:
                throw new Error(`Unknown queue: ${name}`);
        }
    }
};
exports.QueueService = QueueService;
exports.QueueService = QueueService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bull_1.InjectQueue)('tasks')),
    __param(1, (0, bull_1.InjectQueue)('notifications')),
    __param(2, (0, bull_1.InjectQueue)('emails')),
    __metadata("design:paramtypes", [Object, Object, Object])
], QueueService);
