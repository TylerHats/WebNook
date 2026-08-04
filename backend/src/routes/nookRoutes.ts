import { Router, Request, Response } from 'express';
import { execute, query, queryOne } from '../db/connection';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/authMiddleware';
import os from 'os';

const router = Router();

// Helper to determine visitor relationship with Nook owner
async function getRelationship(visitorId: number | null, ownerId: number): Promise<'owner' | 'friend' | 'pending_outgoing' | 'pending_incoming' | 'public'> {
  if (!visitorId) return 'public';
  if (visitorId === ownerId) return 'owner';

  const friendRow = await queryOne<any>(
    'SELECT user_id, friend_id, status FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
    [visitorId, ownerId, ownerId, visitorId]
  );

  if (!friendRow) return 'public';
  if (friendRow.status === 'accepted') return 'friend';
  if (friendRow.status === 'pending') {
    if (friendRow.user_id === visitorId) return 'pending_outgoing';
    return 'pending_incoming';
  }

  return 'public';
}

// Public / Authenticated System About Endpoint
router.get('/about', async (req: Request, res: Response) => {
  try {
    const channelRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "update_channel"');
    const channel = channelRow?.value || 'stable';

    const installedVersionRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "installed_version"');
    let version = installedVersionRow?.value || '3.3.2';

    let currentPkgVersion = '3.3.2';
    try {
      const rootPkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf8'));
      if (rootPkg && rootPkg.version) currentPkgVersion = rootPkg.version;
    } catch (e) {}

    if (!version) version = currentPkgVersion;

    const latestRelease = {
      tag: version.startsWith('v') ? version : `v${version}`,
      name: `WebNook ${version.startsWith('v') ? version : `v${version}`}`,
      notes: `WebNook Release ${version.startsWith('v') ? version : `v${version}`} — Features custom whitelabel branding, real-time messaging & reactions, responsive nook customization, theme engine, visual sticker studio, PWA support, and self-updater migrations.`,
      published_at: new Date().toISOString()
    };

    return res.json({
      currentVersion: version.startsWith('v') ? version : `v${version}`,
      channel,
      githubUrl: 'https://github.com/TylerHats/WebNook',
      latestRelease
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch system about info' });
  }
});

// Get Logged-In User Nook Settings
router.get('/settings/mine', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    let nookSettings = await queryOne<any>('SELECT * FROM nooks WHERE user_id = ?', [userId]);
    if (!nookSettings) {
      await execute('INSERT INTO nooks (user_id) VALUES (?)', [userId]);
      nookSettings = await queryOne<any>('SELECT * FROM nooks WHERE user_id = ?', [userId]);
    }
    return res.json({ nookSettings });
  } catch (err) {
    console.error('Error fetching nook settings:', err);
    return res.status(500).json({ error: 'Failed to fetch nook settings' });
  }
});

