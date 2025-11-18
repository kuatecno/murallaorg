/**
 * Google Tasks Sync Service
 * Handles bi-directional synchronization between Muralla tasks and Google Tasks API
 * Uses OAuth 2.0 user authentication
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import prisma from '@/lib/prisma';

interface GoogleTask {
  id?: string | null;
  title?: string | null;
  notes?: string | null;
  status?: string | null;
  due?: string | null;
  updated?: string | null;
  selfLink?: string | null;
  parent?: string | null;
  position?: string | null;
}

interface SyncConflict {
  taskId: string;
  murallaTask: any;
  googleTask: GoogleTask;
  conflictType: 'timestamp' | 'status' | 'content';
}

class GoogleTasksSyncService {
  constructor() {
    // OAuth 2.0 - no service account initialization needed
  }

  /**
   * Get authenticated Google Tasks client for a user
   */
  private async getTasksClient(userId: string) {
    const user = await prisma.staff.findUnique({
      where: { id: userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiresAt: true,
        googleEmail: true,
        googleTasksEnabled: true,
      },
    });

    if (!user || !user.googleTasksEnabled || !user.googleAccessToken) {
      throw new Error('Google Tasks not enabled for this user');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
    });

    // Check if token needs refresh
    if (user.googleTokenExpiresAt && new Date() >= user.googleTokenExpiresAt) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        // Update tokens in database
        await prisma.staff.update({
          where: { id: userId },
          data: {
            googleAccessToken: credentials.access_token,
            googleTokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          },
        });

        oauth2Client.setCredentials(credentials);
      } catch (error) {
        throw new Error('Failed to refresh Google access token');
      }
    }

    return google.tasks({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Create a Google Task for a Muralla task
   */
  async createGoogleTask(taskId: string): Promise<string | null> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          createdBy: true,
        },
      });

      if (!task || !task.createdById) {
        throw new Error('Task not found or has no creator');
      }

      const tasksClient = await this.getTasksClient(task.createdById);
      
      // Get or create default task list for the user
      const taskLists = await tasksClient.tasklists.list();
      let defaultTaskList = taskLists.data.items?.find(list => list.title === 'Muralla Tasks');
      
      if (!defaultTaskList) {
        const newList = await tasksClient.tasklists.insert({
          requestBody: {
            title: 'Muralla Tasks',
          },
        });
        defaultTaskList = newList.data;
      }

      const googleTask = {
        title: task.title,
        notes: this.formatTaskNotes(task),
        due: task.dueDate ? task.dueDate.toISOString().split('T')[0] : undefined,
      };

      const response = await tasksClient.tasks.insert({
        tasklist: defaultTaskList.id!,
        requestBody: googleTask,
      });

      const googleTaskId = response.data.id || null;

      // Update task with Google Task info
      await prisma.task.update({
        where: { id: taskId },
        data: {
          googleTaskId,
          googleTasksListId: defaultTaskList.id,
          googleTasksUpdatedAt: new Date(),
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
        },
      });

      return googleTaskId;
    } catch (error) {
      console.error('Error creating Google Task:', error);
      
      // Mark as error
      if (taskId) {
        await prisma.task.update({
          where: { id: taskId },
          data: { syncStatus: 'ERROR' },
        }).catch(() => {}); // Ignore if task doesn't exist
      }
      
      throw error;
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
          createdBy: true,
        },
      });

      if (!task || !task.createdById) {
        throw new Error('Task not found or has no creator');
      }

      if (!task.googleTaskId || !task.googleTasksListId) {
        throw new Error('Task not synced with Google Tasks');
      }

      const tasksClient = await this.getTasksClient(task.createdById);

      const googleTaskData = {
        title: task.title,
        notes: this.formatTaskNotes(task),
        status: this.mapStatusToGoogle(task.status),
        due: task.dueDate ? task.dueDate.toISOString().split('T')[0] : undefined,
      };

      const response = await tasksClient.tasks.update({
        tasklist: task.googleTasksListId,
        task: task.googleTaskId,
        requestBody: googleTaskData,
      });

      // Update sync status
      await prisma.task.update({
        where: { id: taskId },
        data: {
          googleTasksUpdatedAt: new Date(response.data.updated || new Date()),
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      console.error('Error updating Google Task:', error);
      
      // Mark as error
      if (taskId) {
        await prisma.task.update({
          where: { id: taskId },
          data: { syncStatus: 'ERROR' },
        }).catch(() => {});
      }
      
      throw error;
    }
  }

  /**
   * Pull updates from Google Tasks to Muralla
   */
  async syncFromGoogle(taskId: string): Promise<boolean> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          createdBy: true,
        },
      });

      if (!task || !task.createdById) {
        throw new Error('Task not found or has no creator');
      }

      if (!task.googleTaskId || !task.googleTasksListId) {
        throw new Error('Task not synced with Google Tasks');
      }

      const tasksClient = await this.getTasksClient(task.createdById);

      const response = await tasksClient.tasks.get({
        tasklist: task.googleTasksListId,
        task: task.googleTaskId,
      });

      const googleTask = response.data;
      
      if (!googleTask.id) {
        throw new Error('Google Task ID is missing');
      }
      
      const googleUpdatedAt = googleTask.updated ? new Date(googleTask.updated) : new Date();

      // Check for conflicts
      if (this.hasConflict(task, googleTask)) {
        return await this.resolveConflict(task, googleTask);
      }

      // Update Muralla task with Google Task data
      const updateData: any = {
        title: googleTask.title || task.title,
        description: this.parseNotesToDescription(googleTask.notes ?? undefined),
        status: this.mapStatusFromGoogle(googleTask.status ?? undefined),
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
      console.error('Error syncing from Google:', error);
      throw error;
    }
  }

  /**
   * Delete Google Task
   */
  async deleteGoogleTask(taskId: string): Promise<boolean> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          createdBy: true,
        },
      });

      if (!task || !task.createdById) {
        return true; // Nothing to delete
      }

      if (!task.googleTaskId || !task.googleTasksListId) {
        return true; // Nothing to delete
      }

      const tasksClient = await this.getTasksClient(task.createdById);

      await tasksClient.tasks.delete({
        tasklist: task.googleTasksListId,
        task: task.googleTaskId,
      });

      await prisma.task.update({
        where: { id: taskId },
        data: {
          googleTaskId: null,
          googleTasksListId: null,
          googleTasksUpdatedAt: null,
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      console.error('Error deleting Google Task:', error);
      throw error;
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
      notes += `Assigned to: ${task.assignments.map((a: any) => `${a.staff.firstName} ${a.staff.lastName}`).join(', ')}\n`;
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

export { GoogleTasksSyncService };
export type { SyncConflict };
