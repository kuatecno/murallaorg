import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { WebsocketGateway } from '../../websocket/websocket.gateway';

// @Processor('notifications') // disabled duplicate
@Injectable()
export class NotificationProcessor {
  constructor(private websocketGateway: WebsocketGateway) {}

  // @Process('send-notification') // disabled duplicate
  async handleSendNotification(job: Job) {
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

  @Process('bulk-notification')
  async handleBulkNotification(job: Job) {
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
}
