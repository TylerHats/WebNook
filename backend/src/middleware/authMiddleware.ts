import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../db/connection';
import { getJwtSecret, parseCookies } from '../utils/security';
import { getCurrentLegalVersion } from '../services/legalService';

export const JWT_SECRET = getJwtSecret();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
    terms_accepted_version?: string;
  };
}

const TERMS_EXEMPT_PATHS = new Set([
  '/api/auth/me',
  '/api/auth/accept-terms',
  '/api/auth/logout'
]);

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

  if (!token) {
    const cookies = parseCookies(req.headers.cookie);
    token = cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; email: string; role: string };

    const dbUser = await queryOne<any>(
      'SELECT id, username, email, role, is_disabled, disabled_reason, terms_accepted_version FROM users WHERE id = ?',
      [decoded.id]
    );
    if (!dbUser) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    if (dbUser.is_disabled) {
      const reasonMsg = dbUser.disabled_reason ? `: ${dbUser.disabled_reason}` : '.';
      return res.status(403).json({
        error: `Your account has been disabled${reasonMsg}`,
        code: 'ACCOUNT_DISABLED'
      });
    }

    const currentLegalVersion = await getCurrentLegalVersion();
    const acceptedVersion = (dbUser.terms_accepted_version || '').trim();
    const reqPath = (req.originalUrl || req.url || '').split('?')[0];

    if (acceptedVersion !== currentLegalVersion && !TERMS_EXEMPT_PATHS.has(reqPath)) {
      return res.status(403).json({
        error: 'You must accept the current Terms & Conditions and Privacy Policy to continue using this site.',
        code: 'TERMS_ACCEPTANCE_REQUIRED',
        required_terms_version: currentLegalVersion
      });
    }

    req.user = {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role,
      terms_accepted_version: acceptedVersion
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
