# 🏡 WebNook

> **A modern, cozy, customizable, self-hosted social networking platform for friend groups — inspired by classic MySpace.**

[![Docker Pulls](https://img.shields.io/docker/pulls/tylerhats/webnook.svg)](https://hub.docker.com/r/tylerhats/webnook)
[![Docker Image Size](https://img.shields.io/docker/image-size/tylerhats/webnook/latest)](https://hub.docker.com/r/tylerhats/webnook)
[![GitHub License](https://img.shields.io/github/license/TylerHats/WebNook)](https://github.com/TylerHats/WebNook)

WebNook brings back personal expression, cozy vibes, and absolute privacy to social networking. Designed specifically for friend groups and self-hosters, WebNook lets each user create a cute, highly customized personal page (**"Nook"**) at `http://your-server:4000/nook/username`.

---

## ✨ Features At A Glance

- 💬 **Cozy Direct & Group Messages**: Real-time 1-on-1 DMs & group chats with custom group icons, markdown support, and per-Nook theme bubble styling!
- 😍 **Emoji Reactions & Reply Threading**: Double-tap message shortcuts, customizable reaction pickers, and threaded replies with quote previews.
- 🐛 **Bug Reports & Support Channel**: Private support stream to report issues directly to site admins, plus locked system announcement broadcasts.
- 🎵 **Continuous Music & Autoplay**: MP3 playlist track #1 autoplay, continuous auto-next playback, looping, and theme-styled browser unmute toasts.
- 🎨 **12 Whimsical Themes**: Cozy Cat Café, Cloud Dream, 8-Bit Pixel Arcade, Windows 9x, Frutiger Aero, Cyberpunk Y2K, and more.
- 🔊 **Theme Sound FX Engine**: Retro Web Audio API clicks, arcade blips, cat purrs, and magical guestbook chimes (toggleable).
- 🖼️ **Visual Sticker Studio**: Real-time canvas to drag, scale, rotate, and layer cute stickers anywhere over your profile!
- 🎬 **Movies, Books & Games**: Showcase your favorite films (TMDB), books (Open Library & StoryGraph CSV import), and Steam games.
- 📦 **Automated Backups & Retention Limits**: Scheduled hourly/daily/weekly backups bundling DB, branding, and all uploaded media files (`uploads/`).
- 🔒 **Self-Hosted Privacy & Security**: Hardware Passkey/WebAuthn, TOTP 2FA, zero ads, zero tracking algorithms, and fine-grained card visibility.

---

## 🚀 Quick Start with Docker Compose

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
      - JWT_SECRET=change_me_to_a_secure_random_secret_key
    volumes:
      - webnook_data:/app/backend/data
      - webnook_uploads:/app/backend/uploads

volumes:
  webnook_data:
  webnook_uploads:
```

Run the container:

```bash
docker compose up -d
```

Open `http://localhost:4000` in your browser to complete the initial setup wizard!

---

## 🛠️ Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `4000` | Port the web application listens on. |
| `NODE_ENV` | `production` | Node environment state. |
| `JWT_SECRET` | *(Required)* | Secret key for signing authentication tokens. |
| `DATA_DIR` | `/app/backend/data` | Persistent directory storing `webnook.db` database & backups. |
| `SSL_CERT` | *(Optional)* | Absolute path to SSL Certificate `.pem` for native HTTPS. |
| `SSL_KEY` | *(Optional)* | Absolute path to SSL Private Key `.pem` for native HTTPS. |

---

## 💾 Persistence & Backup Volumes

Make sure to mount persistent volumes for `/app/backend/data` and `/app/backend/uploads` so your database, custom branding, avatars, banners, and group chat media are safely stored across container upgrades.

WebNook includes an **Automated Scheduled Backup Suite** built into the Admin Dashboard that automatically creates full compressed `.tar.gz` recovery archives of your database and media files.

---

## 🔗 Links & Resources

- **GitHub Repository**: [github.com/TylerHats/WebNook](https://github.com/TylerHats/WebNook)
- **Report Issues & Feature Requests**: [GitHub Issues](https://github.com/TylerHats/WebNook/issues)
- **Docker Hub**: [hub.docker.com/r/tylerhats/webnook](https://hub.docker.com/r/tylerhats/webnook)
