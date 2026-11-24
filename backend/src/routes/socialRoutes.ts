import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { execute, query, queryOne } from '../db/connection';
import { authenticateToken, AuthenticatedRequest, JWT_SECRET } from '../middleware/authMiddleware';
import { createNotification } from './notificationRoutes';
import { parseCookies } from '../utils/security';

const router = Router();

// Helper to verify whether a visitor can access a target Nook's guestbook
async function canAccessNookGuestbook(visitorId: number | null, visitorRole: string | null, owner: any): Promise<{ allowed: boolean; status?: number; error?: string }> {
  if (!owner) return { allowed: false, status: 404, error: 'Nook owner not found' };
  if (owner.is_disabled) return { allowed: false, status: 403, error: 'This account is disabled' };

  if (visitorId && (visitorId === owner.id || visitorRole === 'admin')) {
    return { allowed: true };
  }

  const nook = await queryOne<any>('SELECT visibility_nook FROM nooks WHERE user_id = ?', [owner.id]);
  const visibility = nook?.visibility_nook || 'private';

  if (visibility === 'public') {
    return { allowed: true };
  }

  if (!visitorId) {
    return { allowed: false, status: 403, error: 'This guestbook belongs to a private Nook' };
  }

  const friendRow = await queryOne<any>(
    `SELECT id FROM friends WHERE status = 'accepted' AND ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))`,
    [visitorId, owner.id, owner.id, visitorId]
  );

  if (!friendRow) {
    return { allowed: false, status: 403, error: 'Only accepted friends can view or sign this private Nook guestbook' };
  }

  return { allowed: true };
}

// ======================== FRIEND REQUESTS & TOP FRIENDS ========================

