import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { execute, queryOne } from '../db/connection';
import { JWT_SECRET } from '../middleware/authMiddleware';
import { validatePasswordComplexity } from './authRoutes';
import { getCurrentLegalVersion, invalidateLegalCache } from '../services/legalService';

const router = Router();

// Check if OOBE setup is required
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users');
    const setupCompletedRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "setup_completed"');

    const setupCompleted = setupCompletedRow?.value === 'true' && (userCount?.count || 0) > 0;

    return res.json({
      setup_completed: setupCompleted,
      user_count: userCount?.count || 0
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to check setup status' });
  }
});

// Run Initial OOBE Setup Wizard
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    const userCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users');
    const setupCompletedRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "setup_completed"');

    if (setupCompletedRow?.value === 'true' && (userCount?.count || 0) > 0) {
      return res.status(400).json({ error: 'Setup wizard has already been completed.' });
    }

    const {
      app_name,
      admin_username,
      admin_email,
      admin_password,
      admin_display_name,
      steam_api_key,
      site_url,
      legal_operator_name,
      legal_contact_email
    } = req.body;

    if (!admin_username || !admin_email || !admin_password) {
      return res.status(400).json({ error: 'Admin username, email, and password are required' });
    }

    const cleanUsername = admin_username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Admin username must be at least 3 characters long' });
    }

    const pwdError = await validatePasswordComplexity(admin_password);
    if (pwdError) {
      return res.status(400).json({ error: pwdError });
    }

    const password_hash = await bcrypt.hash(admin_password, 10);
    const cleanEmail = admin_email.trim().toLowerCase();
    const currentLegalVersion = await getCurrentLegalVersion();

    // Create Admin User (auto-verified, onboarding completed, current terms accepted)
    const result = await execute(
      'INSERT INTO users (username, email, password_hash, display_name, role, is_email_verified, onboarding_completed, terms_accepted_version, terms_accepted_at) VALUES (?, ?, ?, ?, ?, 1, 1, ?, CURRENT_TIMESTAMP)',
      [cleanUsername, cleanEmail, password_hash, admin_display_name || cleanUsername, 'admin', currentLegalVersion]
    );

    const userId = result.lastID;

    // Create Default Nook & Widgets for Admin
    await execute('INSERT INTO nooks (user_id, theme) VALUES (?, ?)', [userId, 'glassmorphism']);
    const defaultWidgets = [
      { type: 'bio', title: 'About Me', col: 'left', pos: 1 },
      { type: 'music_player', title: 'Nook Playlist', col: 'left', pos: 2 },
      { type: 'top_friends', title: 'Top Friends Grid', col: 'right', pos: 1 },
      { type: 'spotify', title: 'Spotify Showcase', col: 'right', pos: 2 },
      { type: 'steam', title: 'Steam Gaming', col: 'right', pos: 3 },
      { type: 'guestbook', title: 'Nook Guestbook', col: 'full', pos: 4 }
    ];
    for (const w of defaultWidgets) {
      await execute(
        'INSERT INTO nook_widgets (user_id, widget_type, title, column_name, position_order) VALUES (?, ?, ?, ?, ?)',
        [userId, w.type, w.title, w.col, w.pos]
      );
    }

    // Save System Settings & Whitelabel Config
    await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['app_name', app_name || 'WebNook']);
    await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['setup_completed', 'true']);
    if (steam_api_key) {
      await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['steam_api_key', steam_api_key]);
    }
    if (site_url) {
      await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['site_url', String(site_url).trim()]);
    }
    if (legal_operator_name) {
      await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['legal_operator_name', String(legal_operator_name).trim()]);
    }
    if (legal_contact_email) {
      await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['legal_contact_email', String(legal_contact_email).trim()]);
    }
    invalidateLegalCache();

    const token = jwt.sign(
      { id: userId, username: cleanUsername, email: cleanEmail, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || '').split(',')[0].trim().toLowerCase();
    res.cookie('token', token, {
      maxAge: 7 * 86400 * 1000,
      sameSite: 'lax',
      path: '/',
      secure: req.secure || proto === 'https'
    });

    return res.json({
      message: 'OOBE Setup completed successfully!',
      token,
      user: {
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        display_name: admin_display_name || cleanUsername,
        role: 'admin',
        is_email_verified: true,
        onboarding_completed: true,
        terms_accepted_version: currentLegalVersion,
        required_terms_version: currentLegalVersion,
        requires_terms_acceptance: false
      }
    });
  } catch (err: any) {
    console.error('OOBE setup error:', err);
    return res.status(500).json({ error: 'Failed to complete setup wizard' });
  }
});

export default router;
