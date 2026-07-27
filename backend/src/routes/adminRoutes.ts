import { Router, Request, Response } from 'express';
import os from 'os';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { execute, query, queryOne } from '../db/connection';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/authMiddleware';
import { runMigrations } from '../db/migrations';
import https from 'https';

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

// 1. System Performance & Statistics
router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const userCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users');
    const nookCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM nooks');
    const dbVersionRow = await queryOne<{ max_version: number }>('SELECT MAX(version) as max_version FROM schema_migrations');

    let dbSizeBytes = 0;
    try {
      const stats = fs.statSync(path.join(dataDir, 'webnook.db'));
      dbSizeBytes = stats.size;
    } catch (e) {
      // ignore
    }

    return res.json({
      system: {
        platform: os.platform(),
        arch: os.arch(),
        uptimeSeconds: Math.floor(os.uptime()),
        cpuCount: os.cpus().length,
        totalMemoryBytes: totalMem,
        usedMemoryBytes: usedMem,
        memoryUsagePercent: Math.round((usedMem / totalMem) * 100)
      },
      stats: {
        totalUsers: userCount?.count || 0,
        totalNooks: nookCount?.count || 0,
        dbVersion: dbVersionRow?.max_version || 1,
        dbSizeBytes
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch system metrics' });
  }
});

// 2. User Management
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await query<any>('SELECT id, username, email, display_name, role, is_totp_enabled, created_at FROM users ORDER BY id ASC');
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

// 3. Self-Updater & Release Channels (PolyPress Style)
router.get('/update/check', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const channelRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "update_channel"');
    const channel = channelRow?.value || 'stable';

    const currentVersion = '1.0.0';
    let latestReleaseInfo: any = null;

    if (channel === 'stable') {
      const releases = await getGitHubApi(`/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`);
      if (releases && releases.tag_name) {
        latestReleaseInfo = {
          tag: releases.tag_name,
          name: releases.name || releases.tag_name,
          notes: releases.body || 'Latest stable release',
          published_at: releases.published_at
        };
      }
    } else if (channel === 'beta') {
      const releases = await getGitHubApi(`/repos/${REPO_OWNER}/${REPO_NAME}/releases`);
      if (Array.isArray(releases) && releases.length > 0) {
        const beta = releases[0];
        latestReleaseInfo = {
          tag: beta.tag_name,
          name: beta.name || beta.tag_name,
          notes: beta.body || 'Beta channel release',
          published_at: beta.published_at
        };
      }
    } else if (channel === 'alpha') {
      const commits = await getGitHubApi(`/repos/${REPO_OWNER}/${REPO_NAME}/commits/main`);
      if (commits && commits.sha) {
        latestReleaseInfo = {
          tag: `alpha-${commits.sha.substring(0, 7)}`,
          name: `Alpha Commit: ${commits.commit.message.split('\n')[0]}`,
          notes: commits.commit.message,
          published_at: commits.commit.committer.date
        };
      }
    }

    return res.json({
      currentVersion,
      channel,
      updateAvailable: latestReleaseInfo ? true : false,
      latestRelease: latestReleaseInfo || { tag: 'v1.0.0', name: 'WebNook v1.0.0', notes: 'You are running the latest version.' }
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
    await runMigrations();
    return res.json({
      success: true,
      message: 'System update completed! Database schema migrated to latest version.'
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Update failed: ${err.message}` });
  }
});

// 4. Backup & Restore System
router.get('/backup/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dbPath = path.join(dataDir, 'webnook.db');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=webnook-backup-${Date.now()}.db`);
    
    const fileStream = fs.createReadStream(dbPath);
    fileStream.pipe(res);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to export backup' });
  }
});

// 5. System Settings & Whitelabel Branding Upload
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await query<any>('SELECT key, value FROM system_settings');
    const settings: Record<string, string> = {
      app_name: 'WebNook',
      logo_url: '/branding/logo.png'
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

export default router;
