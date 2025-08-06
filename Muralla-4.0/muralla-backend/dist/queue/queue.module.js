"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueModule = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const queue_service_1 = require("./queue.service");
const task_processor_1 = require("./processors/task.processor");
const notification_processor_1 = require("./processors/notification.processor");
const websocket_module_1 = require("../websocket/websocket.module");
let QueueModule = class QueueModule {
};
exports.QueueModule = QueueModule;
exports.QueueModule = QueueModule = __decorate([
    (0, common_1.Module)({
        imports: [
            websocket_module_1.WebsocketModule,
            bull_1.BullModule.forRoot({
                redis: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                },
            }),
            bull_1.BullModule.registerQueue({ name: 'tasks' }, { name: 'notifications' }, { name: 'emails' }),
        ],
        providers: [queue_service_1.QueueService, task_processor_1.TaskProcessor, notification_processor_1.NotificationProcessor],
        exports: [queue_service_1.QueueService, bull_1.BullModule],
    })
], QueueModule);
