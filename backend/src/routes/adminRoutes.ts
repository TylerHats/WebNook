import { Router, Response } from 'express';
import os from 'os';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import https from 'https';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { execFile, execSync } from 'child_process';
import { execute, query, queryOne } from '../db/connection';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/authMiddleware';
import { runMigrations } from '../db/migrations';
import { sendIntegrationErrorEmail, sendAccountDisabledEmail, sendPasswordResetEmail, sendStyledEmail } from '../services/emailService';
import { validatePasswordComplexity } from './authRoutes';
import { getEffectiveBaseUrl, safePathInside } from '../utils/security';
import { invalidateLegalCache } from '../services/legalService';
import { clearEnsuredUsersCache } from './messageRoutes';
import { createNotification } from './notificationRoutes';

const router = Router();
router.use(authenticateToken as any, requireAdmin as any);

const REPO_OWNER = 'TylerHats';
const REPO_NAME = 'WebNook';

const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
const customBrandingDir = path.join(dataDir, 'branding');
if (!fs.existsSync(customBrandingDir)) {
  fs.mkdirSync(customBrandingDir, { recursive: true });
}

const BRANDING_MIME_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, customBrandingDir);
  },
  filename: (req, file, cb) => {
    const ext = BRANDING_MIME_EXT[file.mimetype] || '.png';
    cb(null, `logo${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (BRANDING_MIME_EXT[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, WebP, or GIF logo images are allowed'));
    }
  }
});

function execFilePromise(file: string, args: string[], cwd?: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { cwd, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
  });
}

function getGitHubApi(apiPath: string): Promise<any> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: apiPath,
      headers: { 'User-Agent': 'WebNook-Self-Updater' }
    };
    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });
    req.setTimeout(8000, () => {
      req.destroy();
      resolve(null);
    });
    req.on('error', () => resolve(null));
  });
}

function getDirectorySize(dirPath: string): number {
  let totalSize = 0;
  if (!fs.existsSync(dirPath)) return 0;
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        totalSize += getDirectorySize(filePath);
      } else if (file.isFile()) {
        try {
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
        } catch {}
      }
    }
  } catch {}
  return totalSize;
}

// 1. System Performance & Statistics
router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users');
    const nookCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM nooks');
    const dbVersionRow = await queryOne<{ max_version: number }>('SELECT MAX(version) as max_version FROM schema_migrations');

    let dbSizeBytes = 0;
    try {
      const dbPath = path.join(dataDir, 'webnook.db');
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        dbSizeBytes = stats.size;
      }
    } catch {}

    const uploadsDir = path.join(__dirname, '../../uploads');
    const uploadsSizeBytes = getDirectorySize(uploadsDir) + getDirectorySize(customBrandingDir);

    return res.json({
      stats: {
        totalUsers: userCount?.count || 0,
        totalNooks: nookCount?.count || 0,
        dbVersion: dbVersionRow?.max_version || 1,
        dbSizeBytes,
        uploadsSizeBytes
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch system metrics' });
  }
});

const backupsDir = path.join(dataDir, 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// 2. User Management Suite
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await query<any>(
      'SELECT id, username, email, display_name, role, is_totp_enabled, is_disabled, disabled_reason, terms_accepted_version, terms_accepted_at, created_at FROM users ORDER BY id ASC'
    );
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list users' });
  }
});

router.put('/users/:id/role', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    await execute('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    return res.json({ message: 'User role updated' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Disable / Enable User Account with Reason & Email Notice
router.put('/users/:id/disable', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { disabled, reason } = req.body;
    const userId = req.params.id;

    if (req.user!.id === Number(userId) && disabled) {
      return res.status(400).json({ error: 'You cannot disable your own admin account' });
    }

    const targetUser = await queryOne<any>('SELECT id, username, email FROM users WHERE id = ?', [userId]);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const isDisabledVal = disabled ? 1 : 0;
    const reasonText = reason || '';

    await execute('UPDATE users SET is_disabled = ?, disabled_reason = ? WHERE id = ?', [isDisabledVal, reasonText, userId]);

    if (disabled) {
      sendAccountDisabledEmail(targetUser.email, targetUser.username, reasonText);
    }

    return res.json({
      message: disabled ? `User @${targetUser.username} disabled.` : `User @${targetUser.username} re-enabled.`
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user disable status' });
  }
});

// Reset User Password (Manual Password or Email Reset Link)
router.put('/users/:id/password', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { new_password, send_reset_email } = req.body;
    const userId = req.params.id;

    const targetUser = await queryOne<any>('SELECT id, username, email FROM users WHERE id = ?', [userId]);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (send_reset_email) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000).toISOString();

      await execute('DELETE FROM password_resets WHERE user_id = ?', [targetUser.id]);
      await execute('INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)', [
        resetToken,
        targetUser.id,
        expiresAt
      ]);

      const baseUrl = await getEffectiveBaseUrl(req);
      const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
      const sent = await sendPasswordResetEmail(targetUser.email, targetUser.username, resetToken, baseUrl);
      return res.json({
        message: sent
          ? `Password reset email sent to ${targetUser.email}`
          : `SMTP not configured. Share this reset link manually: ${resetUrl}`,
        reset_url: resetUrl,
        reset_token: resetToken
      });
    }

    if (!new_password) {
      return res.status(400).json({ error: 'New password is required' });
    }
    const pwdError = await validatePasswordComplexity(String(new_password));
    if (pwdError) {
      return res.status(400).json({ error: pwdError });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await execute('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [password_hash, userId]);

    return res.json({ message: `Password for @${targetUser.username} updated successfully` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Delete User Account & Associated Files Entirely
router.delete('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;

    if (req.user!.id === Number(userId)) {
      return res.status(400).json({ error: 'You cannot delete your own admin account' });
    }

    const targetUser = await queryOne<any>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    await execute('DELETE FROM users WHERE id = ?', [userId]);

    return res.json({ message: `User @${targetUser.username} and associated profile deleted entirely.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Send Admin System Announcement / Direct Notification
router.post('/send-notification', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { target_type, target_user_id, title, message, link_title, link_url } = req.body;

    if (!title || !title.trim() || !message || !message.trim()) {
      return res.status(400).json({ error: 'Title and Message are required' });
    }

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    const cleanLinkTitle = (link_title || '').trim();
    const cleanLinkUrl = (link_url || '').trim();

    if (target_type === 'user') {
      if (!target_user_id) {
        return res.status(400).json({ error: 'Target user ID is required for direct notifications' });
      }

      const targetUser = await queryOne<any>('SELECT id, username FROM users WHERE id = ?', [target_user_id]);
      if (!targetUser) {
        return res.status(404).json({ error: 'Target user not found' });
      }

      await createNotification(
        targetUser.id,
        'system',
        req.user!.id,
        cleanTitle,
        cleanMessage,
        cleanLinkUrl,
        cleanLinkTitle
      );

      return res.json({ message: `Notification sent successfully to @${targetUser.username}!` });
    } else {
      const users = await query<any>('SELECT id FROM users WHERE is_disabled = 0');
      let count = 0;
      for (const u of users) {
        await createNotification(
          u.id,
          'system',
          req.user!.id,
          cleanTitle,
          cleanMessage,
          cleanLinkUrl,
          cleanLinkTitle
        );
        count++;
      }

      return res.json({ message: `Global notification broadcast successfully sent to ${count} users!` });
    }
  } catch (err: any) {
    console.error('Send notification error:', err);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
});

// 3. Self-Updater & Release Channels
router.get('/update/check', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const channelRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "update_channel"');
    const channel = channelRow?.value || 'stable';

    const installedVersionRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "installed_version"');
    const installedVersion = installedVersionRow?.value;

    const installedCommitRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "installed_commit_sha"');
    const installedCommit = installedCommitRow?.value;

    let currentPkgVersion = '3.4.0';
    try {
      const rootPkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf8'));
      if (rootPkg && rootPkg.version) currentPkgVersion = rootPkg.version;
    } catch {}

    let localCommitHash = process.env.GIT_COMMIT_HASH || '';
    if (!localCommitHash) {
      try {
        const gitOutput = execSync('git rev-parse --short HEAD 2>/dev/null', { cwd: path.join(__dirname, '../../..') }).toString().trim();
        if (gitOutput && gitOutput !== 'HEAD') localCommitHash = gitOutput;
      } catch {}
    }

    const pickNewerTag = (a?: string | null, b?: string | null): string => {
      const cleanA = (a || '').trim();
      const cleanB = (b || '').trim();
      if (!cleanA) return cleanB;
      if (!cleanB) return cleanA;
      const partsA = cleanA.replace(/^v/i, '').split('.').map(n => parseInt(n, 10));
      const partsB = cleanB.replace(/^v/i, '').split('.').map(n => parseInt(n, 10));
      if (partsA.some(Number.isNaN) || partsB.some(Number.isNaN)) return cleanA;
      for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const va = partsA[i] || 0;
        const vb = partsB[i] || 0;
        if (va > vb) return cleanA;
        if (vb > va) return cleanB;
      }
      return cleanA;
    };

    const pkgTag = currentPkgVersion.startsWith('v') ? currentPkgVersion : `v${currentPkgVersion}`;
    let currentVersion = pkgTag;
    let latestReleaseInfo: any = null;
    let targetVersion = pkgTag;

    if (channel === 'alpha') {
      const commits = await getGitHubApi(`/repos/${REPO_OWNER}/${REPO_NAME}/commits/main`);
      if (commits && commits.sha) {
        targetVersion = commits.sha.substring(0, 7);
        currentVersion = localCommitHash || installedCommit || (installedVersion && /^[0-9a-f]{7}$/i.test(installedVersion) ? installedVersion : targetVersion);

        latestReleaseInfo = {
          tag: targetVersion,
          name: `Alpha Commit: ${commits.commit.message.split('\n')[0]}`,
          notes: commits.commit.message,
          published_at: commits.commit.committer.date
        };
      }
    } else if (channel === 'beta') {
      const tags = await getGitHubApi(`/repos/${REPO_OWNER}/${REPO_NAME}/tags`);
      if (Array.isArray(tags) && tags.length > 0) {
        const latestTag = tags[0];
        targetVersion = latestTag.name;
        currentVersion = pickNewerTag(pkgTag, installedVersion);

        let commitNotes = '';
        const tagCommits = await getGitHubApi(`/repos/${REPO_OWNER}/${REPO_NAME}/commits?sha=${latestTag.name}`);
        if (Array.isArray(tagCommits) && tagCommits.length > 0) {
          commitNotes = tagCommits.slice(0, 5).map((c: any) => `• ${c.commit.message.split('\n')[0]}`).join('\n');
        }

        latestReleaseInfo = {
          tag: latestTag.name,
          name: `Beta Release Tag: ${latestTag.name}`,
          notes: commitNotes || `Beta channel update based on tag ${latestTag.name}`,
          published_at: new Date().toISOString()
        };
      }
    } else {
      const releases = await getGitHubApi(`/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`);
      if (releases && releases.tag_name) {
        targetVersion = releases.tag_name;
        currentVersion = pickNewerTag(pkgTag, installedVersion);

        latestReleaseInfo = {
          tag: releases.tag_name,
          name: releases.name || releases.tag_name,
          notes: releases.body || 'Latest stable release',
          published_at: releases.published_at
        };
      }
    }

    const normalize = (v: string) => v ? v.replace(/^v/i, '').trim().toLowerCase() : '';
    const updateAvailable = normalize(targetVersion) !== '' && normalize(currentVersion) !== normalize(targetVersion);

    return res.json({
      currentVersion,
      targetVersion,
      channel,
      updateAvailable,
      latestRelease: latestReleaseInfo || { tag: targetVersion, name: `WebNook ${targetVersion}`, notes: 'You are running the latest version.' }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to check for updates' });
  }
});