// Get Nook Profile by username
router.get('/profile/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const cleanUsername = username.trim().toLowerCase();

    // Check optional token header for logged in visitor
    let visitorId: number | null = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        visitorId = decoded.id;
      } catch (e) {
        // ignore invalid token for public view
      }
    }

    const owner = await queryOne<any>(
      'SELECT id, username, display_name, bio, avatar_url, banner_url, avatar_original_url, banner_original_url, status_message, status_emoji, privacy_default, is_disabled, disabled_reason, created_at FROM users WHERE username = ?',
      [cleanUsername]
    );

    if (!owner) {
      return res.status(404).json({ error: 'Nook not found' });
    }

    const relationship = await getRelationship(visitorId, owner.id);

    // Fetch Nook style configuration
    let nookSettings = await queryOne<any>('SELECT * FROM nooks WHERE user_id = ?', [owner.id]);
    if (!nookSettings) {
      await execute('INSERT INTO nooks (user_id) VALUES (?)', [owner.id]);
      nookSettings = await queryOne<any>('SELECT * FROM nooks WHERE user_id = ?', [owner.id]);
    }

    if (owner.is_disabled) {
      return res.status(403).json({
        is_disabled: true,
        disabled_reason: owner.disabled_reason || 'This user account has been disabled by site administrators.',
        relationship,
        owner: {
          id: owner.id,
          username: owner.username,
          display_name: owner.display_name,
          avatar_url: owner.avatar_url,
          avatar_original_url: owner.avatar_original_url,
          status_message: owner.status_message,
          status_emoji: owner.status_emoji
        },
        nookSettings: {
          theme: nookSettings.theme,
          bg_color: nookSettings.bg_color,
          accent_color: nookSettings.accent_color,
          text_color: nookSettings.text_color
        }
      });
    }

    // Evaluate Nook visibility ('private' = Friends Only Access, 'public' = Everyone)
    const visibility = nookSettings.visibility_nook || 'private';
    const canAccess =
      relationship === 'owner' ||
      visibility === 'public' ||
      ((visibility === 'private' || visibility === 'friends') && relationship === 'friend');

    if (!canAccess) {
      return res.status(403).json({
        is_private: true,
        relationship,
        owner: {
          id: owner.id,
          username: owner.username,
          display_name: owner.display_name,
          avatar_url: owner.avatar_url,
          avatar_original_url: owner.avatar_original_url,
          status_message: owner.status_message,
          status_emoji: owner.status_emoji
        },
        nookSettings: {
          theme: nookSettings.theme,
          bg_color: nookSettings.bg_color,
          accent_color: nookSettings.accent_color,
          text_color: nookSettings.text_color
        },
        message: `Shh... @${owner.username}'s Nook is currently private & cozy! 🔒✨ Sign in and send a friend request to step inside and explore their space!`
      });
    }

    // Fetch widgets enabled for nook
    const widgets = await query<any>(
      'SELECT * FROM nook_widgets WHERE user_id = ? AND is_enabled = 1 ORDER BY column_name, position_order ASC',
      [owner.id]
    );

    // Fetch stickers attached to nook
    const stickers = await query<any>('SELECT * FROM nook_stickers WHERE user_id = ?', [owner.id]);

    // Fetch Top Friends for Top 8/12 grid (Unidirectional: Only friends that owner.id favorited)
    const topFriends = await query<any>(
      `SELECT f.top_position, u.id, u.username, u.display_name, u.avatar_url, u.status_message, u.status_emoji 
       FROM friends f 
       JOIN users u ON (CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END) = u.id
       WHERE f.status = 'accepted' 
         AND f.top_position > 0
         AND (
           (f.user_id = ? AND COALESCE(f.user_is_favorite, f.is_favorite, 0) = 1) OR
           (f.friend_id = ? AND COALESCE(f.friend_is_favorite, 0) = 1)
         )
       ORDER BY f.top_position ASC, u.display_name ASC`,
      [owner.id, owner.id, owner.id]
    );

    return res.json({
      is_private: false,
      relationship,
      owner,
      nookSettings,
      widgets,
      stickers,
      topFriends
    });
  } catch (err: any) {
    console.error('Nook fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch Nook profile' });
  }
});

import fs from 'fs';
import path from 'path';
import multer from 'multer';

// Configure Multer Storage for Media Uploads (Avatars, Banners, Music files)
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const uploadMedia = multer({
  storage: mediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // Generous 50MB max file size limit
});

import { processImageUpload, processAudioUpload } from '../services/mediaService';

// Upload User Avatar Image File
// Upload User Avatar Image File
router.post('/upload/avatar', authenticateToken, uploadMedia.fields([{ name: 'avatar', maxCount: 1 }, { name: 'avatar_original', maxCount: 1 }]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const avatarFile = files?.['avatar']?.[0] || req.file;
    const originalFile = files?.['avatar_original']?.[0];

    if (!avatarFile) {
      return res.status(400).json({ error: 'No avatar image file uploaded' });
    }

    const isRecrop = req.query.is_recrop === 'true' || req.body?.is_recrop === 'true';
    const webpFilename = await processImageUpload(avatarFile.path, uploadsDir, 'avatar');
    const avatarUrl = `/uploads/${webpFilename}`;

    let avatarOriginalUrl = avatarUrl;
    if (originalFile) {
      const origWebpFilename = await processImageUpload(originalFile.path, uploadsDir, 'avatar_orig');
      avatarOriginalUrl = `/uploads/${origWebpFilename}`;
    }

    if (originalFile) {
      await execute('UPDATE users SET avatar_url = ?, avatar_original_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        avatarUrl,
        avatarOriginalUrl,
        req.user!.id
      ]);
    } else {
      const existingUser = await queryOne<any>('SELECT avatar_original_url FROM users WHERE id = ?', [req.user!.id]);
      const finalOrig = existingUser?.avatar_original_url || avatarUrl;
      await execute('UPDATE users SET avatar_url = ?, avatar_original_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        avatarUrl,
        finalOrig,
        req.user!.id
      ]);
    }

    const updatedUser = await queryOne<any>('SELECT avatar_url, avatar_original_url FROM users WHERE id = ?', [req.user!.id]);

    return res.json({
      message: 'Avatar image uploaded & processed successfully',
      avatar_url: updatedUser.avatar_url,
      avatar_original_url: updatedUser.avatar_original_url || updatedUser.avatar_url
    });
  } catch (err: any) {
    console.error('Avatar upload error:', err);
    return res.status(500).json({ error: 'Failed to upload avatar image' });
  }
});

