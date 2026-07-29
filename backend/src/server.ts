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

// Anti-Caching Middleware for API Endpoints
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, post-check=0, pre-check=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Static Asset Directories
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

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
          sizes: "192x192 512x512"
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
      icons: [{ src: "/branding/logo.png", type: "image/png", sizes: "192x192" }],
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

// Serve Frontend Static Files in production if built
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use('/assets', express.static(path.join(frontendDist, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(frontendDist, {
    setHeaders: (res, filePath) => {
      const baseName = path.basename(filePath);
      if (baseName === 'index.html' || baseName === 'sw.js') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/branding') && !req.path.startsWith('/assets')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
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