router.post('/update/channel', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { channel } = req.body;
    if (!['stable', 'beta', 'alpha'].includes(channel)) {
      return res.status(400).json({ error: 'Invalid update channel' });
    }

    await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['update_channel', channel]);
    return res.json({ message: `Update channel updated to ${channel}` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update channel' });
  }
});

router.post('/update/apply', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const repoPath = path.join(__dirname, '../../..');
    const { targetVersion } = req.body;

    try {
      execSync('git fetch --all && git reset --hard origin/main && git clean -fd', { cwd: repoPath, timeout: 45000 });
      try {
        const buildEnv = { ...process.env, NODE_ENV: 'development' };
        execSync('npm run setup', { cwd: repoPath, timeout: 180000, env: buildEnv });
        execSync('npm run build', { cwd: repoPath, timeout: 180000, env: buildEnv });
      } catch (buildErr: any) {
        console.warn('[Self-Updater Warning] In-container build failed:', buildErr.message);
      }
    } catch (gitErr: any) {
      console.warn('[Self-Updater Warning] Git fetch/reset failed:', gitErr.message);
    }

    await runMigrations();

    if (targetVersion) {
      await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['installed_version', String(targetVersion)]);
      await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['installed_commit_sha', String(targetVersion)]);
    }

    setTimeout(() => {
      console.log('[Self-Updater] Restarting container process to apply update...');
      process.exit(0);
    }, 1200);

    return res.json({
      message: `Update applied! WebNook container is restarting now (please refresh your browser in 5 seconds).`
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Failed to apply update: ${err.message}` });
  }
});

// 4. Compressed Backup & Schema-Aware Restore Suite
router.get('/backups', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const files = fs.readdirSync(backupsDir);
    const backups = files.filter(f => f.endsWith('.tar.gz') || f.endsWith('.db')).map(f => {
      const filePath = path.join(backupsDir, f);
      const stat = fs.statSync(filePath);
      return {
        filename: f,
        sizeBytes: stat.size,
        created_at: stat.mtime
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return res.json({ backups });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list backups' });
  }
});

export function purgeExcessBackups(retentionCount: number) {
  if (retentionCount <= 0) return;
  try {
    if (!fs.existsSync(backupsDir)) return;
    const files = fs.readdirSync(backupsDir);
    const backups = files.filter(f => f.endsWith('.tar.gz') || f.endsWith('.db')).map(f => {
      const filePath = path.join(backupsDir, f);
      const stat = fs.statSync(filePath);
      return {
        filename: f,
        filePath,
        created_at: stat.mtime
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (backups.length > retentionCount) {
      const toDelete = backups.slice(retentionCount);
      for (const b of toDelete) {
        if (fs.existsSync(b.filePath)) {
          fs.unlinkSync(b.filePath);
          console.log(`[Backup Retention] Purged old backup archive: ${b.filename}`);
        }
      }
    }
  } catch (err) {
    console.error('[Backup Retention Error] Failed to purge old backups:', err);
  }
}

export async function createBackupArchiveInternal(): Promise<{ filename: string; sizeBytes: number; created_at: Date }> {
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  // Flush WAL journal into main SQLite file so the snapshot is consistent
  try {
    await execute('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch {}

  const uploadsDir = path.join(__dirname, '../../uploads');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `webnook-backup-${timestamp}.tar.gz`;
  const archivePath = path.join(backupsDir, filename);

  const stageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webnook-backup-stage-'));

  try {
    const dbPath = path.join(dataDir, 'webnook.db');
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, path.join(stageDir, 'webnook.db'));
    }

    fs.writeFileSync(path.join(stageDir, 'backup_metadata.json'), JSON.stringify({
      created_at: new Date().toISOString(),
      version: '3.4.0',
      type: 'full_compressed'
    }, null, 2));

    if (fs.existsSync(customBrandingDir)) {
      fs.cpSync(customBrandingDir, path.join(stageDir, 'branding'), { recursive: true });
    } else {
      fs.mkdirSync(path.join(stageDir, 'branding'), { recursive: true });
    }

    if (fs.existsSync(uploadsDir)) {
      fs.cpSync(uploadsDir, path.join(stageDir, 'uploads'), { recursive: true });
    } else {
      fs.mkdirSync(path.join(stageDir, 'uploads'), { recursive: true });
    }

    await execFilePromise('tar', ['-czf', archivePath, '-C', stageDir, '.']);

    const stat = fs.statSync(archivePath);

    const retentionRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "backup_retention_count"');
    const retentionCount = parseInt(retentionRow?.value || '10', 10);
    purgeExcessBackups(retentionCount);

    return {
      filename,
      sizeBytes: stat.size,
      created_at: stat.mtime
    };
  } finally {
    try {
      fs.rmSync(stageDir, { recursive: true, force: true });
    } catch {}
  }
}

router.post('/backups/create', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const backup = await createBackupArchiveInternal();
    return res.json({
      message: 'Compressed backup archive created successfully!',
      backup
    });
  } catch (err: any) {
    console.error('Backup creation error:', err);
    return res.status(500).json({ error: 'Failed to create backup archive' });
  }
});

router.get('/backups/download/:filename', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filename = path.basename(req.params.filename);
    if (!filename.endsWith('.tar.gz') && !filename.endsWith('.db')) {
      return res.status(400).json({ error: 'Invalid backup file type' });
    }
    const filePath = safePathInside(backupsDir, filename);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    res.setHeader('Content-Type', filename.endsWith('.tar.gz') ? 'application/gzip' : 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to download backup' });
  }
});

const restoreUpload = multer({
  dest: path.join(os.tmpdir(), 'webnook-restore'),
  limits: { fileSize: 512 * 1024 * 1024 }
});

async function validateTarArchiveSafe(archivePath: string): Promise<void> {
  const { stdout } = await execFilePromise('tar', ['-tvzf', archivePath]);
  const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Reject symlinks, hardlinks, device files, FIFOs
    if (/^[lbcph]/i.test(line)) {
      throw new Error('Archive contains disallowed symlink or special file entry');
    }
    const parts = line.split(/\s+/);
    const entryName = parts[parts.length - 1] || '';
    const cleaned = entryName.replace(/^\.\//, '').replace(/\/+$/, '');
    if (!cleaned || cleaned === '.') continue;
    if (cleaned.startsWith('/') || cleaned.includes('..') || cleaned.includes('\0')) {
      throw new Error(`Archive contains unsafe path entry: ${entryName}`);
    }
    if (!/^(webnook\.db|backup_metadata\.json|branding(\/.*)?|uploads(\/.*)?)$/.test(cleaned)) {
      throw new Error(`Archive contains unexpected entry outside backup scope: ${entryName}`);
    }
  }
}

router.post('/backups/restore', restoreUpload.single('backup_file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    let sourcePath = '';
    const filenameParam = req.body.filename;

    if (req.file) {
      sourcePath = req.file.path;
    } else if (filenameParam) {
      const safeBackup = safePathInside(backupsDir, path.basename(String(filenameParam)));
      if (safeBackup) sourcePath = safeBackup;
    }

    if (!sourcePath || !fs.existsSync(sourcePath)) {
      return res.status(400).json({ error: 'No valid backup file provided' });
    }

    const uploadsDir = path.join(__dirname, '../../uploads');
    const isTarGz = sourcePath.endsWith('.tar.gz') || Boolean(req.file && req.file.originalname.endsWith('.tar.gz'));

    if (isTarGz) {
      await validateTarArchiveSafe(sourcePath);

      const unpackDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webnook-restore-unpack-'));
      try {
        await execFilePromise('tar', ['-xzf', sourcePath, '-C', unpackDir, '--no-same-owner']);

        const restoredDbPath = path.join(unpackDir, 'webnook.db');
        if (fs.existsSync(restoredDbPath)) {
          try { await execute('PRAGMA wal_checkpoint(TRUNCATE)'); } catch {}
          for (const suffix of ['-wal', '-shm']) {
            const walFile = path.join(dataDir, `webnook.db${suffix}`);
            if (fs.existsSync(walFile)) {
              try { fs.unlinkSync(walFile); } catch {}
            }
          }
          fs.copyFileSync(restoredDbPath, path.join(dataDir, 'webnook.db'));
        }

        const restoredBrandingDir = path.join(unpackDir, 'branding');
        if (fs.existsSync(restoredBrandingDir)) {
          fs.cpSync(restoredBrandingDir, customBrandingDir, { recursive: true });
        }

        const restoredUploadsDir = path.join(unpackDir, 'uploads');
        if (fs.existsSync(restoredUploadsDir)) {
          fs.cpSync(restoredUploadsDir, uploadsDir, { recursive: true });
        }

        const restoredMetaPath = path.join(unpackDir, 'backup_metadata.json');
        if (fs.existsSync(restoredMetaPath)) {
          fs.copyFileSync(restoredMetaPath, path.join(dataDir, 'backup_metadata.json'));
        }
      } finally {
        try {
          fs.rmSync(unpackDir, { recursive: true, force: true });
        } catch {}
      }
    } else if (sourcePath.endsWith('.db') || (req.file && req.file.originalname.endsWith('.db'))) {
      try { await execute('PRAGMA wal_checkpoint(TRUNCATE)'); } catch {}
      for (const suffix of ['-wal', '-shm']) {
        const walFile = path.join(dataDir, `webnook.db${suffix}`);
        if (fs.existsSync(walFile)) {
          try { fs.unlinkSync(walFile); } catch {}
        }
      }
      fs.copyFileSync(sourcePath, path.join(dataDir, 'webnook.db'));
    } else {
      return res.status(400).json({ error: 'Backup must be a .tar.gz archive or .db file' });
    }

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    await runMigrations();
    invalidateLegalCache();
    clearEnsuredUsersCache();

    return res.json({
      success: true,
      message: 'System backup restored successfully! Database, custom branding, and all uploaded media files have been fully restored.'
    });
  } catch (err: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    console.error('Restore error:', err);
    return res.status(500).json({ error: `Restore failed: ${err.message}` });
  }
});

// 5. System Settings, SMTP Config, Legal Policy Config & Whitelabel Branding Upload
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await query<any>('SELECT key, value FROM system_settings');
    const settings: Record<string, string> = {
      app_name: 'WebNook',
      logo_url: '/branding/logo.png',
      site_url: '',
      smtp_host: '',
      smtp_port: '587',
      smtp_user: '',
      smtp_pass: '',
      smtp_from: '',
      smtp_secure: 'false',
      smtp_allow_self_signed: 'false',
      auto_backup_enabled: 'false',
      auto_backup_interval: 'daily',
      backup_retention_count: '10',
      last_auto_backup_at: '',
      legal_version: '1.0',
      legal_effective_date: new Date().toISOString().slice(0, 10),
      legal_operator_name: '',
      legal_contact_email: '',
      legal_jurisdiction: '',
      legal_min_age: '13',
      legal_custom_terms_addendum: '',
      legal_custom_privacy_addendum: ''
    };
    rows.forEach(r => (settings[r.key] = r.value));
    return res.json({ settings });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.post('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object required' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', [key, String(value)]);
    }

    invalidateLegalCache();

    return res.json({ message: 'Settings saved successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Bump Legal Policy Version & Trigger Re-Acceptance on Next Visit/Login
router.post('/legal/bump-version', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentRow = await queryOne<{ value: string }>('SELECT value FROM system_settings WHERE key = "legal_version"');
    const current = (currentRow?.value || '1.0').trim();

    let nextVersion = String(req.body?.version || '').trim();
    if (nextVersion) {
      if (!/^[a-zA-Z0-9._-]{1,20}$/.test(nextVersion)) {
        return res.status(400).json({ error: 'Policy version may only contain letters, numbers, dots, hyphens, and underscores (max 20 chars).' });
      }
    } else {
      const parts = current.split('.');
      const last = parseInt(parts[parts.length - 1], 10);
      if (!Number.isNaN(last)) {
        parts[parts.length - 1] = String(last + 1);
        nextVersion = parts.join('.');
      } else {
        nextVersion = `${current}.1`;
      }
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['legal_version', nextVersion]);
    await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['legal_effective_date', todayIso]);

    // Record acceptance for the publishing admin so their active dashboard session can load users immediately
    if (req.user?.id) {
      await execute(
        'UPDATE users SET terms_accepted_version = ?, terms_accepted_at = CURRENT_TIMESTAMP WHERE id = ?',
        [nextVersion, req.user.id]
      );
    }

    invalidateLegalCache();

    return res.json({
      version: nextVersion,
      effective_date: todayIso,
      message: `Published policy version v${nextVersion}. All users will be prompted to accept the updated Terms & Privacy Policy.`
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to bump legal policy version' });
  }
});

// Test Steam API Integration
router.post('/integrations/test/steam', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const keyRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "steam_api_key"');
    const apiKey = req.body.steam_api_key || keyRow?.value;

    if (!apiKey) {
      return res.status(400).json({ status: 'not_configured', error: 'No Steam API Key configured' });
    }

    const testUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${encodeURIComponent(apiKey)}&steamids=76561198000000000`;
    const textData = await new Promise<string>((resolve, reject) => {
      https.get(testUrl, (res) => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => resolve(body));
      }).on('error', reject);
    });

    const parsed = JSON.parse(textData);
    if (parsed.response && parsed.response.players) {
      await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['steam_api_status', 'connected']);
      await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['steam_consecutive_errors', '0']);
      return res.json({ status: 'connected', message: 'Steam Web API key is valid and connected!' });
    } else {
      throw new Error('Invalid response format from Steam Web API');
    }
  } catch (err: any) {
    const errCountRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "steam_consecutive_errors"');
    const newCount = parseInt(errCountRow?.value || '0', 10) + 1;
    await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['steam_consecutive_errors', String(newCount)]);
    await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['steam_api_status', 'broken']);

    if (newCount >= 3) {
      sendIntegrationErrorEmail('Steam Web API', err.message || 'Authentication or API query failed');
    }

    return res.status(400).json({ status: 'broken', error: `Steam API validation failed: ${err.message}` });
  }
});

