/**
 * Google Chat API Service
 * Handles integration with Google Chat for task collaboration
 */

import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import prisma from '@/lib/prisma';

interface GoogleChatMessage {
  text: string;
  cards?: any[];
}

interface TaskNotificationData {
  taskId: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignedTo?: string[];
  dueDate?: string;
  createdBy: string;
}

class GoogleChatService {
  private auth: JWT;
  private chat: any;

  constructor() {
    // Initialize JWT auth with service account
    this.auth = new JWT({
      email: process.env.GOOGLE_CHAT_CLIENT_EMAIL,
      key: process.env.GOOGLE_CHAT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/chat.bot'],
      subject: process.env.GOOGLE_CHAT_ADMIN_EMAIL, // Admin email for domain-wide delegation
    });

    this.chat = google.chat({ version: 'v1', auth: this.auth });
  }

  /**
   * Get authenticated Google Chat client for a user
   */
  private async getChatClientForUser(userId: string) {
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
      throw new Error('Google account not connected for this user');
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

    return google.chat({ version: 'v1', auth: oauth2Client });
  }

  /**
   * List spaces for a user
   */
  async listSpacesForUser(userId: string): Promise<any[]> {
    try {
      const chat = await this.getChatClientForUser(userId);
      const response = await chat.spaces.list();
      return response.data.spaces || [];
    } catch (error: any) {
      console.error('Error listing Google Chat spaces:', error);
      // Return the actual error message from Google API if available
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Failed to list Google Chat spaces: ${errorMessage}`);
    }
  }

  /**
   * Create a new Google Chat space
   */
  async createSpace(displayName: string): Promise<any> {
    try {
      const response = await this.chat.spaces.create({
        requestBody: {
          displayName: displayName,
          spaceType: 'SPACE',
          spaceSettings: {
            allowHistory: true, // Usually better for "Projects" to have history
            allowGuests: false,
          },
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error creating Google Chat space:', error);
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Failed to create Google Chat space: ${errorMessage}`);
    }
  }

  /**
   * Update a Google Chat space (rename)
   */
  async updateSpace(spaceId: string, displayName: string): Promise<any> {
    try {
      // Note: Updating space details might require specific scopes or might be limited
      // depending on the API version and space type.
      const response = await this.chat.spaces.patch({
        name: `spaces/${spaceId}`,
        updateMask: 'displayName',
        requestBody: {
          displayName: displayName,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error updating Google Chat space:', error);
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Failed to update Google Chat space: ${errorMessage}`);
    }
  }

  /**
   * Create a new Google Chat space for a task (Legacy/Specific helper)
   */
  async createTaskSpace(taskData: TaskNotificationData): Promise<string> {
    try {
      const response = await this.chat.spaces.create({
        requestBody: {
          displayName: `Task: ${taskData.title}`,
          spaceType: 'SPACE',
          spaceSettings: {
            allowHistory: false,
            allowGuests: false,
          },
        },
      });

      const spaceId = response.data.name?.replace('spaces/', '');
      
      // Send initial message with task details
      await this.sendTaskMessage(spaceId, taskData, true);

      return spaceId;
    } catch (error) {
      console.error('Error creating Google Chat space:', error);
      throw new Error('Failed to create Google Chat space');
    }
  }

  /**
   * Send a task notification to a Google Chat space
   */
  async sendTaskMessage(
    spaceId: string, 
    taskData: TaskNotificationData, 
    isInitialMessage: boolean = false
  ): Promise<string> {
    try {
      const message = this.formatTaskMessage(taskData, isInitialMessage);
      
      const response = await this.chat.spaces.messages.create({
        parent: `spaces/${spaceId}`,
        requestBody: message,
      });

      return response.data.name?.replace('spaces/' + spaceId + '/messages/', '');
    } catch (error) {
      console.error('Error sending Google Chat message:', error);
      throw new Error('Failed to send Google Chat message');
    }
  }

  /**
   * Update an existing task message
   */
  async updateTaskMessage(
    spaceId: string,
    messageId: string,
    taskData: TaskNotificationData
  ): Promise<void> {
    try {
      const message = this.formatTaskMessage(taskData, false);
      
      await this.chat.spaces.messages.update({
        name: `spaces/${spaceId}/messages/${messageId}`,
        requestBody: message,
      });
    } catch (error) {
      console.error('Error updating Google Chat message:', error);
      throw new Error('Failed to update Google Chat message');
    }
  }

  /**
   * Add members to a Google Chat space
   */
  async addMembersToSpace(spaceId: string, emails: string[]): Promise<void> {
    try {
      for (const email of emails) {
        await this.chat.spaces.members.create({
          parent: `spaces/${spaceId}`,
          requestBody: {
            member: {
              name: `users/${email}`,
              type: 'HUMAN',
            },
          },
        });
      }
    } catch (error) {
      console.error('Error adding members to Google Chat space:', error);
      throw new Error('Failed to add members to Google Chat space');
    }
  }

  /**
   * Format task data into a Google Chat message
   */
  private formatTaskMessage(taskData: TaskNotificationData, isInitialMessage: boolean): GoogleChatMessage {
    const priorityEmoji = {
      LOW: '🟢',
      MEDIUM: '🟡',
      HIGH: '🟠',
      URGENT: '🔴',
    }[taskData.priority] || '⚪';

    const statusEmoji = {
      TODO: '📋',
      IN_PROGRESS: '🔄',
      IN_REVIEW: '👀',
      COMPLETED: '✅',
      CANCELLED: '❌',
    }[taskData.status] || '📋';

    let text = `${priorityEmoji} ${statusEmoji} **Task: ${taskData.title}**\n\n`;
    
    if (taskData.description) {
      text += `📝 ${taskData.description}\n\n`;
    }

    text += `📊 Status: ${taskData.status}\n`;
    text += `🎯 Priority: ${taskData.priority}\n`;
    
    if (taskData.dueDate) {
      text += `📅 Due: ${new Date(taskData.dueDate).toLocaleDateString()}\n`;
    }

    if (taskData.assignedTo && taskData.assignedTo.length > 0) {
      text += `👥 Assigned to: ${taskData.assignedTo.join(', ')}\n`;
    }

    text += `👤 Created by: ${taskData.createdBy}`;

    if (isInitialMessage) {
      text += '\n\n💬 Use this space to discuss the task and share updates!';
    }

    return {
      text,
      cards: [
        {
          sections: [
            {
              widgets: [
                {
                  keyValue: {
                    topLabel: 'Task ID',
                    content: taskData.taskId,
                  },
                },
                {
                  keyValue: {
                    topLabel: 'Status',
                    content: taskData.status,
                    icon: statusEmoji === '✅' ? 'CHECK_BOX' : 'EVENT_NOTE',
                  },
                },
                {
                  keyValue: {
                    topLabel: 'Priority',
                    content: taskData.priority,
                    icon: 'PRIORITY_HIGH',
                  },
                },
              ],
            },
          ],
        },
      ],
    };
  }

  /**
   * Delete a Google Chat space
   */
  async deleteSpace(spaceId: string): Promise<void> {
    try {
      await this.chat.spaces.delete({
        name: `spaces/${spaceId}`,
      });
    } catch (error) {
      console.error('Error deleting Google Chat space:', error);
      throw new Error('Failed to delete Google Chat space');
    }
  }

  /**
   * Get space information
   */
  async getSpace(spaceId: string): Promise<any> {
    try {
      const response = await this.chat.spaces.get({
        name: `spaces/${spaceId}`,
      });
      return response.data;
    } catch (error) {
      console.error('Error getting Google Chat space:', error);
      throw new Error('Failed to get Google Chat space');
    }
  }
}

// Singleton instance
let googleChatServiceInstance: GoogleChatService | null = null;

export function getGoogleChatService(): GoogleChatService {
  if (!googleChatServiceInstance) {
    googleChatServiceInstance = new GoogleChatService();
  }
  return googleChatServiceInstance;
}

export { GoogleChatService };
export type { TaskNotificationData };
