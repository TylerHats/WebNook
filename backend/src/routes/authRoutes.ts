import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { execute, queryOne } from '../db/connection';
import { JWT_SECRET, authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';
import { authenticator } from 'otplib';

const router = Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, display_name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 alphanumeric characters long' });
    }

    // Check if username or email already exists
    const existingUser = await queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [cleanUsername, email.toLowerCase()]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or Email is already taken' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    
    // Check if this is the first user (make first user admin)
    const userCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users');
    const role = (userCount && userCount.count === 0) ? 'admin' : 'user';

    const result = await execute(
      'INSERT INTO users (username, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)',
      [cleanUsername, email.toLowerCase(), password_hash, display_name || cleanUsername, role]
    );

    const userId = result.lastID;

    // Create default Nook profile for user
    await execute('INSERT INTO nooks (user_id, theme) VALUES (?, ?)', [userId, 'glassmorphism']);

    // Insert default widgets (Bio, Top Friends, Spotify, Steam, Guestbook)
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

    const token = jwt.sign(
      { id: userId, username: cleanUsername, email: email.toLowerCase(), role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Account registered successfully',
      token,
      user: {
        id: userId,
        username: cleanUsername,
        email: email.toLowerCase(),
        display_name: display_name || cleanUsername,
        role
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to register account' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { usernameOrEmail, password, totp_code } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Username/Email and Password are required' });
    }

    const input = usernameOrEmail.trim().toLowerCase();
    const user = await queryOne<any>(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [input, input]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check TOTP if enabled
    if (user.is_totp_enabled) {
      if (!totp_code) {
        return res.status(200).json({
          requires_mfa: true,
          mfa_type: 'totp',
          message: 'TOTP 2FA token required'
        });
      }

      const isValidTotp = authenticator.check(totp_code, user.totp_secret);
      if (!isValidTotp) {
        return res.status(401).json({ error: 'Invalid 2FA authentication code' });
      }
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        bio: user.bio,
        avatar_url: user.avatar_url,
        banner_url: user.banner_url,
        status_message: user.status_message,
        status_emoji: user.status_emoji,
        role: user.role,
        is_totp_enabled: !!user.is_totp_enabled
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to login' });
  }
});

// Get Current Logged In User
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await queryOne<any>(
      'SELECT id, username, email, display_name, bio, avatar_url, banner_url, status_message, status_emoji, role, is_totp_enabled, privacy_default, created_at FROM users WHERE id = ?',
      [req.user!.id]
    );

    if (!user) {
      return res.status(440).json({ error: 'User not found' });
    }

    return res.json({ user: { ...user, is_totp_enabled: !!user.is_totp_enabled } });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Forgot Password / Password Reset Request
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await queryOne<any>('SELECT id, username FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!user) {
      // Don't leak user existence
      return res.json({ message: 'If an account exists with that email, a password reset token has been issued.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    await execute(
      'INSERT OR REPLACE INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)',
      [resetToken, user.id, expiresAt]
    );

    return res.json({
      message: 'Password reset token generated.',
      reset_token: resetToken // In self-hosted environments without SMTP configured, returns token directly for admin/local use
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to process password reset' });
  }
});

// Reset Password confirmation
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { reset_token, new_password } = req.body;
    if (!reset_token || !new_password) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    const resetRecord = await queryOne<any>(
      'SELECT * FROM password_resets WHERE token = ? AND expires_at > ?',
      [reset_token, new Date().toISOString()]
    );

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await execute('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, resetRecord.user_id]);
    await execute('DELETE FROM password_resets WHERE token = ?', [reset_token]);

    return res.json({ message: 'Password reset successfully. You may now login.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
