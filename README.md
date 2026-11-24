<p align="center">
  <img src="assets/logo.png" alt="WebNook Logo" width="220" />
</p>

<h1 align="center">WebNook</h1>

<p align="center">
  <strong>A modern, customizable, self-hosted social platform for friend groups — inspired by classic MySpace.</strong>
</p>

---

## 📌 Overview

**WebNook** brings back personal expression, cozy vibes, and complete data ownership to social networking. Designed specifically for friend groups and self-hosters, WebNook lets every member craft their own personal space (**"Nook"**) at `your-domain.com/nook/username`.

Featuring **23 handcrafted themes** (**Win9X Classic**, **Cyberpunk Y2K**, **Synthwave Neon**, **Frutiger Aero**, **Cozy Cat Café**, **Fluffy Cloud Dream**, **8-Bit Pixel Arcade**, **Magical Girl Kawaii**, **Fluent OS**, **Gamer Dark**, **Liquid Crystal Glass**, **Material You Expressive**, seasonal editions, and more), full **5-channel palette + Style & Pop overrides** (corner radius, glass blur, accent glow, background patterns, and custom typography), toggleable **Web Audio API theme sound effects** & **ambient micro-animations**, a **Dual-Anchor Visual Sticker Studio** (card-pinned or free-canvas placement that stays rock-solid across desktop and mobile viewports), **FFmpeg-powered MP3 audio playlists**, **Movies, Books & Steam showcases**, hardware **Passkey / TOTP 2FA** security, **Password Reset emails & UI**, and dynamically generated per-instance **Terms & Conditions and Privacy Policy** acceptance gates.

---

## 🔥 Key Features

| Category | Highlights |
| :--- | :--- |
| **🎨 23 Handcrafted Themes & Style Overrides** | 23 themes across General, Retro, Cute & Cozy, Futuristic, and Seasonal shelves, plus 5 custom color channels, corner presets, frost blur, accent glow, background patterns, and typography overrides. |
| **🖼️ Dual-Anchor Visual Sticker Studio** | Interactive drag/scale/rotate studio with card-pinned (`header`, widget cards, `guestbook`) and free-canvas modes, desktop/tablet/mobile live preview switcher, Undo/Redo, custom uploads, and responsive pixel stability. |
| **🔊 Theme Sound FX & Ambient Overlays** | Web Audio API sound synthesizer (Win95 clicks, arcade bleeps, cat purrs, chimes) and non-blocking ambient animations across all 23 themes. |
| **🎵 Music Playlists & Audio Transcoding** | Built-in `ffmpeg` MP3 transcoding for uploaded audio tracks with HTTP byte-range streaming support, Spotify & Apple Music links with sign-in links, autoplay/loop controls, and toast notifications. |
| **💬 Direct & Group Messaging** | Real-time 1-on-1 DMs and group chats with cropped group icons, markdown formatting, emoji reactions, threaded message replies, conversation pinning, and private bug report / admin announcement channels. |
| **🎬 Movies, Books & Steam Showcases** | Search films & series (TMDB), look up books (Open Library) or import StoryGraph `.csv` libraries, and display live Steam game showcases with exclusion filters. |
| **🤝 Social Mechanics** | MySpace-style Top Friends grid with unidirectional favoriting (`⭐ Favorited You`), friend requests, and themed Guestbooks. |
| **📜 Dynamic Legal Policies & Gate** | Per-instance dynamically generated Terms & Conditions (`/terms`) and Privacy Policy (`/privacy`) reflecting whitelabel branding, operator contact details, and active integrations, enforced on signup and across existing accounts when policy versions bump. |
| **🔒 Privacy, Auth & Hardened Security** | Private-by-default Nooks, Passkeys (WebAuthn), TOTP 2FA (enable/disable), self-service & admin-initiated password reset links, strict SVG/HTML/CSS XSS sanitization, SSRF/path-traversal guards, and auto-generated persistent `JWT_SECRET`. |
| **📦 Automated Backups & Safe Upgrades** | Scheduled hourly/daily/weekly `.tar.gz` archives bundling DB, branding, and uploads with retention limits, tar-slip validation on restore, and zero-downtime SQLite schema migrations (`schema_migrations`). |

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