// Upload User Banner Image File
router.post('/upload/banner', authenticateToken, uploadMedia.fields([{ name: 'banner', maxCount: 1 }, { name: 'banner_original', maxCount: 1 }]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const bannerFile = files?.['banner']?.[0] || req.file;
    const originalFile = files?.['banner_original']?.[0];

    if (!bannerFile) {
      return res.status(400).json({ error: 'No banner image file uploaded' });
    }

    const isRecrop = req.query.is_recrop === 'true' || req.body?.is_recrop === 'true';
    const webpFilename = await processImageUpload(bannerFile.path, uploadsDir, 'banner');
    const bannerUrl = `/uploads/${webpFilename}`;

    let bannerOriginalUrl = bannerUrl;
    if (originalFile) {
      const origWebpFilename = await processImageUpload(originalFile.path, uploadsDir, 'banner_orig');
      bannerOriginalUrl = `/uploads/${origWebpFilename}`;
    }

    if (originalFile) {
      await execute('UPDATE users SET banner_url = ?, banner_original_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        bannerUrl,
        bannerOriginalUrl,
        req.user!.id
      ]);
    } else {
      const existingUser = await queryOne<any>('SELECT banner_original_url FROM users WHERE id = ?', [req.user!.id]);
      const finalOrig = existingUser?.banner_original_url || bannerUrl;
      await execute('UPDATE users SET banner_url = ?, banner_original_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        bannerUrl,
        finalOrig,
        req.user!.id
      ]);
    }

    const updatedUser = await queryOne<any>('SELECT banner_url, banner_original_url FROM users WHERE id = ?', [req.user!.id]);

    return res.json({
      message: 'Banner image uploaded & processed successfully',
      banner_url: updatedUser.banner_url,
      banner_original_url: updatedUser.banner_original_url || updatedUser.banner_url
    });
  } catch (err: any) {
    console.error('Banner upload error:', err);
    return res.status(500).json({ error: 'Failed to upload banner image' });
  }
});

// Upload Custom Sticker Image File
router.post('/upload/sticker', authenticateToken, uploadMedia.single('sticker'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No sticker image file uploaded' });
    }

    const webpFilename = await processImageUpload(req.file.path, uploadsDir, 'sticker');
    const stickerUrl = `/uploads/${webpFilename}`;

    return res.json({ message: 'Custom sticker uploaded successfully', sticker_url: stickerUrl });
  } catch (err: any) {
    console.error('Sticker upload error:', err);
    return res.status(500).json({ error: 'Failed to upload custom sticker' });
  }
});

// Upload Background Anthem Audio File (MP3 / WAV / OGG)
router.post('/upload/music', authenticateToken, uploadMedia.single('music'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const mp3Filename = await processAudioUpload(req.file.path, uploadsDir, 'music');
    const musicUrl = `/uploads/${mp3Filename}`;
    await execute('UPDATE nooks SET bg_music_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [
      musicUrl,
      req.user!.id
    ]);

    return res.json({ message: 'Background music uploaded & processed to standard MP3', bg_music_url: musicUrl });
  } catch (err: any) {
    console.error('Music upload error:', err);
    return res.status(500).json({ error: 'Failed to upload audio file' });
  }
});