// Test Spotify API Integration
router.post('/integrations/test/spotify', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const idRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "spotify_client_id"');
    const secretRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "spotify_client_secret"');

    const clientId = req.body.spotify_client_id || idRow?.value;
    const clientSecret = req.body.spotify_client_secret || secretRow?.value;

    if (!clientId || !clientSecret) {
      return res.status(400).json({ status: 'not_configured', error: 'Spotify Client ID & Secret required' });
    }

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const postData = 'grant_type=client_credentials';

    const tokenResText = await new Promise<string>((resolve, reject) => {
      const request = https.request('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => resolve(body));
      });
      request.on('error', reject);
      request.write(postData);
      request.end();
    });

    const tokenJson = JSON.parse(tokenResText);
    if (tokenJson.access_token) {
      await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['spotify_api_status', 'connected']);
      await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['spotify_consecutive_errors', '0']);
      return res.json({ status: 'connected', message: 'Spotify Developer Credentials valid & access token granted!' });
    } else {
      throw new Error(tokenJson.error_description || tokenJson.error || 'Failed Spotify authentication');
    }
  } catch (err: any) {
    const errCountRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "spotify_consecutive_errors"');
    const newCount = parseInt(errCountRow?.value || '0', 10) + 1;
    await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['spotify_consecutive_errors', String(newCount)]);
    await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['spotify_api_status', 'broken']);

    if (newCount >= 3) {
      sendIntegrationErrorEmail('Spotify Developer API', err.message || 'Authentication or client credential exchange failed');
    }

    return res.status(400).json({ status: 'broken', error: `Spotify credentials validation failed: ${err.message}` });
  }
});

