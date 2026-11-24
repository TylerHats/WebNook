import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server';
import { execute, query, queryOne } from '../db/connection';
import { authenticateToken, AuthenticatedRequest, JWT_SECRET } from '../middleware/authMiddleware';
import jwt from 'jsonwebtoken';
import { createRateLimiter, getEffectiveBaseUrl } from '../utils/security';
import { getCurrentLegalVersion } from '../services/legalService';

const router = Router();
const RP_NAME = 'WebNook Platform';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const challenges = new Map<string, { challenge: string; expiresAt: number }>();

const challengeSweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of challenges.entries()) {
    if (entry.expiresAt <= now) {
      challenges.delete(key);
    }
  }
}, 60 * 1000);
challengeSweeper.unref();

function setChallenge(key: string, challenge: string) {
  challenges.set(key, { challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS });
}

function consumeChallenge(key: string): string | null {
  const entry = challenges.get(key);
  if (!entry) return null;
  challenges.delete(key);
  if (entry.expiresAt <= Date.now()) return null;
  return entry.challenge;
}

const mfaVerifyLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts. Please wait a few minutes.'
});

async function getExpectedOrigins(req: Request): Promise<string[]> {
  const origins = new Set<string>();
  try {
    const effective = await getEffectiveBaseUrl(req);
    origins.add(new URL(effective).origin);
  } catch {}
  if (process.env.ORIGIN) {
    try {
      origins.add(new URL(process.env.ORIGIN).origin);
    } catch {}
  }
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (host && /^[a-zA-Z0-9._:-]+$/.test(host)) {
    origins.add(`${proto === 'https' ? 'https' : 'http'}://${host}`);
  }
  return Array.from(origins);
}

async function getRpId(req: Request): Promise<string> {
  if (process.env.RP_ID) return process.env.RP_ID;
  try {
    const effective = await getEffectiveBaseUrl(req);
    return new URL(effective).hostname;
  } catch {
    const hostHeader = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost').split(',')[0].trim();
    return hostHeader.split(':')[0];
  }
}

// ======================== TOTP ROUTING ========================

// Generate TOTP secret & QR code
router.post('/totp/setup', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.username, 'WebNook', secret);

    const qrDataUrl = await QRCode.toDataURL(otpauth);

    await execute('UPDATE users SET totp_secret = ? WHERE id = ?', [secret, user.id]);

    return res.json({ secret, qrDataUrl });
  } catch (err) {
    console.error('TOTP setup error:', err);
    return res.status(500).json({ error: 'Failed to generate TOTP setup' });
  }
});

// Verify & Enable TOTP
router.post('/totp/verify', authenticateToken, mfaVerifyLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token } = req.body;
    const user = await queryOne<any>('SELECT totp_secret FROM users WHERE id = ?', [req.user!.id]);

    if (!user || !user.totp_secret) {
      return res.status(400).json({ error: 'TOTP setup not initialized' });
    }

    const isValid = authenticator.check(String(token || ''), user.totp_secret);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    await execute('UPDATE users SET is_totp_enabled = 1 WHERE id = ?', [req.user!.id]);

    return res.json({ message: 'TOTP 2FA enabled successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify TOTP' });
  }
});

// Disable TOTP (requires current password or active TOTP code)
router.post('/totp/disable', authenticateToken, mfaVerifyLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { password, totp_code } = req.body;
    if (!password && !totp_code) {
      return res.status(400).json({ error: 'Current password or valid TOTP code is required to disable 2FA' });
    }

    const user = await queryOne<any>('SELECT password_hash, totp_secret, is_totp_enabled FROM users WHERE id = ?', [req.user!.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let verified = false;
    if (password) {
      verified = await bcrypt.compare(String(password), user.password_hash);
    }
    if (!verified && totp_code && user.is_totp_enabled && user.totp_secret) {
      verified = authenticator.check(String(totp_code), user.totp_secret);
    }

    if (!verified) {
      return res.status(401).json({ error: 'Invalid password or 2FA verification code' });
    }

    await execute('UPDATE users SET is_totp_enabled = 0, totp_secret = NULL WHERE id = ?', [req.user!.id]);
    return res.json({ message: 'TOTP 2FA disabled successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to disable TOTP' });
  }
});

// ======================== WEBAUTHN / PASSKEY ROUTING ========================

// Generate Passkey Registration Options
router.post('/passkey/register-options', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userPasskeys = await query<any>('SELECT id, transports FROM passkey_credentials WHERE user_id = ?', [user.id]);
    const rpID = await getRpId(req);

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userID: String(user.id),
      userName: user.username,
      userDisplayName: user.username,
      attestationType: 'none',
      excludeCredentials: userPasskeys.map(pk => ({
        id: pk.id,
        type: 'public-key' as const,
        transports: pk.transports ? JSON.parse(pk.transports) : undefined
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred'
      }
    });

    setChallenge(`reg_${user.id}`, options.challenge);

    return res.json(options);
  } catch (err) {
    console.error('Passkey reg options error:', err);
    return res.status(500).json({ error: 'Failed to generate passkey registration options' });
  }
});

