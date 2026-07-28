import { execute, query, queryOne } from './connection';

interface Migration {
  version: number;
  name: string;
  up: () => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: async () => {
      await execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          display_name TEXT,
          bio TEXT,
          avatar_url TEXT,
          banner_url TEXT,
          status_message TEXT,
          status_emoji TEXT,
          role TEXT DEFAULT 'user',
          is_totp_enabled INTEGER DEFAULT 0,
          totp_secret TEXT,
          privacy_default TEXT DEFAULT 'private',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await execute(`
        CREATE TABLE IF NOT EXISTS passkey_credentials (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          public_key TEXT NOT NULL,
          counter INTEGER NOT NULL,
          transports TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await execute(`
        CREATE TABLE IF NOT EXISTS password_resets (
          token TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await execute(`
        CREATE TABLE IF NOT EXISTS nooks (
          user_id INTEGER PRIMARY KEY,
          theme TEXT DEFAULT 'glassmorphism',
          custom_css TEXT DEFAULT '',
          bg_color TEXT DEFAULT '#12131C',
          text_color TEXT DEFAULT '#ffffff',
          accent_color TEXT DEFAULT '#6366f1',
          bg_music_url TEXT DEFAULT '',
          bg_music_title TEXT DEFAULT '',
          visibility_nook TEXT DEFAULT 'private',
          visibility_widgets TEXT DEFAULT 'friends',
          visibility_guestbook TEXT DEFAULT 'friends',
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await execute(`
        CREATE TABLE IF NOT EXISTS nook_widgets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          widget_type TEXT NOT NULL,
          title TEXT,
          position_order INTEGER DEFAULT 0,
          column_name TEXT DEFAULT 'left',
          config_json TEXT DEFAULT '{}',
          is_enabled INTEGER DEFAULT 1,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await execute(`
        CREATE TABLE IF NOT EXISTS nook_stickers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          sticker_url TEXT NOT NULL,
          pos_x REAL DEFAULT 50,
          pos_y REAL DEFAULT 50,
          scale REAL DEFAULT 1.0,
          rotation REAL DEFAULT 0,
          z_index INTEGER DEFAULT 10,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await execute(`
        CREATE TABLE IF NOT EXISTS friends (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          friend_id INTEGER NOT NULL,
          status TEXT DEFAULT 'pending',
          top_position INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, friend_id)
        );
      `);

      await execute(`
        CREATE TABLE IF NOT EXISTS guestbook_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nook_user_id INTEGER NOT NULL,
          author_user_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          status TEXT DEFAULT 'approved',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(nook_user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(author_user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await execute(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
  },
  {
    version: 2,
    name: 'user_disable_columns',
    up: async () => {
      try {
        await execute('ALTER TABLE users ADD COLUMN is_disabled INTEGER DEFAULT 0');
      } catch (e) {}
      try {
        await execute('ALTER TABLE users ADD COLUMN disabled_reason TEXT DEFAULT ""');
      } catch (e) {}
    }
  },
  {
    version: 3,
    name: 'email_verification_and_onboarding',
    up: async () => {
      try {
        await execute('ALTER TABLE users ADD COLUMN is_email_verified INTEGER DEFAULT 0');
      } catch (e) {}
      try {
        await execute('ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0');
      } catch (e) {}
      await execute(`
        CREATE TABLE IF NOT EXISTS email_verifications (
          token TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
    }
  },
  {
    version: 4,
    name: 'v1.2.0_features_and_notifications',
    up: async () => {
      await execute(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          sender_id INTEGER,
          title TEXT,
          message TEXT,
          link_url TEXT,
          is_read INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      try { await execute('ALTER TABLE users ADD COLUMN notify_email_guestbook INTEGER DEFAULT 1'); } catch (e) {}
      try { await execute('ALTER TABLE users ADD COLUMN notify_email_friends INTEGER DEFAULT 1'); } catch (e) {}

      try { await execute('ALTER TABLE nooks ADD COLUMN steam_id64 TEXT DEFAULT ""'); } catch (e) {}
      try { await execute('ALTER TABLE nooks ADD COLUMN spotify_track_url TEXT DEFAULT ""'); } catch (e) {}
      try { await execute('ALTER TABLE nooks ADD COLUMN apple_music_url TEXT DEFAULT ""'); } catch (e) {}
      try { await execute('ALTER TABLE nooks ADD COLUMN card_visibility_json TEXT DEFAULT "{}"'); } catch (e) {}
      try { await execute('ALTER TABLE nooks ADD COLUMN card_colors_json TEXT DEFAULT "{}"'); } catch (e) {}

      try { await execute('ALTER TABLE nook_stickers ADD COLUMN layer TEXT DEFAULT "above_cards"'); } catch (e) {}

      try { await execute('ALTER TABLE friends ADD COLUMN is_favorite INTEGER DEFAULT 0'); } catch (e) {}
    }
  },
  {
    version: 5,
    name: 'v1.5.0_nook_columns',
    up: async () => {
      try { await execute('ALTER TABLE nooks ADD COLUMN steam_display_mode TEXT DEFAULT "both"'); } catch (e) {}
      try { await execute('ALTER TABLE nooks ADD COLUMN music_tracks_json TEXT DEFAULT "[]"'); } catch (e) {}
      try { await execute('ALTER TABLE nooks ADD COLUMN top_songs_json TEXT DEFAULT "[]"'); } catch (e) {}
    }
  },
  {
    version: 6,
    name: 'v1.6.0_movies_books_spotify',
    up: async () => {
      try { await execute('ALTER TABLE nooks ADD COLUMN card_titles_json TEXT DEFAULT "{}"'); } catch (e) {}
      try { await execute('ALTER TABLE nooks ADD COLUMN favorite_movies_json TEXT DEFAULT "[]"'); } catch (e) {}
      try { await execute('ALTER TABLE nooks ADD COLUMN favorite_books_json TEXT DEFAULT "[]"'); } catch (e) {}
      try { await execute('ALTER TABLE nooks ADD COLUMN storygraph_username TEXT DEFAULT ""'); } catch (e) {}
      try { await execute('ALTER TABLE nooks ADD COLUMN spotify_personal_mode TEXT DEFAULT "disabled"'); } catch (e) {}
      await execute(`
        CREATE TABLE IF NOT EXISTS spotify_user_tokens (
          user_id INTEGER PRIMARY KEY,
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
    }
  }
];

export async function runMigrations() {
  await execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER UNIQUE NOT NULL,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const currentVersionRow = await queryOne<{ max_version: number }>(
    'SELECT MAX(version) as max_version FROM schema_migrations'
  );
  const currentVersion = currentVersionRow?.max_version || 0;

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`Running migration v${migration.version}: ${migration.name}...`);
      await migration.up();
      await execute('INSERT INTO schema_migrations (version, name) VALUES (?, ?)', [
        migration.version,
        migration.name
      ]);
      console.log(`Migration v${migration.version} applied successfully.`);
    }
  }
}
