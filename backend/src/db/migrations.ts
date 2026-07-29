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
  },
  {
    version: 7,
    name: 'v1.9.0_unidirectional_friend_favorites',
    up: async () => {
      try { await execute('ALTER TABLE friends ADD COLUMN user_is_favorite INTEGER DEFAULT 0'); } catch (e) {}
      try { await execute('ALTER TABLE friends ADD COLUMN friend_is_favorite INTEGER DEFAULT 0'); } catch (e) {}
    }
  },
  {
    version: 8,
    name: 'v2.1.0_theme_sounds_and_animations',
    up: async () => {
      try { await execute('ALTER TABLE nooks ADD COLUMN theme_sounds_enabled INTEGER DEFAULT 1'); } catch (e) {}
      try { await execute('ALTER TABLE nooks ADD COLUMN theme_animations_enabled INTEGER DEFAULT 1'); } catch (e) {}
    }
  },
  {
    version: 9,
    name: 'v2.2.0_system_notifications_and_email_pref',
    up: async () => {
      try { await execute('ALTER TABLE users ADD COLUMN notify_email_system INTEGER DEFAULT 1'); } catch (e) {}
      try { await execute('ALTER TABLE notifications ADD COLUMN link_title TEXT DEFAULT ""'); } catch (e) {}
    }
  },
  {
    version: 10,
    name: 'v2.3.0_direct_messaging_and_group_chats',
    up: async () => {
      try { await execute('ALTER TABLE users ADD COLUMN notify_email_messages INTEGER DEFAULT 1'); } catch (e) {}
      await execute(`
        CREATE TABLE IF NOT EXISTS conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          name TEXT DEFAULT '',
          creator_user_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await execute(`
        CREATE TABLE IF NOT EXISTS conversation_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          is_muted INTEGER DEFAULT 0,
          last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(conversation_id, user_id)
        )
      `);
      await execute(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id INTEGER NOT NULL,
          sender_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Seed System Bot user
      const systemUser = await queryOne<any>('SELECT id FROM users WHERE username = "system"');
      if (!systemUser) {
        try {
          await execute(
            'INSERT INTO users (username, email, password_hash, display_name, role, is_email_verified, onboarding_completed) VALUES ("system", "system@webnook.local", "DISABLED", "System Announcement 🤖", "system", 1, 1)'
          );
        } catch (e) {}
      }
    }
  },
  {
    version: 11,
    name: 'v2.4.0_group_chat_settings_and_inline_notices',
    up: async () => {
      try { await execute('ALTER TABLE conversations ADD COLUMN avatar_url TEXT DEFAULT ""'); } catch (e) {}
      try { await execute('ALTER TABLE messages ADD COLUMN is_system_notice INTEGER DEFAULT 0'); } catch (e) {}
    }
  },
  {
    version: 12,
    name: 'v2.5.0_bug_reports_reactions_and_replies',
    up: async () => {
      try { await execute('ALTER TABLE users ADD COLUMN reaction_picker_json TEXT DEFAULT \'["👍","❤️","😂","🔥","😮","🎉"]\''); } catch (e) {}
      try { await execute('ALTER TABLE users ADD COLUMN default_reaction TEXT DEFAULT "❤️"'); } catch (e) {}
      try { await execute('ALTER TABLE messages ADD COLUMN reply_to_id INTEGER DEFAULT NULL'); } catch (e) {}
      await execute(`
        CREATE TABLE IF NOT EXISTS message_reactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          message_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          emoji TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(message_id, user_id, emoji)
        )
      `);

      // Seed Bug Reports System Bot User
      const bugUser = await queryOne<any>('SELECT id FROM users WHERE username = "bug_reports"');
      if (!bugUser) {
        try {
          await execute(
            'INSERT INTO users (username, email, password_hash, display_name, role, is_email_verified, onboarding_completed) VALUES ("bug_reports", "bug_reports@webnook.local", "DISABLED", "Bug Reports & Support 🐛", "system", 1, 1)'
          );
        } catch (e) {}
      }
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
