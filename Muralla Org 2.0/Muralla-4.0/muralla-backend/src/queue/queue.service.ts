import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('tasks') private taskQueue: Queue,
    @InjectQueue('notifications') private notificationQueue: Queue,
    @InjectQueue('emails') private emailQueue: Queue,
  ) {}

  // Task-related jobs
  async addTaskReminderJob(taskId: string, dueDate: Date) {
    const delay = dueDate.getTime() - Date.now() - (24 * 60 * 60 * 1000); // 1 day before due
    if (delay > 0) {
      await this.taskQueue.add('task-reminder', { taskId }, { delay });
    }
  }

  async addTaskOverdueJob(taskId: string, dueDate: Date) {
    const delay = dueDate.getTime() - Date.now();
    if (delay > 0) {
      await this.taskQueue.add('task-overdue', { taskId }, { delay });
    }
  }

  // Notification jobs
  async addNotificationJob(userId: string, message: string, type: string) {
    await this.notificationQueue.add('send-notification', {
      userId,
      message,
      type,
    });
  }

  async addBulkNotificationJob(userIds: string[], message: string, type: string) {
    await this.notificationQueue.add('bulk-notification', {
      userIds,
      message,
      type,
    });
  }

  // Email jobs
  async addEmailJob(to: string, subject: string, template: string, data: any) {
    await this.emailQueue.add('send-email', {
      to,
      subject,
      template,
      data,
    });
  }

  async addWelcomeEmailJob(userEmail: string, userName: string) {
    await this.emailQueue.add('welcome-email', {
      email: userEmail,
      name: userName,
    });
  }

  // Recurring jobs
  async addDailyReportJob() {
    await this.taskQueue.add(
      'daily-report',
      {},
      {
        repeat: { cron: '0 9 * * *' }, // 9 AM daily
      },
    );
  }

  async addWeeklyBackupJob() {
    await this.taskQueue.add(
      'weekly-backup',
      {},
      {
        repeat: { cron: '0 2 * * 0' }, // 2 AM every Sunday
      },
    );
  }

  // Queue management
  async getQueueStats(queueName: string) {
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

  private getQueue(name: string): Queue {
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
}
