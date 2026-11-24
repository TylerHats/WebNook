# Installation & Upgrading Guide

## Docker Compose (Recommended)

WebNook is published on Docker Hub as [`tylerhats/webnook`](https://hub.docker.com/r/tylerhats/webnook).

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
      # Optional: Auto-generates & persists in /app/backend/data/.jwt_secret if omitted
      # - JWT_SECRET=replace_with_strong_64_char_random_secret
      - ORIGIN=http://localhost:4000
      - RP_ID=localhost
    volumes:
      - webnook-data:/app/backend/data
      - webnook-uploads:/app/backend/uploads

volumes:
  webnook-data:
  webnook-uploads:
```

Start the stack:

```bash
docker compose up -d
```

Visit `http://localhost:4000` to run the Out-Of-The-Box Experience (OOBE) Setup Wizard and configure your instance name, first administrator account, and public site URL.

---

## Safe Upgrading (v3.3.x → v3.4.0+)

All persistent user data (`webnook.db`, `.jwt_secret`, custom branding logos, backups, avatars, banners, stickers, audio tracks, and group icons) resides in `/app/backend/data` and `/app/backend/uploads`.

1. *(Recommended)* Create a downloadable backup first via **Admin → Config → Create Immediate Backup**.
2. Pull the latest container image and recreate the container:
   ```bash
   docker compose pull
   docker compose up -d
   ```
3. **Automatic Migrations:** WebNook runs SQLite migration v14 automatically on boot, preserving all users, Nooks, messages, friends, guestbook entries, and stickers. Existing stickers default to `anchor_type: 'container'` and retain their exact saved coordinates.
4. **Legal Policy Gate on Existing Accounts:** Existing users logging in or visiting after upgrading to `v3.4.0+` will be presented once with your instance's **Terms & Conditions & Privacy Policy** prompt before using site features. Choosing **Decline & Log Out** returns them cleanly to `/` as a guest.

---

## Bare-Metal / Linux Local Install

Requirements:
- **Node.js 18+** and **npm**
- **ffmpeg** recommended on `PATH` for lossless WebP image processing and 44.1 kHz MP3 audio transcoding (if omitted, uploads gracefully fall back to storing the validated file directly).

```bash
git clone https://github.com/TylerHats/WebNook.git
cd WebNook
./install.sh
npm start
```

---

## Environment Variables Reference

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `4000` | HTTP/HTTPS listener port |
| `NODE_ENV` | `production` | Express runtime mode |
| `DATA_DIR` | `/app/backend/data` (in container) | Path storing `webnook.db`, `.jwt_secret`, `branding/`, and `backups/` |
| `JWT_SECRET` | Auto-generated in `DATA_DIR/.jwt_secret` | HMAC signing secret for auth JWTs |
| `ORIGIN` | *(Optional)* | Explicit allowed external origin for CORS |
| `RP_ID` | *(Optional)* | WebAuthn Passkey Relying Party ID (domain name without port) |
| `FFMPEG_PATH` | `/usr/bin/ffmpeg` or `ffmpeg` | Custom path to `ffmpeg` binary |
| `SSL_CERT` / `SSL_KEY` | *(Optional)* | TLS certificate & private key paths for direct HTTPS mode |

