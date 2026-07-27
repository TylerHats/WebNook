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
