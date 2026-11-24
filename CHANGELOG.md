# Changelog

All notable changes to WebNook are documented in this file.

## [3.4.0] - 2026-11-23

### Fixed GitHub Issues
- **Password Reset Email URLs & UI (#1):** Added canonical **Public Site URL** (`site_url`) setting in Admin → Config, resolved relative reset/safety email URLs into full links, fixed `/api/auth/forgot-password` to dispatch SMTP emails via `emailService` without leaking `reset_token` in JSON responses, added `GET /api/auth/reset-password/validate`, and implemented `/forgot-password` and `/reset-password` pages plus Login link.
- **Audio File Uploads & Streaming Playback (#2):** Fixed response field mismatch between `POST /api/nook/upload/music` (`bg_music_url`) and Customizer card playlist upload (`data.music_url` -> both keys returned + frontend handles both with size/type validation & loading state), installed `ffmpeg` in Docker image (`Dockerfile`), and bypassed `{ cache: 'no-store' }` Service Worker interception (`sw.js`) & Express `Cache-Control: no-store` headers for `/uploads/*` and `Range` media requests.
- **Spotify & Apple Music Attribution Hyperlinks (#3):** Updated `MusicWidget` login hint so **Spotify** (`https://open.spotify.com`) and **Apple Music** (`https://music.apple.com`) render as clickable hyperlinks (`rel="noopener noreferrer"`), and added `<audio onError>` status feedback.

### Dynamic Legal Policies & Mandatory Acceptance Gate
- Added [legalService.ts](backend/src/services/legalService.ts) and `GET /api/legal/documents` generating Terms & Conditions and Privacy Policy documents dynamically from instance branding, Public Site URL, operator name, contact email, jurisdiction, minimum age, backup settings, active third-party integrations, and optional custom addenda.
- Added `/terms` and `/privacy` routes, footer navigation links, registration acceptance checkbox + inline preview modal, and non-dismissible `TermsAcceptanceGate` overlay on next login/visit for existing users (with **Decline & Log Out** returning the user cleanly to `/` as a guest).
- Added backend middleware enforcement (`403 TERMS_ACCEPTANCE_REQUIRED` across protected routes except `/api/auth/me`, `/api/auth/accept-terms`, `/api/auth/logout`) and Admin controls + **Publish New Policy Version & Re-Prompt Users** (`POST /api/admin/legal/bump-version`).

### Security Hardening & Optimizations
- Removed hardcoded fallback `JWT_SECRET` (auto-generates persistent 64-byte hex secret in `DATA_DIR/.jwt_secret`), unified signing verification across routes, removed `?token=` query string auth everywhere (including backup downloads), and enforced `is_disabled` checks in JWT middleware, passkey logins, and `/uploads/*`.
- Added strict HTML/CSS/URL XSS sanitization (`sanitizeHtml`, `sanitizeCss`, `isSafeUrl`) across HTML cards, custom CSS, Markdown rendering, notifications, and email HTML templates.
- Required password or current TOTP code when disabling TOTP 2FA (`POST /api/mfa/totp/disable` + Account Settings modal), added TTL cleanup for WebAuthn challenges and rate limiters on auth endpoints, hardened backup archive restores against tar-slip/symlink attacks, added SSRF validation on external integration requests, and restricted uploads to strict image/audio MIME + extensions.
- Added SQLite migration v14 (`terms_accepted_version`, `terms_accepted_at`, `anchor_type`, `anchor_id`, plus 10 performance indexes), fixed legacy `ALTER TABLE` ordering for fresh databases, eliminated `2N`/`N+1` message & guestbook reaction queries, deduplicated `<NotificationDropdown />`, paused polling in background tabs, fixed group chat poll form overwrites/scroll hijacks, and switched cropped group avatars to `/api/nook/upload/group-avatar`.

### Theme Engine Overhaul & Dual-Anchor Sticker Studio
- Fixed variable naming bugs and hardcoded `!important` rules across 10 themes in `themeEngine.css` plus added `.theme-seasonal-winter`; enhanced all 23 themes (preserving Win9X intact) with atmospheric gradient backdrops, distinct typography (`Fredoka`, `Space Grotesk`, `Playfair Display`, `JetBrains Mono`, `VT323`, `Press Start 2P`, `Outfit`), styled headers/buttons, custom overlays (`synthwave`, `glassmorphism`, `frutiger-aero`, `coffee`), collapsible category shelves, dynamic Sound FX & Animation toggles, all 5 palette channel pickers, **Reset to Theme Defaults**, and **Style & Pop Overrides** (`borderRadius`, `glassBlur`, `glowIntensity`, `bgPattern`, `fontOverride`).
- Rewrote `StickerCanvas` & `VisualStickerStudioModal` with dual anchoring (`card` pinning via `[data-sticker-anchor]` + `ResizeObserver`/`MutationObserver`, plus `container` free-canvas mode), pointer capture, grab-offset tracking, narrow-screen proportional scaling, Desktop/Tablet/Mobile viewport preview switching, on-canvas resize/rotate/delete handles, Undo/Redo, Z-order, direct sticker upload, and keyboard shortcuts.

---

## [3.3.2] and Earlier
- See [GitHub Releases](https://github.com/TylerHats/WebNook/releases) for v3.0.0 – v3.3.2 release notes.