// Complete Initial User Nook Onboarding Wizard
router.post('/onboarding/complete', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { display_name, bio, status_message, status_emoji, bg_music_title } = req.body;

    await execute(
      `UPDATE users SET 
        display_name = COALESCE(?, display_name), 
        bio = COALESCE(?, bio), 
        status_message = COALESCE(?, status_message), 
        status_emoji = COALESCE(?, status_emoji), 
        onboarding_completed = 1,
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [display_name, bio, status_message, status_emoji, userId]
    );

    if (bg_music_title) {
      await execute('UPDATE nooks SET bg_music_title = ? WHERE user_id = ?', [bg_music_title, userId]);
    }

    const updatedUser = await queryOne<any>(
      'SELECT id, username, email, display_name, bio, avatar_url, banner_url, avatar_original_url, banner_original_url, status_message, status_emoji, role, is_email_verified, onboarding_completed FROM users WHERE id = ?',
      [userId]
    );

    return res.json({
      message: 'Onboarding wizard completed successfully!',
      user: {
        ...updatedUser,
        is_email_verified: !!updatedUser.is_email_verified,
        onboarding_completed: !!updatedUser.onboarding_completed
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

// Update Profile Info (Avatar, Banner, Bio, Status, Notification Preferences)
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { display_name, bio, avatar_url, banner_url, status_message, status_emoji, privacy_default, notify_email_guestbook, notify_email_friends, notify_email_system, notify_email_messages } = req.body;

    await execute(
      `UPDATE users SET 
        display_name = COALESCE(?, display_name), 
        bio = COALESCE(?, bio), 
        avatar_url = COALESCE(?, avatar_url), 
        banner_url = COALESCE(?, banner_url), 
        status_message = COALESCE(?, status_message), 
        status_emoji = COALESCE(?, status_emoji), 
        privacy_default = COALESCE(?, privacy_default),
        notify_email_guestbook = COALESCE(?, notify_email_guestbook),
        notify_email_friends = COALESCE(?, notify_email_friends),
        notify_email_system = COALESCE(?, notify_email_system),
        notify_email_messages = COALESCE(?, notify_email_messages),
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        display_name,
        bio,
        avatar_url,
        banner_url,
        status_message,
        status_emoji,
        privacy_default,
        notify_email_guestbook !== undefined ? (notify_email_guestbook ? 1 : 0) : null,
        notify_email_friends !== undefined ? (notify_email_friends ? 1 : 0) : null,
        notify_email_system !== undefined ? (notify_email_system ? 1 : 0) : null,
        notify_email_messages !== undefined ? (notify_email_messages ? 1 : 0) : null,
        userId
      ]
    );

    return res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update Nook Customization (Theme, CSS, Colors, Music, Steam, Card Visibility & Colors)
