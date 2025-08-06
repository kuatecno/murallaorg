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
exports.NotificationProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const websocket_gateway_1 = require("../../websocket/websocket.gateway");
// @Processor('notifications') // disabled duplicate
let NotificationProcessor = class NotificationProcessor {
    constructor(websocketGateway) {
        this.websocketGateway = websocketGateway;
    }
    // @Process('send-notification') // disabled duplicate
    async handleSendNotification(job) {
        const { userId, message, type } = job.data;
        console.log(`Sending notification to user ${userId}: ${message}`);
        // Send real-time notification via WebSocket
        this.websocketGateway.broadcastToUser(userId, 'notification', {
            message,
            type,
            timestamp: new Date().toISOString(),
        });
        return { processed: true, userId, type };
    }
    async handleBulkNotification(job) {
        const { userIds, message, type } = job.data;
        console.log(`Sending bulk notification to ${userIds.length} users: ${message}`);
        // Send to each user via WebSocket
        for (const userId of userIds) {
            this.websocketGateway.broadcastToUser(userId, 'notification', {
                message,
                type,
                timestamp: new Date().toISOString(),
            });
        }
        return { processed: true, userCount: userIds.length, type };
    }
};
exports.NotificationProcessor = NotificationProcessor;
__decorate([
    (0, bull_1.Process)('bulk-notification'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationProcessor.prototype, "handleBulkNotification", null);
exports.NotificationProcessor = NotificationProcessor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [websocket_gateway_1.WebsocketGateway])
], NotificationProcessor);
