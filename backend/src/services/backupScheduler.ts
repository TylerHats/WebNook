import { queryOne, execute } from '../db/connection';
import { createBackupArchiveInternal } from '../routes/adminRoutes';

let schedulerInterval: NodeJS.Timeout | null = null;

export function initBackupScheduler() {
  console.log('[Backup Scheduler] Initializing automated backup daemon...');

  // Run check every 10 minutes
  schedulerInterval = setInterval(checkAndExecuteScheduledBackup, 10 * 60 * 1000);

  // Also run an initial check 15s after server startup
  setTimeout(checkAndExecuteScheduledBackup, 15000);
}

export async function checkAndExecuteScheduledBackup() {
  try {
    const enabledRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "auto_backup_enabled"');
    if (enabledRow?.value !== 'true') return;

    const intervalRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "auto_backup_interval"');
    const intervalType = intervalRow?.value || 'daily'; // 'hourly', 'daily', 'weekly'

    const lastBackupRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "last_auto_backup_at"');
    const lastBackupTime = lastBackupRow?.value ? new Date(lastBackupRow.value).getTime() : 0;
    const now = Date.now();

    let intervalMs = 24 * 60 * 60 * 1000; // Daily default
    if (intervalType === 'hourly') {
      intervalMs = 60 * 60 * 1000;
    } else if (intervalType === 'weekly') {
      intervalMs = 7 * 24 * 60 * 60 * 1000;
    }

    if (now - lastBackupTime >= intervalMs) {
      console.log(`[Backup Scheduler] Auto backup is due (${intervalType} schedule). Executing backup...`);
      const backup = await createBackupArchiveInternal();
      await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['last_auto_backup_at', new Date().toISOString()]);
      console.log(`[Backup Scheduler] Automated backup completed successfully: ${backup.filename}`);
    }
  } catch (err) {
    console.error('[Backup Scheduler Error] Failed to execute scheduled backup:', err);
  }
}