router.put('/customization', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    // Ensure nook row exists for this user before updating
    await execute('INSERT OR IGNORE INTO nooks (user_id) VALUES (?)', [userId]);

    const {
      theme,
      custom_css,
      bg_color,
      text_color,
      accent_color,
      bg_music_url,
      bg_music_title,
      visibility_nook,
      visibility_widgets,
      visibility_guestbook,
      steam_id64,
      steam_display_mode,
      spotify_track_url,
      apple_music_url,
      card_visibility_json,
      card_colors_json,
      card_titles_json,
      music_tracks_json,
      top_songs_json,
      favorite_movies_json,
      favorite_books_json,
      hobbies_json,
      card_layout_json,
      storygraph_username,
      spotify_personal_mode,
      theme_sounds_enabled,
      theme_animations_enabled
    } = req.body;

    const cardVisString = typeof card_visibility_json === 'object' ? JSON.stringify(card_visibility_json) : card_visibility_json;
    const cardColorsString = typeof card_colors_json === 'object' ? JSON.stringify(card_colors_json) : card_colors_json;
    const cardTitlesString = typeof card_titles_json === 'object' ? JSON.stringify(card_titles_json) : card_titles_json;
    const musicTracksString = typeof music_tracks_json === 'object' ? JSON.stringify(music_tracks_json) : music_tracks_json;
    const topSongsString = typeof top_songs_json === 'object' ? JSON.stringify(top_songs_json) : top_songs_json;
    const favMoviesString = typeof favorite_movies_json === 'object' ? JSON.stringify(favorite_movies_json) : favorite_movies_json;
    const favBooksString = typeof favorite_books_json === 'object' ? JSON.stringify(favorite_books_json) : favorite_books_json;
    const hobbiesString = typeof hobbies_json === 'object' ? JSON.stringify(hobbies_json) : hobbies_json;
    const cardLayoutString = typeof card_layout_json === 'object' ? JSON.stringify(card_layout_json) : card_layout_json;

    await execute(
      `UPDATE nooks SET 
        theme = COALESCE(?, theme), 
        custom_css = COALESCE(?, custom_css), 
        bg_color = COALESCE(?, bg_color), 
        text_color = COALESCE(?, text_color), 
        accent_color = COALESCE(?, accent_color), 
        bg_music_url = COALESCE(?, bg_music_url), 
        bg_music_title = COALESCE(?, bg_music_title), 
        visibility_nook = COALESCE(?, visibility_nook), 
        visibility_widgets = COALESCE(?, visibility_widgets), 
        visibility_guestbook = COALESCE(?, visibility_guestbook), 
        steam_id64 = COALESCE(?, steam_id64),
        steam_display_mode = COALESCE(?, steam_display_mode),
        spotify_track_url = COALESCE(?, spotify_track_url),
        apple_music_url = COALESCE(?, apple_music_url),
        card_visibility_json = COALESCE(?, card_visibility_json),
        card_colors_json = COALESCE(?, card_colors_json),
        card_titles_json = COALESCE(?, card_titles_json),
        music_tracks_json = COALESCE(?, music_tracks_json),
        top_songs_json = COALESCE(?, top_songs_json),
        favorite_movies_json = COALESCE(?, favorite_movies_json),
        favorite_books_json = COALESCE(?, favorite_books_json),
        hobbies_json = COALESCE(?, hobbies_json),
        card_layout_json = COALESCE(?, card_layout_json),
        storygraph_username = COALESCE(?, storygraph_username),
        spotify_personal_mode = COALESCE(?, spotify_personal_mode),
        theme_sounds_enabled = COALESCE(?, theme_sounds_enabled),
        theme_animations_enabled = COALESCE(?, theme_animations_enabled),
        updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = ?`,
      [
        theme,
        custom_css,
        bg_color,
        text_color,
        accent_color,
        bg_music_url,
        bg_music_title,
        visibility_nook,
        visibility_widgets,
        visibility_guestbook,
        steam_id64,
        steam_display_mode,
        spotify_track_url,
        apple_music_url,
        cardVisString,
        cardColorsString,
        cardTitlesString,
        musicTracksString,
        topSongsString,
        favMoviesString,
        favBooksString,
        hobbiesString,
        cardLayoutString,
        storygraph_username,
        spotify_personal_mode,
        theme_sounds_enabled !== undefined ? (theme_sounds_enabled ? 1 : 0) : null,
        theme_animations_enabled !== undefined ? (theme_animations_enabled ? 1 : 0) : null,
        userId
      ]
    );

    return res.json({ message: 'Nook customization updated successfully' });
  } catch (err) {
    console.error('Customization update error:', err);
    return res.status(500).json({ error: 'Failed to update Nook customization' });
  }
});

// StoryGraph CSV Import Endpoint
const csvUpload = multer({ dest: path.join(os.tmpdir(), 'webnook-storygraph') });
router.post('/import/storygraph', authenticateToken, csvUpload.single('csv'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file || !fs.existsSync(req.file.path)) {
      return res.status(400).json({ error: 'No StoryGraph CSV file uploaded' });
    }

    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    fs.unlinkSync(req.file.path);

    const lines = fileContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV file is empty or invalid' });
    }

    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
    const titleIdx = headers.findIndex(h => h.includes('title'));
    const authorIdx = headers.findIndex(h => h.includes('authors') || h.includes('author'));
    const starIdx = headers.findIndex(h => h.includes('star rating') || h.includes('rating'));

    const importedBooks: any[] = [];
    for (let i = 1; i < lines.length && importedBooks.length < 15; i++) {
      // Basic CSV regex split taking quotes into account
      const cols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
      const cleanCols = cols.map(c => c.replace(/^"|"$/g, '').trim());

      const title = titleIdx !== -1 && cleanCols[titleIdx] ? cleanCols[titleIdx] : '';
      const author = authorIdx !== -1 && cleanCols[authorIdx] ? cleanCols[authorIdx] : '';
      const rating = starIdx !== -1 && cleanCols[starIdx] ? cleanCols[starIdx] : '5';

      if (title && title.length > 1) {
        importedBooks.push({
          id: `sg_${Date.now()}_${i}`,
          title,
          author,
          year: '',
          rating: rating ? `${rating} ⭐` : '5 ⭐',
          coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=80'
        });
      }
    }

    return res.json({
      message: `Successfully imported ${importedBooks.length} books from StoryGraph CSV!`,
      books: importedBooks
    });
  } catch (err: any) {
    return res.status(500).json({ error: `StoryGraph import failed: ${err.message}` });
  }
});

