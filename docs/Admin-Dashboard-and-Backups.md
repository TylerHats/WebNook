# Admin Dashboard, Branding & Backups

Administrators (`role === 'admin'`) can manage users, whitelabel branding, SMTP delivery, legal compliance, integrations, backups, and updates from `/admin`.

## Key Admin Tabs

- **Metrics & Announcements:** View user, Nook, message, and storage statistics, broadcast system announcements, or reply directly in private Bug Reports & Support streams.
- **Users:** Inspect user status and accepted legal policy version (`v1.0`, `Outdated`, `Pending`), toggle admin roles, disable/re-enable accounts (immediately enforced on active JWT sessions), trigger password reset links, or delete accounts cleanly.
- **Config:**
  - **Whitelabel Branding:** Customize **Application Name**, **Public Site URL** (with a one-click **Use Current Origin** button), and upload a custom PNG/JPG/WebP/GIF logo.
  - **SMTP Mail Engine:** Configure host, port, credentials, sender address, TLS mode, optional self-signed certificate allowance for local/homelab relays, and send test emails.
  - **Password Complexity Policy:** Configure minimum length and uppercase/lowercase/number/special character requirements enforced across setup, registration, and password resets.
  - **Terms & Privacy Policy Generator:** Set operator details, legal contact email, jurisdiction, minimum age, custom terms/privacy addenda, and publish new versions to re-prompt all users.
  - **Compressed Backup & Restore Suite:** Create on-demand or scheduled (hourly/daily/weekly) `.tar.gz` backups with configurable retention limits containing `webnook.db`, custom branding, and uploads. Downloads use authenticated `Authorization` header fetches, and restores automatically run `PRAGMA wal_checkpoint(TRUNCATE)` and schema migrations.
  - **Factory Reset / Wipe:** Full reset confirmation returning a test instance back to the OOBE setup wizard.
- **Integrations:** Configure & test Spotify OAuth credentials, Steam Web API key, TMDB v3 API key, and Apple Music status.
- **Self-Updater:** Check for `stable`, `beta`, or `alpha` releases/commits (comparing semver cleanly so Docker image upgrades are accurately detected).

