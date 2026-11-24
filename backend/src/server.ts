import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import jwt from 'jsonwebtoken';
import { runMigrations } from './db/migrations';
import { queryOne, execute } from './db/connection';
import { JWT_SECRET } from './middleware/authMiddleware';
import { parseCookies, safePathInside } from './utils/security';
import { initBackupScheduler } from './services/backupScheduler';

import authRoutes from './routes/authRoutes';
import mfaRoutes from './routes/mfaRoutes';
import nookRoutes from './routes/nookRoutes';
import socialRoutes from './routes/socialRoutes';
import integrationRoutes from './routes/integrationRoutes';
import adminRoutes from './routes/adminRoutes';
import setupRoutes from './routes/setupRoutes';
import notificationRoutes from './routes/notificationRoutes';
import friendRoutes from './routes/friendRoutes';
import messageRoutes from './routes/messageRoutes';
import themeRoutes from './routes/themeRoutes';
import legalRoutes from './routes/legalRoutes';

const app = express();
const PORT = process.env.PORT || 4000;

// Enable reverse proxy SSL termination & protocol detection
app.set('trust proxy', 1);

// Origin-aware CORS middleware (same-origin, configured ORIGIN/site_url, and local dev)
app.use(async (req, res, next) => {
  const reqHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const reqProto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const sameOrigin = reqHost ? `${reqProto}://${reqHost}` : '';

  let configuredSiteOrigin = '';
  try {
    const row = await queryOne<{ value: string }>('SELECT value FROM system_settings WHERE key = "site_url"');
    if (row?.value) {
      configuredSiteOrigin = new URL(row.value).origin;
    }
  } catch {}

  let envOrigin = '';
  if (process.env.ORIGIN) {
    try {
      envOrigin = new URL(process.env.ORIGIN).origin;
    } catch {}
  }

  return cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      let originHost = '';
      try {
        originHost = new URL(origin).host;
      } catch {}
      if (
        origin === sameOrigin ||
        (reqHost && originHost && originHost === reqHost) ||
        (configuredSiteOrigin && origin === configuredSiteOrigin) ||
        (envOrigin && origin === envOrigin) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true
  })(req, res, next);
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Security Headers & Route-Appropriate Cache Policies
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
});

const AUDIO_CONTENT_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.webm': 'audio/webm'
};