// Save Nook Widgets Configuration & Order
router.put('/widgets', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { widgets } = req.body; // Array of widgets

    if (!Array.isArray(widgets)) {
      return res.status(400).json({ error: 'Widgets array expected' });
    }

    // Delete current widgets and re-insert
    await execute('DELETE FROM nook_widgets WHERE user_id = ?', [userId]);

    for (let i = 0; i < widgets.length; i++) {
      const w = widgets[i];
      await execute(
        'INSERT INTO nook_widgets (user_id, widget_type, title, column_name, position_order, config_json, is_enabled) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          userId,
          w.widget_type,
          w.title || '',
          w.column_name || 'left',
          i,
          typeof w.config_json === 'object' ? JSON.stringify(w.config_json) : w.config_json || '{}',
          w.is_enabled !== undefined ? (w.is_enabled ? 1 : 0) : 1
        ]
      );
    }

    return res.json({ message: 'Widgets updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update widgets' });
  }
});

// Update Stickers (Add, position, scale, rotate, layer, delete)
router.put('/stickers', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { stickers } = req.body;

    if (!Array.isArray(stickers)) {
      return res.status(400).json({ error: 'Stickers array expected' });
    }

    await execute('DELETE FROM nook_stickers WHERE user_id = ?', [userId]);

    for (let i = 0; i < stickers.length; i++) {
      const s = stickers[i];
      await execute(
        'INSERT INTO nook_stickers (user_id, sticker_url, pos_x, pos_y, scale, rotation, z_index, layer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          userId,
          s.sticker_url,
          s.pos_x || 50,
          s.pos_y || 50,
          s.scale || 1.0,
          s.rotation || 0,
          s.z_index || i + 1,
          s.layer || 'above_cards'
        ]
      );
    }

    return res.json({ message: 'Stickers updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update stickers' });
  }
});

// Delete User Account & Anonymize Data
router.delete('/account', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // 1. Anonymize user record placeholders & clear credentials
    const deletedUsername = `deleted_user_${userId}`;
    const deletedEmail = `deleted_${userId}_${Date.now()}@webnook.local`;

    await execute(
      `UPDATE users SET 
        username = ?,
        display_name = 'Deleted User',
        email = ?,
        password_hash = 'ACCOUNT_DELETED',
        avatar_url = '/branding/default_avatar.svg',
        banner_url = '',
        bio = '',
        status_message = '',
        status_emoji = '',
        is_disabled = 1,
        disabled_reason = 'Account deleted by user',
        is_totp_enabled = 0,
        totp_secret = NULL
       WHERE id = ?`,
      [deletedUsername, deletedEmail, userId]
    );

    // 2. Remove user relationships and personal settings
    await execute('DELETE FROM friends WHERE user_id = ? OR friend_id = ?', [userId, userId]);
    await execute('DELETE FROM nooks WHERE user_id = ?', [userId]);
    await execute('DELETE FROM nook_widgets WHERE user_id = ?', [userId]);
    await execute('DELETE FROM nook_stickers WHERE user_id = ?', [userId]);
    await execute('DELETE FROM passkey_credentials WHERE user_id = ?', [userId]);
    await execute('DELETE FROM password_resets WHERE user_id = ?', [userId]);
    await execute('DELETE FROM email_verifications WHERE user_id = ?', [userId]);
    await execute('DELETE FROM notifications WHERE user_id = ? OR sender_id = ?', [userId, userId]);
    await execute('DELETE FROM conversation_members WHERE user_id = ?', [userId]);

    return res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Account deletion error:', err);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
