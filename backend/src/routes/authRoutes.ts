import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { execute, query, queryOne } from '../db/connection';
import { JWT_SECRET, authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';
import { authenticator } from 'otplib';
import { sendEmailVerificationEmail, sendPasswordResetEmail, getSmtpSettings } from '../services/emailService';
import { createRateLimiter, getEffectiveBaseUrl } from '../utils/security';
import { getCurrentLegalVersion } from '../services/legalService';

const router = Router();

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many login attempts. Please wait a few minutes before trying again.'
});

const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: 'Too many registration attempts from this IP. Please try again later.'
});

const resetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many password reset requests. Please try again later.'
});

function isHttpsRequest(req: Request): boolean {
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  return req.secure || proto === 'https';
}

export async function getPasswordRequirements() {
  const rows = await query<any>('SELECT key, value FROM system_settings WHERE key LIKE "pwd_%"');
  const settings: Record<string, string> = {
    pwd_min_length: '8',
    pwd_require_uppercase: 'true',
    pwd_require_lowercase: 'true',
    pwd_require_number: 'true',
    pwd_require_special: 'false'
  };
  rows.forEach(r => (settings[r.key] = r.value));
  return {
    minLength: parseInt(settings.pwd_min_length, 10) || 8,
    requireUppercase: settings.pwd_require_uppercase === 'true',
    requireLowercase: settings.pwd_require_lowercase === 'true',
    requireNumber: settings.pwd_require_number === 'true',
    requireSpecial: settings.pwd_require_special === 'true'
  };
}

export async function validatePasswordComplexity(password: string): Promise<string | null> {
  const rules = await getPasswordRequirements();
  if (password.length < rules.minLength) {
    return `Password must be at least ${rules.minLength} characters long`;
  }
  if (rules.requireUppercase && !/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter (A-Z)';
  }
  if (rules.requireLowercase && !/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter (a-z)';
  }
  if (rules.requireNumber && !/[0-9]/.test(password)) {
    return 'Password must contain at least one number (0-9)';
  }
  if (rules.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one special character';
  }
  return null;
}

// Get Password Requirements Endpoint
router.get('/password-requirements', async (req: Request, res: Response) => {
  try {
    const requirements = await getPasswordRequirements();
    return res.json({ requirements });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch password requirements' });
  }
});