// Static Asset Directories
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Privacy-Aware Media Handler for User Uploads (/uploads/:filename)
app.get('/uploads/:filename', async (req, res) => {
  try {
    const rawFilename = path.basename(req.params.filename || '').split('?')[0];
    const filePath = safePathInside(uploadsDir, rawFilename);

    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return res.status(404).send('File not found');
    }

    const cookies = parseCookies(req.headers.cookie);
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined) || cookies.token;
    let requestingUser: any = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const user = await queryOne<any>('SELECT id, username, role, is_disabled FROM users WHERE id = ?', [decoded.id]);
        if (user && !user.is_disabled) {
          requestingUser = user;
        }
      } catch {}
    }

    // 1. Group Chat Icon Handling (/uploads/group_*)
    if (rawFilename.startsWith('group_')) {
      if (!requestingUser) {
        return res.status(403).send('Access denied: Group chat media requires authentication');
      }
      const groupConv = await queryOne<any>(
        `SELECT id FROM conversations WHERE type = 'group' AND avatar_url LIKE ?`,
        [`%${rawFilename}%`]
      );
      if (groupConv) {
        const member = await queryOne(
          `SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?`,
          [groupConv.id, requestingUser.id]
        );
        if (!member && requestingUser.role !== 'admin') {
          return res.status(403).send('Access denied: You are not a member of this group chat');
        }
      }
    } else {
      // 2. Check ownership across users, nooks (audio/playlists/cards), and stickers
      const likePattern = `%${rawFilename}%`;
      const ownerUser = await queryOne<any>(
        `SELECT u.id, u.username, u.role, u.avatar_url, u.avatar_original_url, u.is_disabled, n.visibility_nook
         FROM users u
         LEFT JOIN nooks n ON n.user_id = u.id
         LEFT JOIN nook_stickers ns ON ns.user_id = u.id
         WHERE u.avatar_url LIKE ?
            OR u.banner_url LIKE ?
            OR u.avatar_original_url LIKE ?
            OR u.banner_original_url LIKE ?
            OR n.bg_music_url LIKE ?
            OR n.music_tracks_json LIKE ?
            OR n.card_layout_json LIKE ?
            OR ns.sticker_url LIKE ?
         LIMIT 1`,
        [likePattern, likePattern, likePattern, likePattern, likePattern, likePattern, likePattern, likePattern]
      );

      // Profile Avatars (avatar_*) remain publicly viewable across directory/auth views
      const isAvatar = rawFilename.startsWith('avatar_') ||
        (ownerUser && (ownerUser.avatar_url?.includes(rawFilename) || ownerUser.avatar_original_url?.includes(rawFilename)));

      if (!isAvatar && ownerUser) {
        if (ownerUser.is_disabled && (!requestingUser || requestingUser.role !== 'admin')) {
          return res.status(403).send('Access denied: Account is disabled');
        }

        if (ownerUser.visibility_nook === 'private' || ownerUser.visibility_nook === 'friends') {
          if (!requestingUser) {
            return res.status(403).send('Access denied: This file belongs to a private Nook');
          }

          const isOwner = requestingUser.id === ownerUser.id;
          const isAdmin = requestingUser.role === 'admin';

          if (!isOwner && !isAdmin) {
            const friendRow = await queryOne(
              `SELECT id FROM friends 
               WHERE status IN ('accepted', 'pending') 
               AND ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))`,
              [requestingUser.id, ownerUser.id, ownerUser.id, requestingUser.id]
            );

            if (!friendRow) {
              return res.status(403).send('Access denied: This file belongs to a private Nook');
            }
          }
        }
      }
    }

    // Safe headers + private cache enabling reliable HTML5 <audio> Range streaming
    const ext = path.extname(rawFilename).toLowerCase();
    if (AUDIO_CONTENT_TYPES[ext]) {
      res.setHeader('Content-Type', AUDIO_CONTENT_TYPES[ext]);
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; media-src 'self'; img-src 'self'; sandbox");
    res.setHeader('Cache-Control', 'private, max-age=3600');

    return res.sendFile(filePath);
  } catch (err) {
    return res.status(500).send('Error serving media file');
  }
});

// Whitelabel Branding Directory (Check persistent user data dir first, fallback to shipped default)
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
const customBrandingDir = path.join(dataDir, 'branding');
const defaultBrandingDir = path.join(__dirname, '../branding');

if (!fs.existsSync(customBrandingDir)) {
  fs.mkdirSync(customBrandingDir, { recursive: true });
}
if (!fs.existsSync(defaultBrandingDir)) {
  fs.mkdirSync(defaultBrandingDir, { recursive: true });
}

app.use('/branding', (req, res, next) => {
  const fileInCustom = safePathInside(customBrandingDir, req.path);
  if (fileInCustom && fs.existsSync(fileInCustom) && fs.statSync(fileInCustom).isFile()) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.sendFile(fileInCustom);
  }
  const fileInDefault = safePathInside(defaultBrandingDir, req.path);
  if (fileInDefault && fs.existsSync(fileInDefault) && fs.statSync(fileInDefault).isFile()) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.sendFile(fileInDefault);
  }
  next();
});

// API Routes
app.use('/api/setup', setupRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/nook', nookRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/themes', themeRoutes);
app.use('/api/legal', legalRoutes);

// Public Branding Configuration Endpoint
app.get('/api/branding/public', async (req, res) => {
  try {
    const appNameRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "app_name"');
    const logoUrlRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "logo_url"');

    return res.json({
      app_name: appNameRow?.value || 'WebNook',
      logo_url: logoUrlRow?.value || '/branding/logo.png'
    });
  } catch (err) {
    return res.json({ app_name: 'WebNook', logo_url: '/branding/logo.png' });
  }
});

