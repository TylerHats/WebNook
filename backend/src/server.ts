import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { runMigrations } from './db/migrations';
import { queryOne } from './db/connection';
import authRoutes from './routes/authRoutes';
import mfaRoutes from './routes/mfaRoutes';
import nookRoutes from './routes/nookRoutes';
import socialRoutes from './routes/socialRoutes';
import integrationRoutes from './routes/integrationRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Asset Directories
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Whitelabel Branding Directory (Check persistent user data dir first, fallback to shipped default)
const customBrandingDir = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'branding') : path.join(__dirname, '../data/branding');
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/nook', nookRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/admin', adminRoutes);

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

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'WebNook Backend API', timestamp: new Date() });
});

// Serve Frontend Static Files in production if built
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/branding')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

// Start Server
async function startServer() {
  try {
    console.log('Initializing WebNook database migrations...');
    await runMigrations();
    
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` WebNook Server running on port ${PORT}`);
      console.log(` API Endpoint: http://localhost:${PORT}/api`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
