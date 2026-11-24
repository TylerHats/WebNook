# Security & Authentication

WebNook is designed for private friend-group and community self-hosting with layered defense-in-depth protections.

## Authentication & Recovery

- **JWT Signing Secret:** If `JWT_SECRET` is not set in the container environment, WebNook automatically generates a cryptographically random 64-byte hex key and persists it in `DATA_DIR/.jwt_secret`. Tokens are accepted via `Authorization: Bearer <token>` headers or cookies — query string `?token=` authentication is disabled across all endpoints.
- **Passkeys (WebAuthn / FIDO2):** Hardware keys and platform biometrics (`FaceID`, `TouchID`, `Windows Hello`) authenticate against configured `RP_ID` / `ORIGIN` or validated forwarded host headers, with challenge TTL expiry (5 minutes).
- **TOTP 2FA:** Enable authenticator app codes under **Settings**, and disable securely at any time by confirming your account password or a valid 6-digit TOTP code (`POST /api/mfa/totp/disable`).
- **Password Reset Emails & UI:** Configure SMTP under **Admin → Config** alongside **Public Site URL**. Users can request reset links at `/forgot-password` and complete resets cleanly at `/reset-password?token=...`. Admins can also trigger reset emails or set passwords manually from the Users table.

## Hardening Controls

- **XSS & Content Sanitization:** User-supplied custom HTML cards, Markdown links/images, notification links, custom CSS overrides, and email templates are strictly sanitized/escaped (`sanitizeHtml`, `sanitizeCss`, `isSafeUrl`, `escapeHtml`) on both backend save and frontend render.
- **Upload Validation & Media Isolation:** Image uploads (`PNG`, `JPG`, `WebP`, `GIF` up to 25 MB) and audio uploads (up to 50 MB) use separated Multer pipelines enforcing extension and MIME validation. `/uploads/*` and `/branding/*` enforce path-traversal containment, disabled-account checks, privacy/friendship ACL checks, `X-Content-Type-Options: nosniff`, and CSP media sandboxing.
- **SSRF, Rate Limiting & Archive Safety:** External integration requests enforce timeout limits, body size caps, redirect limits, and private/loopback network blocks. Auth routes apply per-IP rate limiting. `.tar.gz` backup restores pre-validate entries with `tar` listing to reject path traversal and symlinks before unpacking.