// Test Apple Music API Integration
router.post('/integrations/test/apple', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tokenRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "apple_music_token"');
    const tokenVal = req.body.apple_music_token || tokenRow?.value;

    if (!tokenVal) {
      return res.status(400).json({ status: 'not_configured', error: 'No Apple Music Developer Token configured' });
    }

    if (tokenVal.length < 20) {
      throw new Error('Apple Music developer token is invalid or too short');
    }

    await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['apple_api_status', 'connected']);
    await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['apple_consecutive_errors', '0']);
    return res.json({ status: 'connected', message: 'Apple Music Developer Token saved & validated!' });
  } catch (err: any) {
    await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['apple_api_status', 'broken']);
    return res.status(400).json({ status: 'broken', error: `Apple Music token error: ${err.message}` });
  }
});

// Test TMDB API Integration
router.post('/integrations/test/tmdb', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const keyRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "tmdb_api_key"');
    const apiKey = req.body.tmdb_api_key || keyRow?.value;

    if (!apiKey) {
      return res.status(400).json({ status: 'not_configured', error: 'No TMDB API Key configured' });
    }

    const testUrl = `https://api.themoviedb.org/3/authentication?api_key=${encodeURIComponent(apiKey)}`;
    const textData = await new Promise<string>((resolve, reject) => {
      https.get(testUrl, (res) => {
        let body = '';
        res.on('data', (chunk: any) => (body += chunk));
        res.on('end', () => resolve(body));
      }).on('error', reject);
    });

    const parsed = JSON.parse(textData);
    if (parsed.success) {
      await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['tmdb_api_status', 'connected']);
      return res.json({ status: 'connected', message: 'TMDB API key is valid and connected!' });
    } else {
      throw new Error(parsed.status_message || 'TMDB API authentication failed');
    }
  } catch (err: any) {
    await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['tmdb_api_status', 'broken']);
    return res.status(400).json({ status: 'broken', error: `TMDB API validation failed: ${err.message}` });
  }
});

