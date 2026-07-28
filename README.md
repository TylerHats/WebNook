<p align="center">
  <img src="assets/logo.png" alt="WebNook Logo" width="220" />
</p>

<h1 align="center">WebNook</h1>

<p align="center">
  <strong>A modern, customizable, self-hosted social platform for friend groups — inspired by classic MySpace.</strong>
</p>

<p align="center">
  <a href="https://github.com/TylerHats/WebNook/releases"><img src="https://img.shields.io/github/v/release/TylerHats/WebNook?style=flat-square&color=6366f1" alt="Release" /></a>
  <a href="https://hub.docker.com/repository/docker/tylerhats/webnook"><img src="https://img.shields.io/docker/v/tylerhats/webnook?label=docker&style=flat-square&color=0080ff" alt="Docker Hub" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0-blue.svg?style=flat-square" alt="License" /></a>
  <img src="https://img.shields.io/badge/PWA-Ready-ff69b4.svg?style=flat-square" alt="PWA Ready" />
</p>

---

## 📌 Overview

**WebNook** brings back personal expression, cozy vibes, and privacy to social networking. Designed specifically for friend groups and self-hosters, WebNook lets each user create a cute, highly customized personal page (**"Nook"**) at `website.com/nook/username`. 

Featuring 4 nostalgic themes (**Modern Glass**, **Windows 95 Classic**, **Windows 7 Frutiger Aero**, and **Cyberpunk Y2K**), a real-time **Visual Sticker Studio**, custom MP3 audio playlists, **Movies & TV Showcases**, **Books & StoryGraph Reading Nooks**, **Spotify & Steam integrations**, hardware Passkey / 2FA security, and auto-reloading Docker container self-upgrades.

---

## 🔥 Key Features

| Category | Highlights |
| :--- | :--- |
| **🖼️ Visual Sticker Studio** | Live interactive canvas to drag, scale, rotate, and layer cute preset or custom stickers anywhere over your profile! |
| **🎬 Movies & TV Showcase** | Search film & series databases (TMDB/OMDb) to display poster art, release years, and personal star ratings. |
| **📚 Books & Reading Nook** | Search books (Open Library) or import your reading lists directly from StoryGraph CSV files with 1 click. |
| **🎵 Music & Spotify OAuth** | Upload custom MP3 audio tracks, search Spotify catalog, or connect your personal Spotify account for top & recent tracks. |
| **🎮 Steam Showcase** | Display online status, top all-time games, and recently played games. |
| **🤝 Social Mechanics** | MySpace-style Top Friends grids, unidirectional favoriting with `⭐ Favorited You` badges, and full-width guestbooks. |
| **🔒 Privacy & Security** | Private by default profile viewing, fine-grained card visibility controls, email/password + TOTP 2FA & WebAuthn Passkeys. |
| **⚡ Admin & Container Suite** | Real-time health metrics, 1-click compressed SQLite backups, and automated Docker container process self-reloads. |

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

WebNook is published on Docker Hub as [`tylerhats/webnook`](https://hub.docker.com/repository/docker/tylerhats/webnook/general).

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  webnook:
    image: tylerhats/webnook:latest
    container_name: webnook
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      - PORT=4000
      - NODE_ENV=production
      - JWT_SECRET=replace_with_secure_random_key
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

### Option 2: Local Installation Script

For Linux servers running directly without Docker:

```bash
git clone https://github.com/TylerHats/WebNook.git
cd WebNook

# Execute installer
./install.sh

# Start WebNook server
npm start
```

Access WebNook at `http://localhost:4000`.

---

## 🔒 SSL & Reverse Proxy Setup

### Reverse Proxy SSL Termination (Nginx, Caddy, Cloudflare)
WebNook natively detects reverse proxies with `trust proxy` enabled. Protocol headers (`X-Forwarded-Proto` and `X-Forwarded-Host`) are automatically used to match WebAuthn Passkey origins across custom domains.

### Bare Host Let's Encrypt SSL
For bare installations needing automated Let's Encrypt SSL certificates:

```bash
sudo ./setup-ssl.sh
```

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Node.js, TypeScript, Express.js.
- **Database**: SQLite (WAL mode) with automated version tracking (`schema_migrations`).
- **Frontend**: React, TypeScript, Vite, Vanilla CSS Theme Engine.
- **Authentication**: Argon2/bcrypt, `otplib` (TOTP), `@simplewebauthn` (Passkeys / FIDO2).
- **Containerization**: Alpine Multi-stage Docker image.

---

## 🗑️ Uninstallation

To cleanly remove build dependencies or purge local data:

```bash
./uninstall.sh
```

---

## 📄 License

This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).