// Register new user
router.post('/register', registerLimiter, async (req: Request, res: Response) => {
  try {
    const { username, email, password, display_name, accepted_terms, accepted_terms_version } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const currentLegalVersion = await getCurrentLegalVersion();
    if (accepted_terms !== true) {
      return res.status(400).json({
        error: 'You must read and accept the Terms & Conditions and Privacy Policy to create an account.'
      });
    }
    if (accepted_terms_version && String(accepted_terms_version).trim() !== currentLegalVersion) {
      return res.status(400).json({
        error: 'The site policies have been updated. Please refresh and accept the current Terms & Conditions and Privacy Policy.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const pwdError = await validatePasswordComplexity(password);
    if (pwdError) {
      return res.status(400).json({ error: pwdError });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 alphanumeric characters long' });
    }

    // Check if username or email already exists
    const existingUser = await queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [cleanUsername, cleanEmail]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or Email is already taken' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // Check if this is the first user (make first user admin & auto-verify)
    const userCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users');
    const isFirstUser = !userCount || userCount.count === 0;
    const role = isFirstUser ? 'admin' : 'user';
    const isEmailVerified = isFirstUser ? 1 : 0;
    const onboardingCompleted = isFirstUser ? 1 : 0;

    const result = await execute(
      'INSERT INTO users (username, email, password_hash, display_name, role, is_email_verified, onboarding_completed, terms_accepted_version, terms_accepted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [cleanUsername, cleanEmail, password_hash, display_name || cleanUsername, role, isEmailVerified, onboardingCompleted, currentLegalVersion]
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

    // Send Verification Email if not pre-verified admin
    if (!isEmailVerified) {
      const verifyToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 86400000).toISOString(); // 24 hours
      await execute('INSERT INTO email_verifications (token, user_id, expires_at) VALUES (?, ?, ?)', [
        verifyToken,
        userId,
        expiresAt
      ]);

      const baseUrl = await getEffectiveBaseUrl(req);
      sendEmailVerificationEmail(cleanEmail, cleanUsername, verifyToken, baseUrl);
    }

    const token = jwt.sign(
      { id: userId, username: cleanUsername, email: cleanEmail, role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      maxAge: 7 * 86400 * 1000,
      sameSite: 'lax',
      path: '/',
      secure: isHttpsRequest(req)
    });

    return res.json({
      message: isEmailVerified ? 'Account registered successfully' : 'Account registered! Please check your email to verify your address.',
      token,
      user: {
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        display_name: display_name || cleanUsername,
        role,
        is_email_verified: !!isEmailVerified,
        onboarding_completed: !!onboardingCompleted,
        terms_accepted_version: currentLegalVersion,
        required_terms_version: currentLegalVersion,
        requires_terms_acceptance: false
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to register account' });
  }
});

// Login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
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

    if (user.is_disabled) {
      const reasonMsg = user.disabled_reason ? `: ${user.disabled_reason}` : '.';
      return res.status(403).json({ error: `Your account has been disabled${reasonMsg}` });
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

    const currentLegalVersion = await getCurrentLegalVersion();
    const acceptedVersion = (user.terms_accepted_version || '').trim();
    const requiresTermsAcceptance = acceptedVersion !== currentLegalVersion;

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      maxAge: 7 * 86400 * 1000,
      sameSite: 'lax',
      path: '/',
      secure: isHttpsRequest(req)
    });

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
        is_totp_enabled: !!user.is_totp_enabled,
        is_email_verified: !!user.is_email_verified,
        onboarding_completed: !!user.onboarding_completed,
        terms_accepted_version: acceptedVersion,
        required_terms_version: currentLegalVersion,
        requires_terms_acceptance: requiresTermsAcceptance
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
      'SELECT id, username, email, display_name, bio, avatar_url, banner_url, avatar_original_url, banner_original_url, status_message, status_emoji, role, is_totp_enabled, is_email_verified, onboarding_completed, privacy_default, notify_email_guestbook, notify_email_friends, notify_email_system, notify_email_messages, reaction_picker_json, default_reaction, terms_accepted_version, terms_accepted_at, created_at FROM users WHERE id = ?',
      [req.user!.id]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const currentLegalVersion = await getCurrentLegalVersion();
    const acceptedVersion = (user.terms_accepted_version || '').trim();
    const requiresTermsAcceptance = acceptedVersion !== currentLegalVersion;

    return res.json({
      user: {
        ...user,
        is_totp_enabled: !!user.is_totp_enabled,
        is_email_verified: !!user.is_email_verified,
        onboarding_completed: !!user.onboarding_completed,
        terms_accepted_version: acceptedVersion,
        required_terms_version: currentLegalVersion,
        requires_terms_acceptance: requiresTermsAcceptance
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Accept current Terms & Conditions and Privacy Policy
router.post('/accept-terms', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { accepted, version } = req.body;
    if (accepted !== true) {
      return res.status(400).json({ error: 'You must confirm acceptance of the Terms & Conditions and Privacy Policy.' });
    }

    const currentLegalVersion = await getCurrentLegalVersion();
    if (version && String(version).trim() !== currentLegalVersion) {
      return res.status(409).json({
        error: 'A newer version of the Terms & Conditions / Privacy Policy has been published. Please review and accept the latest version.',
        required_terms_version: currentLegalVersion
      });
    }

    await execute(
      'UPDATE users SET terms_accepted_version = ?, terms_accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [currentLegalVersion, req.user!.id]
    );

    return res.json({
      accepted: true,
      terms_accepted_version: currentLegalVersion,
      required_terms_version: currentLegalVersion,
      requires_terms_acceptance: false,
      message: 'Terms & Conditions and Privacy Policy accepted.'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to record terms acceptance' });
  }
});

// Logout endpoint to clear session cookie cleanly
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token', { path: '/' });
  return res.json({ message: 'Logged out successfully' });
});

// Verify Email Token
router.get('/verify-email', async (req: Request, res: Response) => {
  try {
    const tokenParam = (req.query.token as string) || '';
    if (!tokenParam) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const record = await queryOne<any>(
      'SELECT * FROM email_verifications WHERE token = ?',
      [tokenParam]
    );

    if (record) {
      // Check if user is already verified
      const user = await queryOne<any>('SELECT is_email_verified FROM users WHERE id = ?', [record.user_id]);
      if (user && user.is_email_verified) {
        await execute('DELETE FROM email_verifications WHERE token = ?', [tokenParam]);
        return res.json({ already_verified: true, message: 'Your email address is already verified! ✨' });
      }

      // Verify token freshness
      if (new Date(record.expires_at).getTime() < Date.now()) {
        return res.status(400).json({ error: 'Verification token has expired. Please request a new verification link.' });
      }

      await execute('UPDATE users SET is_email_verified = 1 WHERE id = ?', [record.user_id]);
      await execute('DELETE FROM email_verifications WHERE token = ?', [tokenParam]);

      return res.json({ message: 'Email address verified successfully! You may now complete your Nook setup.' });
    }

    return res.status(400).json({ error: 'Invalid or expired verification link' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Resend Verification Email
router.post('/resend-verification', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await queryOne<any>('SELECT id, username, email, is_email_verified FROM users WHERE id = ?', [req.user!.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.is_email_verified) {
      return res.json({ message: 'Your email address is already verified.' });
    }

    const smtpConfig = await getSmtpSettings();
    if (!smtpConfig.smtp_host) {
      return res.status(503).json({
        error: 'Email delivery is not configured on this server. Please contact your instance administrator.'
      });
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 86400000).toISOString();

    await execute('DELETE FROM email_verifications WHERE user_id = ?', [user.id]);
    await execute('INSERT INTO email_verifications (token, user_id, expires_at) VALUES (?, ?, ?)', [
      verifyToken,
      user.id,
      expiresAt
    ]);

    const baseUrl = await getEffectiveBaseUrl(req);
    const sent = await sendEmailVerificationEmail(user.email, user.username, verifyToken, baseUrl);
    if (!sent) {
      return res.status(502).json({ error: 'Failed to deliver verification email. Please check SMTP configuration or try again later.' });
    }

    return res.json({
      message: `Verification email resent to ${user.email}`
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Forgot Password / Password Reset Request
router.post('/forgot-password', resetLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const smtpConfig = await getSmtpSettings();
    if (!smtpConfig.smtp_host) {
      return res.status(503).json({
        error: 'Password reset emails are not configured on this server. Please contact your instance administrator to reset your password.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await queryOne<any>('SELECT id, username, email, is_disabled FROM users WHERE email = ?', [cleanEmail]);
    if (user && !user.is_disabled) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

      await execute('DELETE FROM password_resets WHERE user_id = ?', [user.id]);
      await execute(
        'INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)',
        [resetToken, user.id, expiresAt]
      );

      const baseUrl = await getEffectiveBaseUrl(req);
      await sendPasswordResetEmail(user.email, user.username, resetToken, baseUrl);
    }

    return res.json({
      message: 'If an account exists with that email address, a password reset link has been sent.'
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to process password reset' });
  }
});

// Validate Password Reset Token
router.get('/reset-password/validate', resetLimiter, async (req: Request, res: Response) => {
  try {
    const token = String(req.query.token || '').trim();
    if (!token) {
      return res.json({ valid: false });
    }
    const record = await queryOne<any>(
      'SELECT token FROM password_resets WHERE token = ? AND expires_at > ?',
      [token, new Date().toISOString()]
    );
    return res.json({ valid: !!record });
  } catch {
    return res.status(500).json({ valid: false, error: 'Failed to validate token' });
  }
});

// Reset Password confirmation
router.post('/reset-password', resetLimiter, async (req: Request, res: Response) => {
  try {
    const resetToken = String(req.body.reset_token || req.body.token || '').trim();
    const newPassword = req.body.new_password;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    const pwdError = await validatePasswordComplexity(newPassword);
    if (pwdError) {
      return res.status(400).json({ error: pwdError });
    }

    const resetRecord = await queryOne<any>(
      'SELECT * FROM password_resets WHERE token = ? AND expires_at > ?',
      [resetToken, new Date().toISOString()]
    );

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await execute('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [password_hash, resetRecord.user_id]);
    await execute('DELETE FROM password_resets WHERE user_id = ?', [resetRecord.user_id]);

    return res.json({ message: 'Password reset successfully. You may now login.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