WebNook is published on Docker Hub as [`tylerhats/webnook`](https://hub.docker.com/r/tylerhats/webnook).

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  webnook:
    image: tylerhats/webnook:latest
    container_name: webnook-app
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      - PORT=4000
      - NODE_ENV=production
      # Optional: WebNook auto-generates and persists a secure 64-byte secret in /app/backend/data/.jwt_secret if omitted
      # - JWT_SECRET=replace_with_strong_64_char_random_secret
      - RP_ID=localhost
      - ORIGIN=http://localhost:4000
    volumes:
      - webnook-data:/app/backend/data
      - webnook-uploads:/app/backend/uploads

volumes:
  webnook-data:
  webnook-uploads:
```

Start the container:

```bash
docker compose up -d
```

### Upgrading an Existing Docker Installation

Your database (`webnook.db`), `.jwt_secret`, branding, and uploads live in the mounted volumes and migrate automatically on startup:

```bash
docker compose pull
docker compose up -d
```

> [!NOTE]
> Upgrading from pre-v3.4.0 automatically runs SQLite migration v14, preserving all existing users, Nooks, stickers, and settings. Existing users will be prompted once on next login/visit to accept your instance's Terms & Conditions and Privacy Policy before accessing site features.

### Option 2: Local Installation Script

For Linux servers running directly without Docker (requires Node.js 18+ and optionally `ffmpeg` in `PATH` for audio/WebP transcoding):

```bash
git clone https://github.com/TylerHats/WebNook.git
cd WebNook

# Execute installer
./install.sh

# Start WebNook server
npm start
```

Access WebNook at `http://localhost:4000` to complete the initial OOBE Setup Wizard.

---

## 📚 Documentation & Guides

Detailed guides are available in the [`docs/`](docs/) directory (and mirrored to the GitHub Wiki):

- [Installation & Upgrading](docs/Installation-and-Upgrading.md) — Docker Compose, bare-metal setup, SSL, and safe version upgrades
- [Themes & Customization](docs/Themes-and-Customization.md) — 23 themes, 5-channel palettes, Style & Pop overrides, and custom CSS
- [Visual Sticker Studio](docs/Visual-Sticker-Studio.md) — Dual-anchor pinning (`card` vs `container`), viewport testing, and shortcuts
- [Legal Policies & Compliance](docs/Legal-Policies-and-Compliance.md) — Dynamic Terms & Privacy configuration, addenda, and policy versioning
- [Security & Authentication](docs/Security-and-Authentication.md) — Passkeys, TOTP 2FA, Password Resets, SMTP setup, and sanitization protections
- [Admin Dashboard & Backups](docs/Admin-Dashboard-and-Backups.md) — Whitelabeling, backups/restores, integrations, and in-app updater

---

## 🔒 SSL & Reverse Proxy Setup

### Reverse Proxy SSL Termination (Nginx, Caddy, Cloudflare)
WebNook sets `trust proxy = 1` and reads `X-Forwarded-Proto` and `X-Forwarded-Host` automatically for WebAuthn Passkey origins and email links. You can also explicitly configure **Public Site URL** under **Admin → Config** so password reset emails and legal policy links always point to your canonical external domain.

### Bare Host Let's Encrypt SSL
For bare installations needing automated Let's Encrypt SSL certificates:

```bash
sudo ./setup-ssl.sh
```

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Node.js, TypeScript, Express.js, `ffmpeg`.
- **Database**: SQLite (WAL mode) with automated schema tracking (`schema_migrations` up to v14).
- **Frontend**: React 18, TypeScript, Vite, CSS Custom Property Theme Engine.
- **Authentication**: `bcryptjs`, JSON Web Tokens, `otplib` (TOTP 2FA), `@simplewebauthn` (Passkeys / FIDO2).
- **Containerization**: Multi-stage `node:20-alpine` Docker image with persistent data & upload volumes.

---

## 📝 Changelog & License

- See [CHANGELOG.md](CHANGELOG.md) for detailed release history.
- Licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).