// Test SMTP Configuration Email Endpoint
router.post('/settings/test-email', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetEmail = req.body.to_email || req.user!.email;
    const sent = await sendStyledEmail({
      to: targetEmail,
      subject: 'WebNook SMTP Integration Test',
      title: 'SMTP Mail Engine Working! 🚀',
      bodyHtml: `
        <p>Congratulations! Your WebNook SMTP email credentials have been successfully verified.</p>
        <p>System automated notices (like password reset requests and account notifications) are now operational.</p>
      `
    });

    if (sent) {
      return res.json({ message: `Test email sent successfully to ${targetEmail}` });
    } else {
      return res.status(400).json({ error: `Failed to send test email. Please check your SMTP host, port, and credentials.` });
    }
  } catch (err: any) {
    return res.status(500).json({ error: `SMTP error: ${err.message}` });
  }
});

// Upload Whitelabel Branding Logo
router.post('/branding/logo', upload.single('logo'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No logo image file uploaded' });
    }

    const logoUrl = `/branding/${req.file.filename}?v=${Date.now()}`;
    await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['logo_url', logoUrl]);
    invalidateLegalCache();

    return res.json({
      message: 'Branding logo uploaded successfully!',
      logo_url: logoUrl
    });
  } catch (err: any) {
    console.error('Branding upload error:', err);
    return res.status(500).json({ error: 'Failed to upload branding logo' });
  }
});

