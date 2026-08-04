import { Router, Response } from 'express';
import { execute, query, queryOne } from '../db/connection';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';
import { sendStyledEmail } from '../services/emailService';

const router = Router();

export async function createNotification(
  userId: number,
  type: 'guestbook' | 'friend_request' | 'friend_accept' | 'friend_reject' | 'system',
  senderId: number | null,
  title: string,
  message: string,
  linkUrl: string = '',
  linkTitle: string = '',
  skipNoticeDbRow: boolean = false
) {
  try {
    if (!skipNoticeDbRow) {
      await execute(
        'INSERT INTO notifications (user_id, type, sender_id, title, message, link_url, link_title) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, type, senderId, title, message, linkUrl, linkTitle]
      );
    }

    // Check user email notification preferences
    const recipient = await queryOne<any>('SELECT email, username, notify_email_guestbook, notify_email_friends, notify_email_system FROM users WHERE id = ?', [userId]);
    if (recipient && recipient.email) {
      let sendEmail = false;
      if (type === 'guestbook' && recipient.notify_email_guestbook !== 0) sendEmail = true;
      if ((type === 'friend_request' || type === 'friend_accept') && recipient.notify_email_friends !== 0) sendEmail = true;
      if (type === 'system' && recipient.notify_email_system !== 0) sendEmail = true;

      if (sendEmail) {
        sendStyledEmail({
          to: recipient.email,
          subject: `${title} - WebNook Notification`,
          title: title,
          bodyHtml: `<p>Hello @<strong>${recipient.username}</strong>,</p><p>${message}</p>`,
          actionUrl: linkUrl ? linkUrl : undefined,
          actionText: linkUrl ? (linkTitle || 'View Notification') : undefined
        });
      }
    }
  } catch (err) {
    console.error('[Notification System Error] Failed to create notification:', err);
  }
}

// Get Notifications & Unread Count for Logged-In User
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const notifications = await query<any>(
      `SELECT n.*, u.username as sender_username, u.display_name as sender_display_name, u.avatar_url as sender_avatar_url
       FROM notifications n
       LEFT JOIN users u ON n.sender_id = u.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC LIMIT 50`,
      [userId]
    );

    const unreadCountRow = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    // Also fetch pending incoming friend requests for the Friend Requests tab
    const pendingFriendRequests = await query<any>(
      `SELECT f.id as request_id, f.created_at, u.id as user_id, u.username, u.display_name, u.avatar_url, u.status_message
       FROM friends f
       JOIN users u ON f.user_id = u.id
       WHERE f.friend_id = ? AND f.status = 'pending'`,
      [userId]
    );

    return res.json({
      notifications,
      unreadCount: unreadCountRow?.count || 0,
      pendingFriendRequests
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark All Notifications as Read
router.post('/read-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user!.id]);
    return res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Clear / Delete All Notifications
router.delete('/clear-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await execute('DELETE FROM notifications WHERE user_id = ?', [req.user!.id]);
    return res.json({ message: 'All notifications cleared' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// Inline Accept or Reject Friend Request from Notification Popover
router.post('/respond-friend', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { request_id, action } = req.body; // action: 'accept' | 'reject'

    if (!request_id || !action) {
      return res.status(400).json({ error: 'Request ID and action required' });
    }

    const requestRow = await queryOne<any>('SELECT * FROM friends WHERE id = ? AND friend_id = ?', [request_id, userId]);
    if (!requestRow) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const sender = await queryOne<any>('SELECT username FROM users WHERE id = ?', [requestRow.user_id]);
    const me = req.user!;

    if (action === 'accept') {
      await execute('UPDATE friends SET status = "accepted" WHERE id = ?', [request_id]);

      // Notify original requester that their request was accepted!
      await createNotification(
        requestRow.user_id,
        'friend_accept',
        userId,
        'Friend Request Accepted 🎉',
        `@${me.username} accepted your friend request! You can now visit each other's Nooks and view friend-only content.`,
        `/nook/${me.username}`
      );

      return res.json({ message: `Accepted friend request from @${sender?.username || 'user'}` });
    } else {
      await execute('DELETE FROM friends WHERE id = ?', [request_id]);

      // Notify original requester that their request was declined
      await createNotification(
        requestRow.user_id,
        'friend_reject',
        userId,
        'Friend Request Declined',
        `@${me.username} declined your friend request.`,
        `/nook/${me.username}`
      );

      return res.json({ message: `Declined friend request from @${sender?.username || 'user'}` });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to process friend request' });
  }
});

export default router;
