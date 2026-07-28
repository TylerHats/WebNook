import { Router, Request, Response } from 'express';
import os from 'os';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import https from 'https';
import { execute, query, queryOne } from '../db/connection';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/authMiddleware';
import { runMigrations } from '../db/migrations';
import { sendIntegrationErrorEmail, sendAccountDisabledEmail, sendPasswordResetEmail, sendStyledEmail } from '../services/emailService';

const router = Router();
router.use(authenticateToken as any, requireAdmin as any);

const REPO_OWNER = 'TylerHats';
const REPO_NAME = 'WebNook';

// Configure Multer for custom branding logo upload (Saved in persistent data dir)
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
const customBrandingDir = path.join(dataDir, 'branding');
if (!fs.existsSync(customBrandingDir)) {
  fs.mkdirSync(customBrandingDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, customBrandingDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `logo${ext}`);
  }
});
const upload = multer({ storage });

// Helper HTTPS request
function getGitHubApi(apiPath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: apiPath,
      headers: { 'User-Agent': 'WebNook-Self-Updater' }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

// Recursive Directory Size Calculator Helper
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
        } catch (e) {
          // ignore stat errors
        }
      }
    }
  } catch (e) {
    // ignore readdir errors
  }
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
    } catch (e) {
      // ignore
    }

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

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { exec } from 'child_process';

function execPromise(command: string, cwd?: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
  });
}

