import { Router, Response } from 'express';
import { execute, query, queryOne } from '../db/connection';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';
import { createNotification } from './notificationRoutes';

const router = Router();

// Get Friends List, Incoming Pending Requests, and Top Friends Favorites
router.get('/list', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Confirmed friends
    const friends = await query<any>(
      `SELECT f.id as friendship_id, f.created_at, f.top_position,
              (CASE WHEN f.user_id = ? THEN COALESCE(f.user_is_favorite, f.is_favorite, 0) ELSE COALESCE(f.friend_is_favorite, 0) END) as is_favorite,
              (CASE WHEN f.user_id = ? THEN COALESCE(f.friend_is_favorite, 0) ELSE COALESCE(f.user_is_favorite, f.is_favorite, 0) END) as favorited_you,
              u.id as friend_user_id, u.username, u.display_name, u.avatar_url, u.status_message
       FROM friends f
       JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id) AND u.id != ?
       WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
       ORDER BY is_favorite DESC, f.top_position ASC, u.display_name ASC`,
      [userId, userId, userId, userId, userId]
    );

    // Pending incoming friend requests
    const pendingIncoming = await query<any>(
      `SELECT f.id as request_id, f.created_at, u.id as sender_id, u.username, u.display_name, u.avatar_url, u.status_message
       FROM friends f
       JOIN users u ON f.user_id = u.id
       WHERE f.friend_id = ? AND f.status = 'pending'`,
      [userId]
    );

    // Pending outgoing friend requests
    const pendingOutgoing = await query<any>(
      `SELECT f.id as request_id, f.created_at, u.id as recipient_id, u.username, u.display_name, u.avatar_url, u.status_message
       FROM friends f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = ? AND f.status = 'pending'`,
      [userId]
    );

    return res.json({
      friends,
      pendingIncoming,
      pendingOutgoing
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch friends list' });
  }
});

// Send Friend Request
router.post('/request', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sender = req.user!;
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Target username is required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const targetUser = await queryOne<any>('SELECT id, username FROM users WHERE username = ?', [cleanUsername]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.id === sender.id) {
      return res.status(400).json({ error: 'You cannot send a friend request to yourself' });
    }

    // Check existing relationship
    const existing = await queryOne<any>(
      'SELECT * FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [sender.id, targetUser.id, targetUser.id, sender.id]
    );

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: `You are already friends with @${targetUser.username}` });
      }
      return res.status(400).json({ error: `A pending friend request already exists with @${targetUser.username}` });
    }

    const result = await execute('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, "pending")', [
      sender.id,
      targetUser.id
    ]);

    // Send notification notice to target user
    await createNotification(
      targetUser.id,
      'friend_request',
      sender.id,
      'New Friend Request 🤝',
      `@${sender.username} sent you a friend request! Click to view and respond.`,
      `/nook/${sender.username}`
    );

    return res.json({ message: `Friend request sent to @${targetUser.username}!` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Update Top Friends Favorites & Positions
router.post('/favorites', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { favorites } = req.body; // Array of { friendship_id: number, is_favorite: boolean, top_position: number }

    if (!Array.isArray(favorites)) {
      return res.status(400).json({ error: 'Favorites array expected' });
    }

    for (const f of favorites) {
      await execute(
        `UPDATE friends 
         SET user_is_favorite = (CASE WHEN user_id = ? THEN ? ELSE user_is_favorite END),
             friend_is_favorite = (CASE WHEN friend_id = ? THEN ? ELSE friend_is_favorite END),
             is_favorite = (CASE WHEN user_id = ? THEN ? ELSE is_favorite END),
             top_position = ?
         WHERE id = ? AND (user_id = ? OR friend_id = ?)`,
        [userId, f.is_favorite ? 1 : 0, userId, f.is_favorite ? 1 : 0, userId, f.is_favorite ? 1 : 0, f.top_position || 0, f.friendship_id, userId, userId]
      );
    }

    return res.json({ message: 'Top Friends favorites updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update favorites' });
  }
});

// Remove Friend
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const friendshipId = req.params.id;

    await execute('DELETE FROM friends WHERE id = ? AND (user_id = ? OR friend_id = ?)', [
      friendshipId,
      userId,
      userId
    ]);

    return res.json({ message: 'Friend removed' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove friend' });
  }
});

export default router;
