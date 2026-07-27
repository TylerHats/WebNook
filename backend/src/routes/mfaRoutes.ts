import { Router, Response } from 'express';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server';
import { execute, query, queryOne } from '../db/connection';
import { authenticateToken, AuthenticatedRequest, JWT_SECRET } from '../middleware/authMiddleware';
import jwt from 'jsonwebtoken';

const router = Router();

const RP_NAME = 'WebNook Platform';
const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || `http://localhost:${process.env.PORT || 4000}`;

// Store active webauthn challenges in memory temporarily
const challenges: Record<string, string> = {};

// ======================== TOTP ROUTING ========================

// Generate TOTP secret & QR code
router.post('/totp/setup', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.username, 'WebNook', secret);

    const qrDataUrl = await QRCode.toDataURL(otpauth);

    // Temporarily save secret to user record until verified
    await execute('UPDATE users SET totp_secret = ? WHERE id = ?', [secret, user.id]);

    return res.json({ secret, qrDataUrl });
  } catch (err) {
    console.error('TOTP setup error:', err);
    return res.status(500).json({ error: 'Failed to generate TOTP setup' });
  }
});

// Verify & Enable TOTP
router.post('/totp/verify', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token } = req.body;
    const user = await queryOne<any>('SELECT totp_secret FROM users WHERE id = ?', [req.user!.id]);

    if (!user || !user.totp_secret) {
      return res.status(400).json({ error: 'TOTP setup not initialized' });
    }

    const isValid = authenticator.check(token, user.totp_secret);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    await execute('UPDATE users SET is_totp_enabled = 1 WHERE id = ?', [req.user!.id]);

    return res.json({ message: 'TOTP 2FA enabled successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify TOTP' });
  }
});

// Disable TOTP
router.post('/totp/disable', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { password } = req.body;
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

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
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

    challenges[user.id] = options.challenge;

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
    const expectedChallenge = challenges[user.id];

    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Registration challenge expired' });
    }

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID
    });

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credentialID, credentialPublicKey, counter } = registrationInfo;

      await execute(
        'INSERT INTO passkey_credentials (id, user_id, public_key, counter, transports) VALUES (?, ?, ?, ?, ?)',
        [
          credentialID,
          user.id,
          Buffer.from(credentialPublicKey).toString('base64'),
          counter,
          JSON.stringify(req.body.response.transports || [])
        ]
      );

      delete challenges[user.id];
      return res.json({ verified: true, message: 'Passkey registered successfully' });
    }

    return res.status(400).json({ verified: false, error: 'Passkey verification failed' });
  } catch (err: any) {
    console.error('Passkey reg verify error:', err);
    return res.status(500).json({ error: err.message || 'Passkey verification failed' });
  }
});

// Passkey Login Options (Unauthenticated)
router.post('/passkey/login-options', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username } = req.body;
    let userPasskeys: any[] = [];
    
    if (username) {
      const user = await queryOne<any>('SELECT id FROM users WHERE username = ? OR email = ?', [username, username]);
      if (user) {
        userPasskeys = await query('SELECT id, transports FROM passkey_credentials WHERE user_id = ?', [user.id]);
      }
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: userPasskeys.map(pk => ({
        id: pk.id,
        type: 'public-key' as const,
        transports: pk.transports ? JSON.parse(pk.transports) : undefined
      })),
      userVerification: 'preferred'
    });

    const tempSessionId = req.body.session_id || 'anon_' + Math.random().toString(36).substring(2);
    challenges[tempSessionId] = options.challenge;

    return res.json({ options, session_id: tempSessionId });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate passkey authentication options' });
  }
});

// Passkey Login Verify
router.post('/passkey/login-verify', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { session_id, response } = req.body;
    const expectedChallenge = challenges[session_id];

    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Authentication challenge expired' });
    }

    const passkey = await queryOne<any>('SELECT * FROM passkey_credentials WHERE id = ?', [response.id]);
    if (!passkey) {
      return res.status(400).json({ error: 'Passkey not recognized' });
    }

    const user = await queryOne<any>('SELECT * FROM users WHERE id = ?', [passkey.user_id]);
    if (!user) {
      return res.status(400).json({ error: 'Associated user account not found' });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: passkey.id,
        credentialPublicKey: Buffer.from(passkey.public_key, 'base64'),
        counter: passkey.counter
      }
    });

    if (verification.verified) {
      await execute('UPDATE passkey_credentials SET counter = ? WHERE id = ?', [
        verification.authenticationInfo.newCounter,
        passkey.id
      ]);

      delete challenges[session_id];

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

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
          is_totp_enabled: !!user.is_totp_enabled
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
