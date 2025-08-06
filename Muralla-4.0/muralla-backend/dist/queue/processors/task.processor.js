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
exports.TaskProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const websocket_gateway_1 = require("../../websocket/websocket.gateway");
let TaskProcessor = class TaskProcessor {
    constructor(websocketGateway) {
        this.websocketGateway = websocketGateway;
    }
    async handleTaskReminder(job) {
        const { taskId } = job.data;
        console.log(`Processing task reminder for task: ${taskId}`);
        // Send real-time notification via WebSocket
        this.websocketGateway.broadcastToRoom(`task:${taskId}`, 'task-reminder', { taskId, message: 'Task due in 24 hours' });
        return { processed: true, taskId };
    }
    async handleTaskOverdue(job) {
        const { taskId } = job.data;
        console.log(`Processing task overdue for task: ${taskId}`);
        // Send real-time notification via WebSocket
        this.websocketGateway.broadcastToRoom(`task:${taskId}`, 'task-overdue', { taskId, message: 'Task is now overdue' });
        return { processed: true, taskId };
    }
    async handleDailyReport(job) {
        console.log('Processing daily report generation');
        // Generate daily report logic here
        // This could aggregate task completions, overdue tasks, etc.
        return { processed: true, reportDate: new Date().toISOString() };
    }
    async handleWeeklyBackup(job) {
        console.log('Processing weekly backup');
        // Backup logic here
        // This could export data, create snapshots, etc.
        return { processed: true, backupDate: new Date().toISOString() };
    }
};
exports.TaskProcessor = TaskProcessor;
__decorate([
    (0, bull_1.Process)('task-reminder'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TaskProcessor.prototype, "handleTaskReminder", null);
__decorate([
    (0, bull_1.Process)('task-overdue'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TaskProcessor.prototype, "handleTaskOverdue", null);
__decorate([
    (0, bull_1.Process)('daily-report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TaskProcessor.prototype, "handleDailyReport", null);
__decorate([
    (0, bull_1.Process)('weekly-backup'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TaskProcessor.prototype, "handleWeeklyBackup", null);
exports.TaskProcessor = TaskProcessor = __decorate([
    (0, bull_1.Processor)('tasks'),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [websocket_gateway_1.WebsocketGateway])
], TaskProcessor);
