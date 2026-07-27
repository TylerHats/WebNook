# 💖 WebNook - Self-Hosted Friend-Group Social Platform

<p align="center">
  <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80" alt="WebNook Banner" width="100%" style="border-radius: 16px;" />
</p>

WebNook is a cute, friend-group centric, self-hosted social media platform heavily inspired by **MySpace**, rebuilt with a modern vibe and mobile-first **PWA** support. Express yourself through custom personal Nooks (`/nook/username`), themes (**Modern Glassmorphism**, **Retro Windows 98**, **Windows 7 Frutiger Aero**, **Cyberpunk Y2K**), music players, stickers, badges, Top 8/12 friend grids, and integrations for Spotify and Steam!

---

## ✨ Feature Overview

### 🎨 Deep Nook Customization
- **Theme Switcher**:
  - **Modern Glassmorphism**: Translucent blurred panels, glowing borders, vibrant neon accents.
  - **Retro Windows 98**: Functional classic grey windows chrome, 3D borders, navy blue title bars, retro system buttons.
  - **Windows 7 Frutiger Aero**: Glossy glass gradients, reflective aqua highlights, rounded shiny buttons.
  - **Cyberpunk Y2K**: High contrast dark synthwave aesthetic with cyan & magenta neon accents.
- **Sticker Canvas Overlay**: Place, drag, resize, rotate, and layer cute stickers, badges, and animated GIFs on your page.
- **Background Anthem Audio**: Play your favorite song directly on your Nook for visitors.
- **Custom CSS Overrides**: Complete style control via custom CSS injection.

### 🔐 Authentication & Privacy
- **Privacy by Default**: Nooks are private by default, requiring friend requests before viewing mutual profile content. Fine-grained controls allow public visibility options per Nook.
- **Multi-Factor Authentication (MFA)**:
  - **TOTP**: Compatible with Google Authenticator, Authy, etc., complete with QR code setup.
  - **Passkeys (WebAuthn / FIDO2)**: Hardware security keys, TouchID, and FaceID passwordless login.
- **Password Reset**: Self-hosted SMTP password reset delivery and emergency admin reset flow.

### 🎵 Integrations & Social Mechanics
- **Spotify Showcase**: Top artists, top tracks, and currently playing song display.
- **Steam Gaming**: Showcase recently played Steam games, playtime, and online status.
- **Classic Top Friends Grid**: Arrange your Top 8 or Top 12 friends in customized grids.
- **Guestbook & Comments**: Leave comments on your friends' Nooks with owner moderation options.

### 🛡️ Administration & Auto-Updater
- **PolyPress-Style Release Channels**:
  - **Stable**: GitHub latest versioned releases.
  - **Beta**: GitHub tag-only preview releases.
  - **Alpha**: Pulls latest commit from GitHub `main` branch.
- **Database Migration Versioning**: Knex/SQLite version tracking table ensures seamless schema upgrades across releases without data corruption.
- **Backup & Restore System**: Single-click downloadable database exports (`.db` / `.tar.gz`) and upload restore system.

---

## 📱 Mobile PWA Support
WebNook is engineered for mobile-first usage. You can install WebNook as a standalone Progressive Web App (PWA) directly from Safari on iOS ("Add to Home Screen") or Chrome on Android/Desktop for native app feel and offline asset caching.

---

## 🛠️ Quick Local Installation

Run the automated one-command installation script:

```bash
# Clone repository
git clone https://github.com/TylerHats/WebNook.git
cd WebNook

# Execute installer script
./install.sh
```

### Starting WebNook

```bash
# Production mode (Port 4000)
npm start

# Development mode (concurrent backend & frontend hot-reload)
npm run dev
```

Visit WebNook in your browser at `http://localhost:4000`.

---

## 🗑️ Uninstallation Script

To cleanly remove WebNook build artifacts and optionally purge local database files:

```bash
./uninstall.sh
```

---

## 🐳 Docker & Docker Compose Setup

WebNook image is hosted on Docker Hub at:  
👉 **[hub.docker.com/repository/docker/tylerhats/webnook](https://hub.docker.com/repository/docker/tylerhats/webnook/general)**

### Running via Docker Compose

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
      - JWT_SECRET=change_me_to_your_secure_random_key
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

---

## 📄 License
Distributed under the [MIT License](LICENSE).
