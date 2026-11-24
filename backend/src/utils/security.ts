import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { queryOne } from '../db/connection';

const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
const jwtSecretFilePath = path.join(dataDir, '.jwt_secret');
let cachedJwtSecret: string | null = null;

/**
 * Returns the active JWT signing secret.
 * Uses process.env.JWT_SECRET when provided, otherwise loads or generates a
 * persistent cryptographically random 64-byte hex secret in DATA_DIR/.jwt_secret.
 */
export function getJwtSecret(): string {
  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret && envSecret.length > 0) {
    return envSecret;
  }

  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }

  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(jwtSecretFilePath)) {
      const stored = fs.readFileSync(jwtSecretFilePath, 'utf8').trim();
      if (stored.length >= 32) {
        cachedJwtSecret = stored;
        return stored;
      }
    }
    const generated = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(jwtSecretFilePath, generated, { encoding: 'utf8', mode: 0o600 });
    cachedJwtSecret = generated;
    return generated;
  } catch (err) {
    // Fallback to an ephemeral secret only if filesystem write fails completely
    if (!cachedJwtSecret) {
      cachedJwtSecret = crypto.randomBytes(64).toString('hex');
    }
    return cachedJwtSecret;
  }
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(cookie => {
    const idx = cookie.indexOf('=');
    if (idx > 0) {
      const key = cookie.slice(0, idx).trim();
      const rawVal = cookie.slice(idx + 1).trim();
      try {
        cookies[key] = decodeURIComponent(rawVal);
      } catch {
        cookies[key] = rawVal;
      }
    }
  });
  return cookies;
}

export function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeConfiguredUrl(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return `${parsed.protocol}//${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`.replace(/\/+$/, '');
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Resolves the external base URL from an explicit site_url setting first,
 * then reverse-proxy/request headers, with safe sanitization.
 */
export function getBaseUrl(req?: Request, configuredSiteUrl?: string): string {
  const configured = normalizeConfiguredUrl(configuredSiteUrl) || normalizeConfiguredUrl(process.env.ORIGIN);
  if (configured) {
    return configured;
  }

  if (req) {
    const rawProto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http')
      .split(',')[0]
      .trim()
      .toLowerCase();
    const proto = rawProto === 'https' ? 'https' : 'http';

    const rawHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim();
    if (rawHost && /^[a-zA-Z0-9._:-]+$/.test(rawHost)) {
      return `${proto}://${rawHost}`;
    }
  }

  return `http://localhost:${process.env.PORT || 4000}`;
}

export async function getEffectiveBaseUrl(req?: Request): Promise<string> {
  try {
    const row = await queryOne<{ value: string }>('SELECT value FROM system_settings WHERE key = "site_url"');
    return getBaseUrl(req, row?.value);
  } catch {
    return getBaseUrl(req);
  }
}

/**
 * Verifies that relativePath resolves strictly inside baseDir (including symlink targets).
 */
export function safePathInside(baseDir: string, relativePath: string): string | null {
  if (!relativePath || relativePath.includes('\0')) return null;
  const cleanRel = relativePath.replace(/^[/\\]+/, '');
  if (!cleanRel) return null;

  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, cleanRel);

  if (!resolvedTarget.startsWith(resolvedBase + path.sep)) {
    return null;
  }

  if (fs.existsSync(resolvedTarget)) {
    try {
      const realBase = fs.realpathSync(resolvedBase);
      const realTarget = fs.realpathSync(resolvedTarget);
      if (!realTarget.startsWith(realBase + path.sep)) {
        return null;
      }
      return realTarget;
    } catch {
      return null;
    }
  }

  return resolvedTarget;
}

export function createRateLimiter(opts: { windowMs: number; max: number; message?: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (entry.resetAt <= now) {
        hits.delete(key);
      }
    }
  }, Math.max(30000, opts.windowMs));
  cleanup.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = hits.get(ip);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt: now + opts.windowMs };
      hits.set(ip, entry);
    } else {
      entry.count += 1;
    }

    const remaining = Math.max(0, opts.max - entry.count);
    res.setHeader('X-RateLimit-Limit', String(opts.max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (entry.count > opts.max) {
      return res.status(429).json({
        error: opts.message || 'Too many requests, please try again later.'
      });
    }
    return next();
  };
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);?/g, (_, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&colon;/gi, ':');
}

export function isSafeUrl(url: string, allowRelative = false, allowMailto = true): boolean {
  if (!url) return false;
  const decoded = decodeHtmlEntities(String(url)).trim();
  const compact = decoded.replace(/[\u0000-\u0020]+/g, '').toLowerCase();
  if (!compact) return false;

  if (compact.startsWith('#')) return true;

  if (allowRelative && decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.startsWith('/\\')) {
    return true;
  }

  if (compact.startsWith('https://') || compact.startsWith('http://')) {
    return true;
  }

  if (allowMailto && compact.startsWith('mailto:')) {
    return true;
  }

  return false;
}

export function sanitizeCss(css: string): string {
  if (!css) return '';
  let out = String(css);
  let prev = '';
  let iterations = 0;

  while (out !== prev && iterations < 5) {
    prev = out;
    iterations++;
    out = out
      .replace(/<\s*\/\s*style[^>]*>/gi, '')
      .replace(/<\s*script[^>]*>/gi, '')
      .replace(/@import\b[^;]*(;|$)/gi, '')
      .replace(/expression\s*\(/gi, '/* blocked */(')
      .replace(/behavior\s*:/gi, '/* blocked */:')
      .replace(/-moz-binding\s*:/gi, '/* blocked */:')
      .replace(/javascript\s*:/gi, '/* blocked */:')
      .replace(/vbscript\s*:/gi, '/* blocked */:')
      .replace(/data\s*:\s*text\/html/gi, '/* blocked */');
  }

  // Filter unsafe url(...) references inside CSS
  out = out.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (full, quote, rawUrl) => {
    const trimmed = String(rawUrl || '').trim();
    if (!trimmed) return 'none';
    if (isSafeUrl(trimmed, true, false) || /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(trimmed)) {
      return `url(${quote}${trimmed}${quote})`;
    }
    return 'none';
  });

  return out;
}

