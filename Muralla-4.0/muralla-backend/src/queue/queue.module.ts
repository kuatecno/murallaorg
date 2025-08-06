import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueService } from './queue.service';
import { TaskProcessor } from './processors/task.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    WebsocketModule,
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue(
      { name: 'tasks' },
      { name: 'notifications' },
      { name: 'emails' },
    ),
  ],
  providers: [QueueService, TaskProcessor, NotificationProcessor],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