// Dynamic Whitelabeled Web App Manifest for Mobile PWA Installation
app.get(['/manifest.json', '/api/manifest.json'], async (req, res) => {
  try {
    const appNameRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "app_name"');
    const logoUrlRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "logo_url"');

    const appName = appNameRow?.value || 'WebNook';
    const logoUrl = logoUrlRow?.value || '/branding/logo.png';

    res.setHeader('Content-Type', 'application/json');
    return res.json({
      short_name: appName,
      name: `${appName} Social Platform`,
      icons: [
        {
          src: logoUrl,
          type: 'image/png',
          sizes: '192x192',
          purpose: 'any maskable'
        },
        {
          src: logoUrl,
          type: 'image/png',
          sizes: '512x512',
          purpose: 'any maskable'
        }
      ],
      start_url: '/',
      background_color: '#12131C',
      theme_color: '#6366f1',
      display: 'standalone',
      orientation: 'portrait'
    });
  } catch (err) {
    return res.json({
      short_name: 'WebNook',
      name: 'WebNook Social',
      icons: [
        { src: '/branding/logo.png', type: 'image/png', sizes: '192x192', purpose: 'any maskable' },
        { src: '/branding/logo.png', type: 'image/png', sizes: '512x512', purpose: 'any maskable' }
      ],
      start_url: '/',
      display: 'standalone'
    });
  }
});

// Health Check with Reverse Proxy & Protocol Diagnostic Info
app.get('/api/health', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;

  res.json({
    status: 'ok',
    service: 'WebNook Backend API',
    detectedProtocol: protocol,
    detectedHost: host,
    isBehindProxy: req.headers['x-forwarded-proto'] ? true : false,
    timestamp: new Date()
  });
});

// Serve Frontend Static Files in production if built
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  // Content-hashed Vite JS/CSS bundles can safely be cached long-term
  app.use('/assets', express.static(path.join(frontendDist, 'assets'), {
    etag: true,
    lastModified: true,
    maxAge: '365d',
    immutable: true
  }));
  app.use(express.static(frontendDist, {
    etag: true,
    lastModified: true,
    setHeaders: (res, servedPath) => {
      if (servedPath.endsWith('.html') || servedPath.endsWith('sw.js')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    }
  }));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/branding') && !req.path.startsWith('/assets')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      res.sendFile(path.join(frontendDist, 'index.html'));
    } else {
      res.status(404).send('Asset not found');
    }
  });
}

// Structured JSON error handler (handles Multer upload limit & fileFilter errors cleanly)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Uploaded file exceeds the maximum allowed size limit.' });
  }
  if (err.name === 'MulterError' || err.message) {
    return res.status(400).json({ error: err.message || 'Invalid upload request' });
  }
  return res.status(500).json({ error: 'Internal server error' });
});

// Start Server
async function startServer() {
  try {
    console.log('Initializing WebNook database migrations...');
    await runMigrations();

    initBackupScheduler();

    try {
      const rootPkgPath = path.join(__dirname, '../../package.json');
      if (fs.existsSync(rootPkgPath)) {
        const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
        if (rootPkg && rootPkg.version) {
          await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['installed_version', `v${rootPkg.version}`]);
        }
      }
    } catch {}

    const certPath = process.env.SSL_CERT || path.join(dataDir, 'cert.pem');
    const keyPath = process.env.SSL_KEY || path.join(dataDir, 'key.pem');

    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      const httpsOptions = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
      };
      https.createServer(httpsOptions, app).listen(PORT, () => {
        console.log(`====================================================`);
        console.log(` 🔒 WebNook Native HTTPS Server running on port ${PORT}`);
        console.log(`====================================================`);
      });
    } else {
      http.createServer(app).listen(PORT, () => {
        console.log(`====================================================`);
        console.log(` 🚀 WebNook HTTP Server running on port ${PORT}`);
        console.log(` Reverse Proxy SSL Detection Enabled ('trust proxy')`);
        console.log(` API Endpoint: http://localhost:${PORT}/api`);
        console.log(`====================================================`);
      });
    }
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