const ALLOWED_HTML_TAGS = new Set([
  'div', 'span', 'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark', 'small', 'sub', 'sup',
  'blockquote', 'pre', 'code', 'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  'a', 'img', 'figure', 'figcaption', 'details', 'summary', 'center',
  'section', 'article', 'header', 'footer', 'aside', 'main', 'nav'
]);

const VOID_HTML_TAGS = new Set(['br', 'hr', 'img']);

const ALLOWED_GLOBAL_ATTRS = new Set([
  'class', 'id', 'title', 'dir', 'lang', 'aria-label', 'role',
  'align', 'valign', 'colspan', 'rowspan', 'width', 'height', 'alt'
]);

function sanitizeInlineStyleAttr(rawStyle: string): string {
  const decoded = decodeHtmlEntities(rawStyle);
  const declarations = decoded.split(';');
  const safeParts: string[] = [];

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx <= 0) continue;
    const prop = decl.slice(0, colonIdx).trim().toLowerCase();
    const val = decl.slice(colonIdx + 1).trim();

    if (!/^[a-z-]+$/.test(prop)) continue;
    if (!val) continue;

    const lowerVal = val.replace(/[\u0000-\u0020]+/g, '').toLowerCase();
    if (
      lowerVal.includes('expression(') ||
      lowerVal.includes('javascript:') ||
      lowerVal.includes('vbscript:') ||
      lowerVal.includes('behavior:') ||
      lowerVal.includes('-moz-binding') ||
      lowerVal.includes('@import') ||
      lowerVal.includes('data:text/html')
    ) {
      continue;
    }

    if (prop === 'position' && lowerVal === 'fixed') {
      continue;
    }

    const cleanedVal = val.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_, q, u) => {
      const trimmedU = String(u || '').trim();
      return isSafeUrl(trimmedU, true, false) ? `url(${q}${trimmedU}${q})` : 'none';
    });

    safeParts.push(`${prop}: ${cleanedVal}`);
  }

  return safeParts.join('; ');
}

/**
 * Strict server-side HTML sanitizer for Custom HTML Nook cards.
 * Preserves rich layout/formatting HTML & safe inline styles while stripping scripts,
 * iframes, SVGs, forms, event handlers, and unsafe URLs.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  let input = String(html);

  // Strip HTML comments
  input = input.replace(/<!--[\s\S]*?-->/g, '');

  // Strip dangerous block tags along with their inner content
  const dangerousBlockTags = ['script', 'style', 'iframe', 'object', 'embed', 'applet', 'svg', 'math', 'template', 'noscript'];
  for (const tag of dangerousBlockTags) {
    const blockRegex = new RegExp(`<\\s*${tag}\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*${tag}\\s*>`, 'gi');
    const unclosedRegex = new RegExp(`<\\s*${tag}\\b[\\s\\S]*$`, 'gi');
    input = input.replace(blockRegex, '').replace(unclosedRegex, '');
  }

  // Strip remaining tags not in the allowlist and sanitize attributes on allowed tags
  return input.replace(/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g, (full, slash, rawTagName, rawAttrs) => {
    const tag = rawTagName.toLowerCase();
    if (!ALLOWED_HTML_TAGS.has(tag)) {
      return '';
    }

    if (slash) {
      return VOID_HTML_TAGS.has(tag) ? '' : `</${tag}>`;
    }

    const attrParts: string[] = [];
    let hasBlankTarget = false;
    const attrRegex = /([a-zA-Z0-9:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let match: RegExpExecArray | null;

    while ((match = attrRegex.exec(rawAttrs)) !== null) {
      const attrName = match[1].toLowerCase();
      const rawVal = match[2] ?? match[3] ?? match[4] ?? '';

      if (attrName.startsWith('on') || attrName === 'srcdoc' || attrName === 'formaction' || attrName === 'xlink:href') {
        continue;
      }

      if (attrName === 'href' && tag === 'a') {
        if (isSafeUrl(rawVal, true, true)) {
          attrParts.push(`href="${escapeHtml(decodeHtmlEntities(rawVal).trim())}"`);
        }
        continue;
      }

      if (attrName === 'target' && tag === 'a') {
        if (rawVal.toLowerCase() === '_blank') {
          hasBlankTarget = true;
          attrParts.push('target="_blank"');
        }
        continue;
      }

      if (attrName === 'src' && tag === 'img') {
        if (isSafeUrl(rawVal, true, false)) {
          attrParts.push(`src="${escapeHtml(decodeHtmlEntities(rawVal).trim())}"`);
        }
        continue;
      }

      if (attrName === 'style') {
        const cleanStyle = sanitizeInlineStyleAttr(rawVal);
        if (cleanStyle) {
          attrParts.push(`style="${escapeHtml(cleanStyle)}"`);
        }
        continue;
      }

      if (ALLOWED_GLOBAL_ATTRS.has(attrName)) {
        attrParts.push(rawVal === '' && match[2] === undefined && match[3] === undefined && match[4] === undefined
          ? attrName
          : `${attrName}="${escapeHtml(decodeHtmlEntities(rawVal))}"`);
      }
    }

    if (tag === 'a' && hasBlankTarget) {
      attrParts.push('rel="noopener noreferrer"');
    }

    const attrStr = attrParts.length > 0 ? ` ${attrParts.join(' ')}` : '';
    return `<${tag}${attrStr}>`;
  });
}

