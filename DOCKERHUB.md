# 🏡 WebNook

> **A modern, cozy, customizable, self-hosted social networking platform for friend groups — inspired by classic MySpace.**

[![Docker Pulls](https://img.shields.io/docker/pulls/tylerhats/webnook.svg)](https://hub.docker.com/r/tylerhats/webnook)
[![Docker Image Size](https://img.shields.io/docker/image-size/tylerhats/webnook/latest)](https://hub.docker.com/r/tylerhats/webnook)
[![GitHub License](https://img.shields.io/github/license/TylerHats/WebNook)](https://github.com/TylerHats/WebNook)

WebNook brings back personal expression, cozy vibes, and complete privacy to social networking. Designed specifically for friend groups and self-hosters, WebNook lets every user create a customized personal space (**"Nook"**) at `http://your-server:4000/nook/username`.

---

## ✨ What's Included in v3.4.0

- 🎨 **23 Handcrafted Themes & Style Overrides**: Expanded styling across Win9X Classic, Cyberpunk Y2K, Synthwave Neon, Frutiger Aero, Cozy Cat Café, Cloud Dream, Pixel Arcade, Fluent OS, Gamer Dark, Liquid Crystal Glass, Material You Expressive, seasonal themes, and more — plus 5 custom colors, corner shapes, glass blur, neon glow, background patterns, and custom typography.
- 🖼️ **Dual-Anchor Visual Sticker Studio**: Drag, resize, rotate, layer, and **pin stickers directly to specific Nook cards** (or free-canvas positions) with Desktop/Tablet/Mobile preview switching, Undo/Redo, and responsive scaling across screen sizes.
- 🎵 **Audio Uploads & Playback (`ffmpeg` Included)**: Built-in `ffmpeg` transcodes uploaded tracks to standard stereo MP3 with proper HTTP byte-range streaming support and working Spotify/Apple Music external links.
- 📜 **Built-In Dynamic Legal Policies & Gate**: Instance-aware Terms & Conditions (`/terms`) and Privacy Policy (`/privacy`) dynamically tailored to your branding and integrations, required on registration, with admin policy versioning & mandatory login acceptance gating.
- 🔑 **Password Reset Flows**: Self-service `/forgot-password` and `/reset-password` UI plus canonical **Public Site URL** support in Admin settings for working email reset links.
- 💬 **Direct & Group Messaging**: Real-time DMs and group chats with cropped uploaded icons, markdown, reactions, threaded replies, and private bug reports.
- 🎬 **Movies, Books & Games**: TMDB movies/TV, Open Library & StoryGraph `.csv` book shelves, and Steam showcase cards.
- 🔒 **Hardened Self-Hosted Security**: WebAuthn Passkeys, TOTP 2FA (enable/disable), strict HTML/CSS/URL XSS sanitization, SSRF & tar-slip protections, rate limiting, and auto-generated persistent `JWT_SECRET`.

---

## 🚀 Quick Start with Docker Compose

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
      # Optional: Auto-generates and persists a secure 64-byte secret in /app/backend/data/.jwt_secret if omitted
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

Run the container:

```bash
docker compose up -d
```

Open `http://localhost:4000` in your browser to complete the initial setup wizard!

### Safe Upgrades

To update an existing container without losing users, Nooks, or uploads:

```bash
docker compose pull
docker compose up -d
```

Database migrations run automatically (`schema_migrations`). Existing users upgrading to v3.4.0+ will be prompted on next login/visit to review and accept the instance Terms & Conditions and Privacy Policy before accessing site features.

---

## 🛠️ Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `4000` | Port the HTTP/HTTPS server listens on. |
| `NODE_ENV` | `production` | Node runtime mode. |
| `JWT_SECRET` | *(Auto-generated)* | Secret key for signing auth tokens. If omitted, a random 64-byte hex key is persisted in `DATA_DIR/.jwt_secret`. |
| `DATA_DIR` | `/app/backend/data` | Persistent directory storing `webnook.db`, `.jwt_secret`, branding, and backups. |
| `ORIGIN` | *(Optional)* | Explicit canonical frontend origin allowed by CORS & WebAuthn. |
| `RP_ID` | *(Optional)* | WebAuthn Relying Party domain (e.g., `nook.example.com`). |
| `SSL_CERT` | *(Optional)* | Absolute path to SSL Certificate `.pem` for native HTTPS. |
| `SSL_KEY` | *(Optional)* | Absolute path to SSL Private Key `.pem` for native HTTPS. |

---

## 💾 Persistence & Backup Volumes

Mount persistent volumes for `/app/backend/data` and `/app/backend/uploads` so your database, `.jwt_secret`, custom branding, avatars, banners, audio tracks, stickers, and group chat icons are preserved across container upgrades.

WebNook includes an **Automated Scheduled Backup Suite** inside **Admin → Config** creating full `.tar.gz` recovery archives with retention limits and schema-aware restore migrations.

---

## 🔗 Links & Resources

- **GitHub Repository**: [github.com/TylerHats/WebNook](https://github.com/TylerHats/WebNook)
- **Full Documentation**: [github.com/TylerHats/WebNook/tree/main/docs](https://github.com/TylerHats/WebNook/tree/main/docs)
- **Report Issues & Feature Requests**: [GitHub Issues](https://github.com/TylerHats/WebNook/issues)
- **Docker Hub**: [hub.docker.com/r/tylerhats/webnook](https://hub.docker.com/r/tylerhats/webnook)