// Verify Passkey Registration
router.post('/passkey/register-verify', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const expectedChallenge = consumeChallenge(`reg_${user.id}`);

    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Registration challenge expired' });
    }

    const origins = await getExpectedOrigins(req);
    const rpID = await getRpId(req);

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin: origins.length === 1 ? origins[0] : origins,
      expectedRPID: rpID,
      requireUserVerification: false
    });

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const credentialID = req.body.id || Buffer.from(registrationInfo.credentialID).toString('base64url');
      const credentialPublicKey = registrationInfo.credentialPublicKey;
      const counter = registrationInfo.counter ?? 0;
      const transports = req.body.response?.transports || [];

      await execute(
        'INSERT INTO passkey_credentials (id, user_id, public_key, counter, transports) VALUES (?, ?, ?, ?, ?)',
        [
          credentialID,
          user.id,
          Buffer.from(credentialPublicKey).toString('base64'),
          counter,
          JSON.stringify(transports)
        ]
      );

      return res.json({ verified: true, message: 'Passkey registered successfully' });
    }

    return res.status(400).json({ verified: false, error: 'Passkey verification failed' });
  } catch (err: any) {
    console.error('Passkey reg verify error:', err);
    return res.status(500).json({ error: err.message || 'Passkey verification failed' });
  }
});

// Passkey Login Options (Unauthenticated)
router.post('/passkey/login-options', mfaVerifyLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username } = req.body;
    let userPasskeys: any[] = [];

    if (username) {
      const cleanInput = String(username).trim().toLowerCase();
      const user = await queryOne<any>('SELECT id, is_disabled FROM users WHERE username = ? OR email = ?', [cleanInput, cleanInput]);
      if (user && !user.is_disabled) {
        userPasskeys = await query('SELECT id, transports FROM passkey_credentials WHERE user_id = ?', [user.id]);
      }
    }

    const options = await generateAuthenticationOptions({
      rpID: await getRpId(req),
      allowCredentials: userPasskeys.map(pk => ({
        id: pk.id,
        type: 'public-key' as const,
        transports: pk.transports ? JSON.parse(pk.transports) : undefined
      })),
      userVerification: 'preferred'
    });

    const tempSessionId = 'pk_' + crypto.randomBytes(16).toString('hex');
    setChallenge(tempSessionId, options.challenge);

    return res.json({ options, session_id: tempSessionId });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate passkey authentication options' });
  }
});

// Passkey Login Verify
router.post('/passkey/login-verify', mfaVerifyLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { session_id, response } = req.body;
    const expectedChallenge = session_id ? consumeChallenge(String(session_id)) : null;

    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Authentication challenge expired' });
    }

    const passkey = await queryOne<any>('SELECT * FROM passkey_credentials WHERE id = ?', [response?.id]);
    if (!passkey) {
      return res.status(400).json({ error: 'Passkey not recognized' });
    }

    const user = await queryOne<any>('SELECT * FROM users WHERE id = ?', [passkey.user_id]);
    if (!user) {
      return res.status(400).json({ error: 'Associated user account not found' });
    }

    if (user.is_disabled) {
      const reasonMsg = user.disabled_reason ? `: ${user.disabled_reason}` : '.';
      return res.status(403).json({ error: `Your account has been disabled${reasonMsg}` });
    }

    const origins = await getExpectedOrigins(req);
    const rpID = await getRpId(req);

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origins.length === 1 ? origins[0] : origins,
      expectedRPID: rpID,
      requireUserVerification: false,
      authenticator: {
        credentialID: passkey.id,
        credentialPublicKey: Buffer.from(passkey.public_key, 'base64'),
        counter: passkey.counter,
        transports: passkey.transports ? JSON.parse(passkey.transports) : undefined
      }
    });

    if (verification.verified) {
      const newCounter = verification.authenticationInfo?.newCounter ?? passkey.counter;
      await execute('UPDATE passkey_credentials SET counter = ? WHERE id = ?', [
        newCounter,
        passkey.id
      ]);

      const currentLegalVersion = await getCurrentLegalVersion();
      const acceptedVersion = (user.terms_accepted_version || '').trim();
      const requiresTermsAcceptance = acceptedVersion !== currentLegalVersion;

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
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
        verified: true,
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
    }

    return res.status(400).json({ verified: false, error: 'Passkey authentication failed' });
  } catch (err: any) {
    console.error('Passkey login verify error:', err);
    return res.status(500).json({ error: err.message || 'Passkey authentication failed' });
  }
});

// List user's registered passkeys
router.get('/passkeys', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const passkeys = await query('SELECT id, created_at FROM passkey_credentials WHERE user_id = ?', [req.user!.id]);
    return res.json({ passkeys });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch passkeys' });
  }
});

// Delete passkey
router.delete('/passkeys/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await execute('DELETE FROM passkey_credentials WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
    return res.json({ message: 'Passkey removed successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove passkey' });
  }
});

export default router;