// Get Friend List & Pending Requests
router.get('/friends', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const friends = await query<any>(
      `SELECT f.id as friendship_id, f.top_position, u.id, u.username, u.display_name, u.avatar_url, u.status_message, u.status_emoji 
       FROM friends f 
       JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id) AND u.id != ?
       WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
       ORDER BY f.top_position ASC, u.display_name ASC`,
      [userId, userId, userId]
    );

    const incomingRequests = await query<any>(
      `SELECT f.id as request_id, u.id as user_id, u.username, u.display_name, u.avatar_url 
       FROM friends f 
       JOIN users u ON f.user_id = u.id 
       WHERE f.friend_id = ? AND f.status = 'pending'`,
      [userId]
    );

    const outgoingRequests = await query<any>(
      `SELECT f.id as request_id, u.id as user_id, u.username, u.display_name, u.avatar_url 
       FROM friends f 
       JOIN users u ON f.friend_id = u.id 
       WHERE f.user_id = ? AND f.status = 'pending'`,
      [userId]
    );

    return res.json({ friends, incomingRequests, outgoingRequests });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// Send Friend Request
router.post('/friends/request', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { target_username } = req.body;

    if (!target_username) return res.status(400).json({ error: 'Target username is required' });

    const targetUser = await queryOne<any>('SELECT id FROM users WHERE username = ?', [target_username.trim().toLowerCase()]);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    if (targetUser.id === userId) return res.status(400).json({ error: 'You cannot send a friend request to yourself' });

    const existing = await queryOne<any>(
      'SELECT id, status FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [userId, targetUser.id, targetUser.id, userId]
    );

    if (existing) {
      if (existing.status === 'accepted') return res.status(400).json({ error: 'You are already friends' });
      return res.status(400).json({ error: 'A friend request is already pending between you two' });
    }

    await execute('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)', [userId, targetUser.id, 'pending']);

    return res.json({ message: 'Friend request sent successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Accept or Decline Friend Request
router.post('/friends/respond', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { request_id, action } = req.body;

    if (!request_id || !action) return res.status(400).json({ error: 'Request ID and Action required' });

    const reqRow = await queryOne<any>('SELECT * FROM friends WHERE id = ? AND friend_id = ?', [request_id, userId]);
    if (!reqRow) return res.status(404).json({ error: 'Friend request not found' });

    if (action === 'accept') {
      await execute('UPDATE friends SET status = "accepted" WHERE id = ?', [request_id]);
      return res.json({ message: 'Friend request accepted' });
    } else {
      await execute('DELETE FROM friends WHERE id = ?', [request_id]);
      return res.json({ message: 'Friend request declined' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to respond to friend request' });
  }
});

// Set Top 8 / Top 12 Friends Grid
router.put('/friends/top-grid', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { top_friends } = req.body;

    if (!Array.isArray(top_friends)) return res.status(400).json({ error: 'Array of top_friends expected' });

    await execute(
      'UPDATE friends SET top_position = 0 WHERE user_id = ? OR friend_id = ?',
      [userId, userId]
    );

    for (let i = 0; i < top_friends.length && i < 12; i++) {
      const friendId = top_friends[i];
      const position = i + 1;

      await execute(
        `UPDATE friends SET top_position = ? 
         WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
        [position, userId, friendId, friendId, userId]
      );
    }

    return res.json({ message: 'Top Friends grid updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update Top Friends grid' });
  }
});

// ======================== GUESTBOOK ========================

// Get Guestbook entries for a user Nook (with batched reactions & privacy enforcement)
router.get('/guestbook/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const owner = await queryOne<any>('SELECT id, is_disabled FROM users WHERE username = ?', [username.trim().toLowerCase()]);
    if (!owner) return res.status(404).json({ error: 'Nook owner not found' });

    let currentUserId: number | null = null;
    let currentUserRole: string | null = null;
    const authHeader = req.headers.authorization;
    const cookies = parseCookies(req.headers.cookie);
    const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : undefined) || cookies.token;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const visitor = await queryOne<any>('SELECT id, role, is_disabled FROM users WHERE id = ?', [decoded.id]);
        if (visitor && !visitor.is_disabled) {
          currentUserId = visitor.id;
          currentUserRole = visitor.role;
        }
      } catch {}
    }

    const access = await canAccessNookGuestbook(currentUserId, currentUserRole, owner);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error || 'Access denied' });
    }

    const rawEntries = await query<any>(
      `SELECT g.id, g.content, g.status, g.created_at, u.username, u.display_name, u.avatar_url 
       FROM guestbook_entries g 
       JOIN users u ON g.author_user_id = u.id 
       WHERE g.nook_user_id = ? AND g.status = 'approved' 
       ORDER BY g.created_at DESC`,
      [owner.id]
    );

    const reactionsByEntry = new Map<number, Map<string, { emoji: string; count: number; user_reacted: boolean; users: string[] }>>();
    if (rawEntries.length > 0) {
      const entryIds = rawEntries.map(e => e.id);
      const placeholders = entryIds.map(() => '?').join(',');
      const reactionRows = await query<any>(
        `SELECT gr.entry_id, gr.emoji, gr.user_id, u.username
         FROM guestbook_reactions gr
         JOIN users u ON gr.user_id = u.id
         WHERE gr.entry_id IN (${placeholders})
         ORDER BY gr.created_at ASC`,
        entryIds
      );

      for (const r of reactionRows) {
        let map = reactionsByEntry.get(r.entry_id);
        if (!map) {
          map = new Map();
          reactionsByEntry.set(r.entry_id, map);
        }
        if (!map.has(r.emoji)) {
          map.set(r.emoji, { emoji: r.emoji, count: 0, user_reacted: false, users: [] });
        }
        const item = map.get(r.emoji)!;
        item.count += 1;
        item.users.push(r.username);
        if (currentUserId && r.user_id === currentUserId) {
          item.user_reacted = true;
        }
      }
    }

    const entries = rawEntries.map(entry => ({
      ...entry,
      reactions: Array.from(reactionsByEntry.get(entry.id)?.values() || [])
    }));

    return res.json({ entries });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch guestbook' });
  }
});

// Post Guestbook Entry
router.post('/guestbook/:username', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authorId = req.user!.id;
    const { username } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) return res.status(400).json({ error: 'Comment content is required' });

    const owner = await queryOne<any>('SELECT id, is_disabled FROM users WHERE username = ?', [username.trim().toLowerCase()]);
    if (!owner) return res.status(404).json({ error: 'Nook owner not found' });

    const access = await canAccessNookGuestbook(authorId, req.user!.role, owner);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error || 'Not allowed to sign this guestbook' });
    }

    const result = await execute(
      'INSERT INTO guestbook_entries (nook_user_id, author_user_id, content, status) VALUES (?, ?, ?, ?)',
      [owner.id, authorId, content.trim(), 'approved']
    );

    if (owner.id !== authorId) {
      await createNotification(
        owner.id,
        'guestbook',
        authorId,
        'New Guestbook Note 📝',
        `@${req.user!.username} left a note on your Nook guestbook!`,
        `/nook/${username}`
      );
    }

    return res.json({
      message: 'Guestbook entry posted successfully',
      entry_id: result.lastID
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to post guestbook entry' });
  }
});

// Toggle Reaction on Guestbook Entry (Only Nook Owner)
router.post('/guestbook/entry/:id/reactions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji) return res.status(400).json({ error: 'Emoji reaction is required' });

    const entry = await queryOne<any>('SELECT * FROM guestbook_entries WHERE id = ?', [id]);
    if (!entry) return res.status(404).json({ error: 'Guestbook entry not found' });

    if (entry.nook_user_id !== userId) {
      return res.status(403).json({ error: 'Only the Nook owner can add reactions to guestbook comments on their profile.' });
    }

    const existing = await queryOne<any>('SELECT id FROM guestbook_reactions WHERE entry_id = ? AND user_id = ? AND emoji = ?', [id, userId, emoji]);

    if (existing) {
      await execute('DELETE FROM guestbook_reactions WHERE id = ?', [existing.id]);
    } else {
      await execute('INSERT INTO guestbook_reactions (entry_id, user_id, emoji) VALUES (?, ?, ?)', [id, userId, emoji]);
    }

    const reactionRows = await query<any>(`
      SELECT gr.emoji, gr.user_id, u.username
      FROM guestbook_reactions gr
      JOIN users u ON gr.user_id = u.id
      WHERE gr.entry_id = ?
      ORDER BY gr.created_at ASC
    `, [id]);

    const reactionMap = new Map<string, { emoji: string; count: number; user_reacted: boolean; users: string[] }>();
    for (const r of reactionRows) {
      if (!reactionMap.has(r.emoji)) {
        reactionMap.set(r.emoji, { emoji: r.emoji, count: 0, user_reacted: false, users: [] });
      }
      const item = reactionMap.get(r.emoji)!;
      item.count += 1;
      item.users.push(r.username);
      if (r.user_id === userId) {
        item.user_reacted = true;
      }
    }

    return res.json({ reactions: Array.from(reactionMap.values()) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update reaction' });
  }
});

// Delete Guestbook Entry (Owner or Author)
router.delete('/guestbook/entry/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const entry = await queryOne<any>('SELECT * FROM guestbook_entries WHERE id = ?', [id]);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    if (entry.nook_user_id !== userId && entry.author_user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this guestbook entry' });
    }

    await execute('DELETE FROM guestbook_entries WHERE id = ?', [id]);
    return res.json({ message: 'Guestbook entry deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete guestbook entry' });
  }
});

export default router;
