import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { runMigrations } from './db/migrations';
import { queryOne, execute } from './db/connection';
import authRoutes from './routes/authRoutes';
import mfaRoutes from './routes/mfaRoutes';
import nookRoutes from './routes/nookRoutes';
import socialRoutes from './routes/socialRoutes';
import integrationRoutes from './routes/integrationRoutes';
import adminRoutes from './routes/adminRoutes';
import setupRoutes from './routes/setupRoutes';

const app = express();
const PORT = process.env.PORT || 4000;

// Enable reverse proxy SSL termination & protocol detection
app.set('trust proxy', 1);

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Anti-Caching Middleware across ALL requests (HTML, JS, CSS, Assets, API)
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, post-check=0, pre-check=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware/authMiddleware';

const parseCookies = (cookieHeader?: string): Record<string, string> => {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim());
    }
  });
  return cookies;
};

// Static Asset Directories
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Privacy-Aware Media Handler for User Uploads (/uploads/:filename)
app.get('/uploads/:filename', async (req, res) => {
  try {
    const rawFilename = path.basename(req.params.filename);
    const filename = rawFilename.split('?')[0];
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    const cookies = parseCookies(req.headers.cookie);
    let token = req.headers.authorization?.split(' ')[1] || cookies.token || (req.query.token as string);
    let requestingUser: any = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        requestingUser = await queryOne('SELECT id, username, role FROM users WHERE id = ?', [decoded.id]);
      } catch (e) {}
    }

    // 1. Group Chat Icon Handling (/uploads/group_*)
    if (filename.startsWith('group_')) {
      if (!requestingUser) {
        return res.status(403).send('Access denied: Group chat media requires authentication');
      }
      const groupConv = await queryOne<any>(
        `SELECT id FROM conversations WHERE type = 'group' AND avatar_url LIKE ?`,
        [`%${filename}%`]
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
      return res.sendFile(filePath);
    }

    // 2. Check if file belongs to a User Nook Profile (avatar, banner, bg_music, sticker, guestbook)
    const ownerUser = await queryOne<any>(
      `SELECT u.id, u.username, u.role, u.avatar_url, u.avatar_original_url, n.visibility_nook 
       FROM users u 
       LEFT JOIN nooks n ON n.user_id = u.id 
       WHERE u.avatar_url LIKE ? OR u.banner_url LIKE ? OR u.avatar_original_url LIKE ? OR u.banner_original_url LIKE ?`,
      [`%${filename}%`, `%${filename}%`, `%${filename}%`, `%${filename}%`]
    );

    // Profile Avatars (avatar_*) are public user profile pictures and MUST always be viewable by everyone!
    const isAvatar = filename.startsWith('avatar_') || (ownerUser && (ownerUser.avatar_url?.includes(filename) || ownerUser.avatar_original_url?.includes(filename)));

    if (isAvatar) {
      return res.sendFile(filePath);
    }

    // If non-avatar file belongs to a user whose Nook is private
    if (ownerUser && ownerUser.visibility_nook === 'private') {
      if (!requestingUser) {
        return res.status(403).send('Access denied: This file belongs to a private Nook');
      }

      const isOwner = requestingUser.id === ownerUser.id;
      const isAdmin = requestingUser.role === 'admin';

      if (!isOwner && !isAdmin) {
        // Check for accepted OR pending friend relationship (both requestor & requestee)
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

    // Fallback: serve authorized or public file
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
  const fileInCustom = path.join(customBrandingDir, req.path);
  if (fs.existsSync(fileInCustom) && fs.statSync(fileInCustom).isFile()) {
    return res.sendFile(fileInCustom);
  }
  const fileInDefault = path.join(defaultBrandingDir, req.path);
  if (fs.existsSync(fileInDefault) && fs.statSync(fileInDefault).isFile()) {
    return res.sendFile(fileInDefault);
  }
  next();
});

import notificationRoutes from './routes/notificationRoutes';
import friendRoutes from './routes/friendRoutes';
import messageRoutes from './routes/messageRoutes';
import themeRoutes from './routes/themeRoutes';

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
          type: "image/png",
          sizes: "192x192",
          purpose: "any maskable"
        },
        {
          src: logoUrl,
          type: "image/png",
          sizes: "512x512",
          purpose: "any maskable"
        }
      ],
      start_url: "/",
      background_color: "#12131C",
      theme_color: "#6366f1",
      display: "standalone",
      orientation: "portrait"
    });
  } catch (err) {
    return res.json({
      short_name: "WebNook",
      name: "WebNook Social",
      icons: [
        { src: "/branding/logo.png", type: "image/png", sizes: "192x192", purpose: "any maskable" },
        { src: "/branding/logo.png", type: "image/png", sizes: "512x512", purpose: "any maskable" }
      ],
      start_url: "/",
      display: "standalone"
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

// Serve Frontend Static Files in production if built (Enforcing 100% fresh network fetches)
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use('/assets', express.static(path.join(frontendDist, 'assets'), {
    etag: false,
    lastModified: false,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
  }));
  app.use(express.static(frontendDist, {
    etag: false,
    lastModified: false,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
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

// Start Server
import { initBackupScheduler } from './services/backupScheduler';

async function startServer() {
  try {
    console.log('Initializing WebNook database migrations...');
    await runMigrations();

    // Initialize automated scheduled backup daemon
    initBackupScheduler();

    // Auto-sync DB installed_version with current package.json version on container boot
    try {
      const rootPkgPath = path.join(__dirname, '../../package.json');
      if (fs.existsSync(rootPkgPath)) {
        const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
        if (rootPkg && rootPkg.version) {
          await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['installed_version', `v${rootPkg.version}`]);
        }
      }
    } catch (e) {}

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
