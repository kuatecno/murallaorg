/**
 * Google Tasks Sync Service
 * Handles bi-directional synchronization between Muralla tasks and Google Tasks API
 */

import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import prisma from '@/lib/prisma';

interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  updated: string;
  selfLink?: string;
  parent?: string; // Task list ID
  position?: string;
}

interface SyncConflict {
  taskId: string;
  murallaTask: any;
  googleTask: GoogleTask;
  conflictType: 'timestamp' | 'status' | 'content';
}

class GoogleTasksSyncService {
  private auth: JWT;
  private tasks: any;

  constructor() {
    // Initialize JWT auth with service account (same as Google Chat)
    this.auth = new JWT({
      email: process.env.GOOGLE_CHAT_CLIENT_EMAIL,
      key: process.env.GOOGLE_CHAT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: [
        'https://www.googleapis.com/auth/chat.bot',
        'https://www.googleapis.com/auth/tasks'
      ],
      subject: process.env.GOOGLE_CHAT_ADMIN_EMAIL,
    });

    this.tasks = google.tasks({ version: 'v1', auth: this.auth });
  }

  /**
   * Create a Google Task for a Muralla task
   */
  async createGoogleTask(taskId: string): Promise<string | null> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignments: {
            include: {
              staff: true
            }
          }
        }
      });

      if (!task) {
        throw new Error('Task not found');
      }

      // Use default task list or create one for the Chat space
      const taskListId = await this.getOrCreateTaskList(task);

      const googleTaskData = {
        title: task.title,
        notes: this.formatTaskNotes(task),
        status: this.mapStatusToGoogle(task.status),
        due: task.dueDate ? task.dueDate.toISOString().split('T')[0] : undefined,
      };

      const response = await this.tasks.tasks.insert({
        tasklist: taskListId,
        requestBody: googleTaskData,
      });

      const googleTaskId = response.data.id;

      // Update Muralla task with Google Task metadata
      await prisma.task.update({
        where: { id: taskId },
        data: {
          googleTaskId,
          googleTasksListId: taskListId,
          googleTasksUpdatedAt: new Date(response.data.updated),
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
        },
      });

      return googleTaskId;
    } catch (error) {
      console.error('Error creating Google Task:', error);
      await this.markTaskSyncError(taskId, error.message);
      return null;
    }
  }

  /**
   * Update Google Task with Muralla task data
   */
  async updateGoogleTask(taskId: string): Promise<boolean> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignments: {
            include: {
              staff: true
            }
          }
        }
      });

      if (!task || !task.googleTaskId || !task.googleTasksListId) {
        throw new Error('Task not synced with Google Tasks');
      }

      const googleTaskData = {
        title: task.title,
        notes: this.formatTaskNotes(task),
        status: this.mapStatusToGoogle(task.status),
        due: task.dueDate ? task.dueDate.toISOString().split('T')[0] : undefined,
      };

      const response = await this.tasks.tasks.update({
        tasklist: task.googleTasksListId,
        task: task.googleTaskId,
        requestBody: googleTaskData,
      });

      await prisma.task.update({
        where: { id: taskId },
        data: {
          googleTasksUpdatedAt: new Date(response.data.updated),
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      console.error('Error updating Google Task:', error);
      await this.markTaskSyncError(taskId, error.message);
      return false;
    }
  }

  /**
   * Pull updates from Google Tasks to Muralla
   */
  async syncFromGoogle(taskId: string): Promise<boolean> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task || !task.googleTaskId || !task.googleTasksListId) {
        throw new Error('Task not synced with Google Tasks');
      }

      const response = await this.tasks.tasks.get({
        tasklist: task.googleTasksListId,
        task: task.googleTaskId,
      });

      const googleTask = response.data as GoogleTask;
      const googleUpdatedAt = new Date(googleTask.updated);

      // Check for conflicts
      if (this.hasConflict(task, googleTask)) {
        return await this.resolveConflict(task, googleTask);
      }

      // Update Muralla task with Google Task data
      const updateData: any = {
        title: googleTask.title,
        description: this.parseNotesToDescription(googleTask.notes),
        status: this.mapStatusFromGoogle(googleTask.status),
        googleTasksUpdatedAt: googleUpdatedAt,
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
      };

      if (googleTask.due) {
        updateData.dueDate = new Date(googleTask.due);
      }

      if (googleTask.status === 'completed') {
        updateData.completedAt = googleUpdatedAt;
      }

      await prisma.task.update({
        where: { id: taskId },
        data: updateData,
      });

      return true;
    } catch (error) {
      console.error('Error syncing from Google Tasks:', error);
      await this.markTaskSyncError(taskId, error.message);
      return false;
    }
  }

  /**
   * Delete Google Task
   */
  async deleteGoogleTask(taskId: string): Promise<boolean> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task || !task.googleTaskId || !task.googleTasksListId) {
        return true; // Nothing to delete
      }

      await this.tasks.tasks.delete({
        tasklist: task.googleTasksListId,
        task: task.googleTaskId,
      });

      await prisma.task.update({
        where: { id: taskId },
        data: {
          googleTaskId: null,
          googleTasksListId: null,
          googleTasksUpdatedAt: null,
          syncStatus: 'PENDING',
        },
      });

      return true;
    } catch (error) {
      console.error('Error deleting Google Task:', error);
      return false;
    }
  }

  /**
   * Get or create a task list for a task
   */
  private async getOrCreateTaskList(task: any): Promise<string> {
    // If task has a Chat space, try to find associated task list
    if (task.googleChatSpaceId) {
      // For now, use default task list. In the future, this could be enhanced
      // to create task lists per Chat space
    }

    // Get default task list
    const taskLists = await this.tasks.tasklists.list();
    const defaultList = taskLists.data.items?.[0];

    if (defaultList) {
      return defaultList.id;
    }

    // Create a default task list if none exists
    const response = await this.tasks.tasklists.insert({
      requestBody: {
        title: 'Muralla Tasks',
      },
    });

    return response.data.id;
  }

  /**
   * Check if there's a conflict between Muralla and Google Task
   */
  private hasConflict(murallaTask: any, googleTask: GoogleTask): boolean {
    if (!murallaTask.googleTasksUpdatedAt) {
      return false;
    }

    const googleUpdatedAt = new Date(googleTask.updated);
    const murallaUpdatedAt = murallaTask.updatedAt;

    // If Google was updated after Muralla's last sync, there might be a conflict
    return googleUpdatedAt > murallaUpdatedAt;
  }

  /**
   * Resolve conflict between Muralla and Google Task
   */
  private async resolveConflict(murallaTask: any, googleTask: GoogleTask): Promise<boolean> {
    const conflictResolution = process.env.GOOGLE_TASKS_CONFLICT_RESOLUTION || 'auto';

    if (conflictResolution === 'auto') {
      // Last-modified-wins strategy
      const googleUpdatedAt = new Date(googleTask.updated);
      const murallaUpdatedAt = murallaTask.updatedAt;

      if (googleUpdatedAt > murallaUpdatedAt) {
        // Google wins, update Muralla
        return await this.syncFromGoogle(murallaTask.id);
      } else {
        // Muralla wins, push to Google
        return await this.updateGoogleTask(murallaTask.id);
      }
    } else {
      // Manual resolution - mark as conflict
      await prisma.task.update({
        where: { id: murallaTask.id },
        data: {
          syncStatus: 'CONFLICT',
        },
      });

      return false;
    }
  }

  /**
   * Map Muralla status to Google Tasks status
   */
  private mapStatusToGoogle(status: string): 'needsAction' | 'completed' {
    return status === 'COMPLETED' ? 'completed' : 'needsAction';
  }

  /**
   * Map Google Tasks status to Muralla status
   */
  private mapStatusFromGoogle(status: string): string {
    return status === 'completed' ? 'COMPLETED' : 'TODO';
  }

  /**
   * Format task notes for Google Tasks
   */
  private formatTaskNotes(task: any): string {
    let notes = '';

    if (task.description) {
      notes += `Description: ${task.description}\n\n`;
    }

    notes += `Priority: ${task.priority}\n`;
    notes += `Status: ${task.status}\n`;

    if (task.assignments && task.assignments.length > 0) {
      notes += `Assigned to: ${task.assignments.map(a => `${a.staff.firstName} ${a.staff.lastName}`).join(', ')}\n`;
    }

    notes += `\n---\nSynced from Muralla Task Management`;

    return notes;
  }

  /**
   * Parse Google Tasks notes back to description
   */
  private parseNotesToDescription(notes?: string): string | null {
    if (!notes) return null;

    const lines = notes.split('\n');
    const descriptionLine = lines.find(line => line.startsWith('Description: '));
    
    if (descriptionLine) {
      return descriptionLine.replace('Description: ', '');
    }

    return null;
  }

  /**
   * Mark task as having sync error
   */
  private async markTaskSyncError(taskId: string, errorMessage: string): Promise<void> {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        syncStatus: 'ERROR',
      },
    });

    console.error(`Sync error for task ${taskId}: ${errorMessage}`);
  }

  /**
   * Get all tasks that need syncing
   */
  async getTasksNeedingSync(): Promise<any[]> {
    return await prisma.task.findMany({
      where: {
        syncStatus: {
          in: ['PENDING', 'ERROR'],
        },
      },
      include: {
        assignments: {
          include: {
            staff: true,
          },
        },
      },
    });
  }

  /**
   * Run sync for all pending tasks
   */
  async runSyncForPendingTasks(): Promise<void> {
    const pendingTasks = await this.getTasksNeedingSync();
    
    for (const task of pendingTasks) {
      if (!task.googleTaskId) {
        // Create new Google Task
        await this.createGoogleTask(task.id);
      } else {
        // Update existing Google Task
        await this.updateGoogleTask(task.id);
      }
    }
  }
}

// Singleton instance
let googleTasksSyncServiceInstance: GoogleTasksSyncService | null = null;

export function getGoogleTasksSyncService(): GoogleTasksSyncService {
  if (!googleTasksSyncServiceInstance) {
    googleTasksSyncServiceInstance = new GoogleTasksSyncService();
  }
  return googleTasksSyncServiceInstance;
}

export { GoogleTasksSyncService, SyncConflict };