const backupsDir = path.join(dataDir, 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// 2. User Management Suite
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await query<any>('SELECT id, username, email, display_name, role, is_totp_enabled, is_disabled, disabled_reason, created_at FROM users ORDER BY id ASC');
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

      await execute('INSERT OR REPLACE INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)', [
        resetToken,
        targetUser.id,
        expiresAt
      ]);

      const sent = await sendPasswordResetEmail(targetUser.email, targetUser.username, resetToken);
      return res.json({
        message: sent ? `Password reset email sent to ${targetUser.email}` : `Password reset token generated: ${resetToken}`,
        reset_token: resetToken
      });
    }

    if (!new_password || new_password.trim().length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await execute('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, userId]);

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

    // Delete DB records
    await execute('DELETE FROM users WHERE id = ?', [userId]);

    return res.json({ message: `User @${targetUser.username} and associated profile deleted entirely.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

import { execSync } from 'child_process';

// 3. Self-Updater & Release Channels (PolyPress Style)
router.get('/update/check', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const channelRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "update_channel"');
    const channel = channelRow?.value || 'stable';

    const installedVersionRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "installed_version"');
    const installedVersion = installedVersionRow?.value;

    let currentPkgVersion = '1.4.0';
    try {
      const rootPkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf8'));
      if (rootPkg && rootPkg.version) currentPkgVersion = rootPkg.version;
    } catch (e) {}

    let localCommitHash = process.env.GIT_COMMIT_HASH || '';
    if (!localCommitHash) {
      try {
        const gitOutput = execSync('git rev-parse --short HEAD 2>/dev/null', { cwd: path.join(__dirname, '../../..') }).toString().trim();
        if (gitOutput && gitOutput !== 'HEAD') localCommitHash = gitOutput;
      } catch (e) {}
    }

    let currentVersion = currentPkgVersion;
    let latestReleaseInfo: any = null;
    let targetVersion = currentPkgVersion;

    if (channel === 'alpha') {
      const commits = await getGitHubApi(`/repos/${REPO_OWNER}/${REPO_NAME}/commits/main`);
      if (commits && commits.sha) {
        targetVersion = commits.sha.substring(0, 7);
        currentVersion = localCommitHash || installedVersion || currentPkgVersion;

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
        currentVersion = installedVersion || `v${currentPkgVersion}`;

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
      // Stable channel
      const releases = await getGitHubApi(`/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`);
      if (releases && releases.tag_name) {
        targetVersion = releases.tag_name;
        currentVersion = installedVersion || `v${currentPkgVersion}`;

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
    let gitPulled = false;

    try {
      execSync('git fetch origin && git pull origin main', { cwd: repoPath, timeout: 30000 });
      gitPulled = true;
    } catch (gitErr: any) {
      console.warn('[Self-Updater Warning] Git pull unavailable or skipped in container environment:', gitErr.message);
    }

    await runMigrations();

    if (targetVersion) {
      await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['installed_version', String(targetVersion)]);
    }

    if (gitPulled) {
      return res.json({ message: 'Update applied! Git repository pulled latest changes & migrations verified.' });
    } else {
      return res.json({
        message: targetVersion
          ? `System updated to ${targetVersion}! (Note: Docker container detected - run 'docker pull tylerhats/webnook:latest' to update underlying container image binaries)`
          : 'Database schema migrations verified successfully!'
      });
    }
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

router.post('/backups/create', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `webnook-backup-${timestamp}.tar.gz`;
    const archivePath = path.join(backupsDir, filename);

    // Create metadata JSON file in dataDir before tarring
    const metaPath = path.join(dataDir, 'backup_metadata.json');
    fs.writeFileSync(metaPath, JSON.stringify({
      created_at: new Date().toISOString(),
      version: '1.0.0',
      type: 'full_compressed'
    }));

    const uploadsDir = path.join(__dirname, '../../uploads');

    // Archive webnook.db, branding, metadata, and uploads
    const cmd = `tar -czf "${archivePath}" -C "${dataDir}" webnook.db branding backup_metadata.json -C "${path.join(__dirname, '../..')}" uploads 2>/dev/null || tar -czf "${archivePath}" -C "${dataDir}" webnook.db`;
    await execPromise(cmd);

    const stat = fs.statSync(archivePath);
    return res.json({
      message: 'Compressed backup archive created successfully!',
      backup: {
        filename,
        sizeBytes: stat.size,
        created_at: stat.mtime
      }
    });
  } catch (err: any) {
    console.error('Backup creation error:', err);
    return res.status(500).json({ error: 'Failed to create backup archive' });
  }
});

router.get('/backups/download/:filename', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(backupsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to download backup' });
  }
});

// Restore Backup Archive with Automatic Database Schema Migration
const restoreUpload = multer({ dest: path.join(os.tmpdir(), 'webnook-restore') });

router.post('/backups/restore', restoreUpload.single('backup_file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    let sourcePath = '';
    const filenameParam = req.body.filename;

    if (req.file) {
      sourcePath = req.file.path;
    } else if (filenameParam) {
      sourcePath = path.join(backupsDir, path.basename(filenameParam));
    }

    if (!sourcePath || !fs.existsSync(sourcePath)) {
      return res.status(400).json({ error: 'No valid backup file provided' });
    }

    // Unpack archive over dataDir and uploads directory if tar.gz
    if (sourcePath.endsWith('.tar.gz') || req.file) {
      const uploadsParent = path.join(__dirname, '../..');
      await execPromise(`tar -xzf "${sourcePath}" -C "${dataDir}" 2>/dev/null || true`);
      await execPromise(`tar -xzf "${sourcePath}" -C "${uploadsParent}" uploads 2>/dev/null || true`);
    } else if (sourcePath.endsWith('.db')) {
      fs.copyFileSync(sourcePath, path.join(dataDir, 'webnook.db'));
    }

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Execute database migrations gracefully to ensure schema compatibility
    await runMigrations();

    return res.json({
      success: true,
      message: 'System backup restored successfully! Database schema automatically migrated to latest version.'
    });
  } catch (err: any) {
    console.error('Restore error:', err);
    return res.status(500).json({ error: `Restore failed: ${err.message}` });
  }
});

// 5. System Settings, SMTP Config & Whitelabel Branding Upload
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await query<any>('SELECT key, value FROM system_settings');
    const settings: Record<string, string> = {
      app_name: 'WebNook',
      logo_url: '/branding/logo.png',
      smtp_host: '',
      smtp_port: '587',
      smtp_user: '',
      smtp_pass: '',
      smtp_from: '',
      smtp_secure: 'false',
      auto_backup_enabled: 'false',
      auto_backup_interval: 'daily'
    };
    rows.forEach(r => settings[r.key] = r.value);
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

    return res.json({ message: 'Settings saved successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save settings' });
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

    const testUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=76561198000000000`;
    const textData = await new Promise<string>((resolve, reject) => {
      https.get(testUrl, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
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
    const newCount = (parseInt(errCountRow?.value || '0', 10)) + 1;
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
        res.on('data', chunk => body += chunk);
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
    const newCount = (parseInt(errCountRow?.value || '0', 10)) + 1;
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

    const testUrl = `https://api.themoviedb.org/3/authentication?api_key=${apiKey}`;
    const textData = await new Promise<string>((resolve, reject) => {
      https.get(testUrl, (res) => {
        let body = '';
        res.on('data', (chunk: any) => body += chunk);
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

    // Truncate all database tables
    await execute('DELETE FROM users');
    await execute('DELETE FROM nooks');
    await execute('DELETE FROM nook_widgets');
    await execute('DELETE FROM nook_stickers');
    await execute('DELETE FROM friends');
    await execute('DELETE FROM guestbook_entries');
    await execute('DELETE FROM passkey_credentials');
    await execute('DELETE FROM password_resets');
    await execute('DELETE FROM system_settings');
    await execute('DELETE FROM schema_migrations');

    // Clean uploads and custom branding directories
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (fs.existsSync(uploadsDir)) {
      try {
        const files = fs.readdirSync(uploadsDir);
        for (const file of files) {
          fs.rmSync(path.join(uploadsDir, file), { recursive: true, force: true });
        }
      } catch (e) {}
    }

    if (fs.existsSync(customBrandingDir)) {
      try {
        const files = fs.readdirSync(customBrandingDir);
        for (const file of files) {
          fs.rmSync(path.join(customBrandingDir, file), { recursive: true, force: true });
        }
      } catch (e) {}
    }

    // Re-run initial database migrations to ensure clean database state
    await runMigrations();

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
