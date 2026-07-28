import { Router, Request, Response } from 'express';
import { execute, query, queryOne } from '../db/connection';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

// ======================== FRIEND REQUESTS & TOP FRIENDS ========================

// Get Friend List & Pending Requests
router.get('/friends', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Accepted friends
    const friends = await query<any>(
      `SELECT f.id as friendship_id, f.top_position, u.id, u.username, u.display_name, u.avatar_url, u.status_message, u.status_emoji 
       FROM friends f 
       JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id) AND u.id != ?
       WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
       ORDER BY f.top_position ASC, u.display_name ASC`,
      [userId, userId, userId]
    );

    // Pending incoming requests
    const incomingRequests = await query<any>(
      `SELECT f.id as request_id, u.id as user_id, u.username, u.display_name, u.avatar_url 
       FROM friends f 
       JOIN users u ON f.user_id = u.id 
       WHERE f.friend_id = ? AND f.status = 'pending'`,
      [userId]
    );

    // Sent outgoing requests
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

    // Check existing relation
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
    const { request_id, action } = req.body; // 'accept' or 'decline'

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
    const { top_friends } = req.body; // Array of friend_user_ids in order 1..12

    if (!Array.isArray(top_friends)) return res.status(400).json({ error: 'Array of top_friends expected' });

    // Reset top_positions for user's friendships
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

// Get Guestbook entries for a user Nook
router.get('/guestbook/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const owner = await queryOne<any>('SELECT id FROM users WHERE username = ?', [username.trim().toLowerCase()]);
    if (!owner) return res.status(404).json({ error: 'Nook owner not found' });

    const entries = await query<any>(
      `SELECT g.id, g.content, g.status, g.created_at, u.username, u.display_name, u.avatar_url 
       FROM guestbook_entries g 
       JOIN users u ON g.author_user_id = u.id 
       WHERE g.nook_user_id = ? AND g.status = 'approved' 
       ORDER BY g.created_at DESC`,
      [owner.id]
    );

    return res.json({ entries });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch guestbook' });
  }
});

import { createNotification } from './notificationRoutes';

// Post Guestbook Entry
router.post('/guestbook/:username', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authorId = req.user!.id;
    const { username } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) return res.status(400).json({ error: 'Comment content is required' });

    const owner = await queryOne<any>('SELECT id FROM users WHERE username = ?', [username.trim().toLowerCase()]);
    if (!owner) return res.status(404).json({ error: 'Nook owner not found' });

    const result = await execute(
      'INSERT INTO guestbook_entries (nook_user_id, author_user_id, content, status) VALUES (?, ?, ?, ?)',
      [owner.id, authorId, content.trim(), 'approved']
    );

    // Notify Nook owner about the new guestbook note!
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