// 6. Factory Reset / OOBE Application Wipe
router.post('/system/wipe', async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('EXECUTING WEBNOOK SYSTEM FACTORY RESET...');

    const tablesToClear = [
      'message_reactions',
      'messages',
      'conversation_members',
      'conversations',
      'notifications',
      'guestbook_reactions',
      'guestbook_entries',
      'friends',
      'nook_stickers',
      'nook_widgets',
      'nooks',
      'passkey_credentials',
      'password_resets',
      'email_verifications',
      'spotify_user_tokens',
      'users',
      'system_settings',
      'schema_migrations'
    ];
    for (const table of tablesToClear) {
      try { await execute(`DELETE FROM ${table}`); } catch {}
    }

    const uploadsDir = path.join(__dirname, '../../uploads');
    if (fs.existsSync(uploadsDir)) {
      try {
        const files = fs.readdirSync(uploadsDir);
        for (const file of files) {
          fs.rmSync(path.join(uploadsDir, file), { recursive: true, force: true });
        }
      } catch {}
    }

    if (fs.existsSync(customBrandingDir)) {
      try {
        const files = fs.readdirSync(customBrandingDir);
        for (const file of files) {
          fs.rmSync(path.join(customBrandingDir, file), { recursive: true, force: true });
        }
      } catch {}
    }

    await runMigrations();
    invalidateLegalCache();
    clearEnsuredUsersCache();

    return res.json({
      success: true,
      message: 'Application wiped successfully! Restarting initial setup wizard...'
    });
  } catch (err: any) {
    console.error('Wipe error:', err);
    return res.status(500).json({ error: `System wipe failed: ${err.message}` });
  }
});

export default router;
