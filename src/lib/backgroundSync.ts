/**
 * Background Sync Service
 * Handles periodic synchronization with Google Tasks
 */

import { getGoogleTasksSyncService } from './googleTasksSyncService';

class BackgroundSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the background sync service
   */
  start(): void {
    if (this.isRunning) {
      console.log('Background sync already running');
      return;
    }

    if (process.env.GOOGLE_TASKS_ENABLED !== 'true') {
      console.log('Google Tasks integration is disabled');
      return;
    }

    const syncIntervalMs = parseInt(process.env.GOOGLE_TASKS_SYNC_INTERVAL || '30000');
    
    console.log(`Starting background sync with interval: ${syncIntervalMs}ms`);
    
    this.syncInterval = setInterval(async () => {
      try {
        await this.runSync();
      } catch (error) {
        console.error('Background sync error:', error);
      }
    }, syncIntervalMs);

    this.isRunning = true;

    // Run initial sync
    this.runSync().catch(console.error);
  }

  /**
   * Stop the background sync service
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('Background sync stopped');
  }

  /**
   * Run sync for all pending tasks
   */
  private async runSync(): Promise<void> {
    try {
      const googleTasksSync = getGoogleTasksSyncService();
      await googleTasksSync.runSyncForPendingTasks();
    } catch (error) {
      console.error('Error in background sync:', error);
    }
  }

  /**
   * Get sync service status
   */
  getStatus(): { running: boolean; enabled: boolean } {
    return {
      running: this.isRunning,
      enabled: process.env.GOOGLE_TASKS_ENABLED === 'true',
    };
  }
}

// Singleton instance
let backgroundSyncServiceInstance: BackgroundSyncService | null = null;

export function getBackgroundSyncService(): BackgroundSyncService {
  if (!backgroundSyncServiceInstance) {
    backgroundSyncServiceInstance = new BackgroundSyncService();
  }
  return backgroundSyncServiceInstance;
}

// Auto-start background sync in production
if (process.env.NODE_ENV === 'production') {
  getBackgroundSyncService().start();
}
