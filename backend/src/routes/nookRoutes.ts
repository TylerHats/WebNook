import { Router, Request, Response } from 'express';
import { execute, query, queryOne } from '../db/connection';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/authMiddleware';

const router = Router();

// Helper to determine visitor relationship with Nook owner
async function getRelationship(visitorId: number | null, ownerId: number): Promise<'owner' | 'friend' | 'public'> {
  if (!visitorId) return 'public';
  if (visitorId === ownerId) return 'owner';

  const friendRow = await queryOne<any>(
    'SELECT status FROM friends WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) AND status = "accepted"',
    [visitorId, ownerId, ownerId, visitorId]
  );

  return friendRow ? 'friend' : 'public';
}

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
      'SELECT id, username, display_name, bio, avatar_url, banner_url, status_message, status_emoji, privacy_default, created_at FROM users WHERE username = ?',
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

    // Evaluate Nook visibility
    const visibility = nookSettings.visibility_nook || 'private';
    const canAccess =
      relationship === 'owner' ||
      visibility === 'public' ||
      (visibility === 'friends' && relationship === 'friend');

    if (!canAccess) {
      return res.status(403).json({
        is_private: true,
        relationship,
        owner: {
          id: owner.id,
          username: owner.username,
          display_name: owner.display_name,
          avatar_url: owner.avatar_url,
          status_message: owner.status_message,
          status_emoji: owner.status_emoji
        },
        nookSettings: {
          theme: nookSettings.theme,
          bg_color: nookSettings.bg_color,
          accent_color: nookSettings.accent_color,
          text_color: nookSettings.text_color
        },
        message: 'This Nook is private. Request friendship to view standard content.'
      });
    }

    // Fetch widgets enabled for nook
    const widgets = await query<any>(
      'SELECT * FROM nook_widgets WHERE user_id = ? AND is_enabled = 1 ORDER BY column_name, position_order ASC',
      [owner.id]
    );

    // Fetch stickers attached to nook
    const stickers = await query<any>('SELECT * FROM nook_stickers WHERE user_id = ?', [owner.id]);

    // Fetch Top Friends for Top 8/12 grid
    const topFriends = await query<any>(
      `SELECT f.top_position, u.id, u.username, u.display_name, u.avatar_url, u.status_message, u.status_emoji 
       FROM friends f 
       JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id) AND u.id != ?
       WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted' AND f.top_position > 0 
       ORDER BY f.top_position ASC`,
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

// Update Profile Info (Avatar, Banner, Bio, Status)
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { display_name, bio, avatar_url, banner_url, status_message, status_emoji, privacy_default } = req.body;

    await execute(
      `UPDATE users SET 
        display_name = COALESCE(?, display_name), 
        bio = COALESCE(?, bio), 
        avatar_url = COALESCE(?, avatar_url), 
        banner_url = COALESCE(?, banner_url), 
        status_message = COALESCE(?, status_message), 
        status_emoji = COALESCE(?, status_emoji), 
        privacy_default = COALESCE(?, privacy_default),
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [display_name, bio, avatar_url, banner_url, status_message, status_emoji, privacy_default, userId]
    );

    return res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update Nook Customization (Theme, CSS, Colors, Background Music)
router.put('/customization', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { theme, custom_css, bg_color, text_color, accent_color, bg_music_url, bg_music_title, visibility_nook, visibility_widgets, visibility_guestbook } = req.body;

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
        updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = ?`,
      [theme, custom_css, bg_color, text_color, accent_color, bg_music_url, bg_music_title, visibility_nook, visibility_widgets, visibility_guestbook, userId]
    );

    return res.json({ message: 'Nook customization saved' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update Nook customization' });
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

// Update Stickers (Add, position, scale, rotate, delete)
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
        'INSERT INTO nook_stickers (user_id, sticker_url, pos_x, pos_y, scale, rotation, z_index) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, s.sticker_url, s.pos_x || 50, s.pos_y || 50, s.scale || 1.0, s.rotation || 0, s.z_index || i + 1]
      );
    }

    return res.json({ message: 'Stickers updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update stickers' });
  }
});

export default router;
