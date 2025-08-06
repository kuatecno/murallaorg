import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { WebsocketGateway } from '../../websocket/websocket.gateway';

@Processor('tasks')
@Injectable()
export class TaskProcessor {
  constructor(private websocketGateway: WebsocketGateway) {}

  @Process('task-reminder')
  async handleTaskReminder(job: Job) {
    const { taskId } = job.data;
    console.log(`Processing task reminder for task: ${taskId}`);
    
    // Send real-time notification via WebSocket
    this.websocketGateway.broadcastToRoom(
      `task:${taskId}`,
      'task-reminder',
      { taskId, message: 'Task due in 24 hours' }
    );
    
    return { processed: true, taskId };
  }

  @Process('task-overdue')
  async handleTaskOverdue(job: Job) {
    const { taskId } = job.data;
    console.log(`Processing task overdue for task: ${taskId}`);
    
    // Send real-time notification via WebSocket
    this.websocketGateway.broadcastToRoom(
      `task:${taskId}`,
      'task-overdue',
      { taskId, message: 'Task is now overdue' }
    );
    
    return { processed: true, taskId };
  }

  @Process('daily-report')
  async handleDailyReport(job: Job) {
    console.log('Processing daily report generation');
    
    // Generate daily report logic here
    // This could aggregate task completions, overdue tasks, etc.
    
    return { processed: true, reportDate: new Date().toISOString() };
  }

  @Process('weekly-backup')
  async handleWeeklyBackup(job: Job) {
    console.log('Processing weekly backup');
    
    // Backup logic here
    // This could export data, create snapshots, etc.
    
    return { processed: true, backupDate: new Date().toISOString() };
  }
}
