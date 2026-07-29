import { Router, Response } from 'express';
import { execute, query, queryOne } from '../db/connection';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/authMiddleware';
import { createNotification } from './notificationRoutes';
import { sendStyledEmail } from '../services/emailService';

const router = Router();

// Helper to get or create the System Bot User (System Announcements)
export async function getSystemBotUser() {
  let sys = await queryOne<any>('SELECT id, username, display_name, avatar_url FROM users WHERE username = "system"');
  if (!sys) {
    try {
      await execute(
        'INSERT INTO users (username, email, password_hash, display_name, role, is_email_verified, onboarding_completed) VALUES ("system", "system@webnook.local", "DISABLED", "System Announcement 🤖", "system", 1, 1)'
      );
      sys = await queryOne<any>('SELECT id, username, display_name, avatar_url FROM users WHERE username = "system"');
    } catch (e) {
      console.error('[Messages System Error] Failed to create System Bot user:', e);
    }
  }
  return sys;
}

// Helper to get or create the Bug Reports System Bot User
export async function getBugReportsBotUser() {
  let bug = await queryOne<any>('SELECT id, username, display_name, avatar_url FROM users WHERE username = "bug_reports"');
  if (!bug) {
    try {
      await execute(
        'INSERT INTO users (username, email, password_hash, display_name, role, is_email_verified, onboarding_completed) VALUES ("bug_reports", "bug_reports@webnook.local", "DISABLED", "Bug Reports & Support 🐛", "system", 1, 1)'
      );
      bug = await queryOne<any>('SELECT id, username, display_name, avatar_url FROM users WHERE username = "bug_reports"');
    } catch (e) {
      console.error('[Messages System Error] Failed to create Bug Reports Bot user:', e);
    }
  }
  return bug;
}

// Helper to ensure System Announcement DM conversation exists for a user
async function ensureSystemDM(userId: number) {
  const sys = await getSystemBotUser();
  if (!sys || sys.id === userId) return null;

  const existing = await queryOne<any>(`
    SELECT c.id 
    FROM conversations c
    JOIN conversation_members cm1 ON c.id = cm1.conversation_id
    JOIN conversation_members cm2 ON c.id = cm2.conversation_id
    WHERE c.type = 'direct' AND cm1.user_id = ? AND cm2.user_id = ? AND cm1.id != cm2.id
  `, [userId, sys.id]);

  if (existing) return existing.id;

  const res = await execute('INSERT INTO conversations (type, name, creator_user_id) VALUES ("direct", "System 🤖", ?)', [sys.id]);
  const convId = res.lastID;

  await execute('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)', [convId, userId]);
  await execute('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)', [convId, sys.id]);

  await execute(
    'INSERT INTO messages (conversation_id, sender_id, content, is_system_notice) VALUES (?, ?, ?, 0)',
    [convId, sys.id, 'Welcome to WebNook System Announcements! 🤖\n\nSecurity alerts, system news, and admin updates will appear right here. Non-admin users cannot send messages to this channel.']
  );

  return convId;
}

// Helper to ensure Bug Reports DM conversation exists for a user
async function ensureBugReportsDM(userId: number) {
  const bug = await getBugReportsBotUser();
  if (!bug || bug.id === userId) return null;

  const existing = await queryOne<any>(`
    SELECT c.id 
    FROM conversations c
    JOIN conversation_members cm1 ON c.id = cm1.conversation_id
    JOIN conversation_members cm2 ON c.id = cm2.conversation_id
    WHERE c.type = 'direct' AND cm1.user_id = ? AND cm2.user_id = ? AND cm1.id != cm2.id
  `, [userId, bug.id]);

  if (existing) return existing.id;

  const res = await execute('INSERT INTO conversations (type, name, creator_user_id) VALUES ("direct", "Bug Reports 🐛", ?)', [bug.id]);
  const convId = res.lastID;

  await execute('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)', [convId, userId]);
  await execute('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)', [convId, bug.id]);

  // Add site administrators to conversation_members so admins can view and reply to user bug report threads
  const admins = await query<any>('SELECT id FROM users WHERE role = "admin" AND is_disabled = 0');
  for (const a of admins) {
    if (a.id !== userId && a.id !== bug.id) {
      await execute('INSERT OR IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?)', [convId, a.id]);
    }
  }

  await execute(
    'INSERT INTO messages (conversation_id, sender_id, content, is_system_notice) VALUES (?, ?, ?, 0)',
    [convId, bug.id, 'Welcome to Bug Reports & Support 🐛\n\nAnything you send here will be submitted directly to WebNook Administrators for review. Your messages remain private between you and site administrators.']
  );

  return convId;
}

// Helper: Check if two users are accepted friends
async function areAcceptedFriends(userA: number, userB: number): Promise<boolean> {
  if (userA === userB) return true;
  const friendRow = await queryOne<any>(`
    SELECT id FROM friends 
    WHERE ((user_id = ? AND friend_user_id = ?) OR (user_id = ? AND friend_user_id = ?))
      AND status = 'accepted'
  `, [userA, userB, userB, userA]);

  return !!friendRow;
}

// 1. Get Unread Message Count across all unmuted conversations
router.get('/unread-count', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await ensureSystemDM(userId);
    await ensureBugReportsDM(userId);

    const result = await queryOne<{ total_unread: number }>(`
      SELECT COUNT(m.id) as total_unread
      FROM messages m
      JOIN conversation_members cm ON m.conversation_id = cm.conversation_id
      WHERE cm.user_id = ? 
        AND cm.is_muted = 0 
        AND m.sender_id != ? 
        AND m.created_at > cm.last_read_at
    `, [userId, userId]);

    return res.json({ unread_count: result?.total_unread || 0 });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// 2. List all conversations for the logged-in user
router.get('/conversations', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await ensureSystemDM(userId);
    await ensureBugReportsDM(userId);

    const convRows = await query<any>(`
      SELECT 
        c.id, c.type, c.name, c.avatar_url, c.creator_user_id, c.created_at, c.updated_at,
        cm.is_muted, cm.last_read_at
      FROM conversations c
      JOIN conversation_members cm ON c.id = cm.conversation_id
      WHERE cm.user_id = ?
      ORDER BY c.updated_at DESC
    `, [userId]);

    const conversations = [];
    const seenSystemUserIds = new Set<number>();

    for (const c of convRows) {
      // Unread count
      const unreadRow = await queryOne<{ count: number }>(`
        SELECT COUNT(id) as count FROM messages 
        WHERE conversation_id = ? AND sender_id != ? AND created_at > ?
      `, [c.id, userId, c.last_read_at || '1970-01-01']);

      // Fetch members
      const members = await query<any>(`
        SELECT 
          u.id, u.username, u.display_name, u.avatar_url, u.role,
          n.theme, n.bg_color, n.accent_color, n.text_color
        FROM conversation_members cm
        JOIN users u ON cm.user_id = u.id
        LEFT JOIN nooks n ON n.user_id = u.id
        WHERE cm.conversation_id = ?
      `, [c.id]);

      let isLocked = false;
      let otherMember = members.find((m: any) => m.id !== userId);

      // Deduplicate direct system bot conversations if duplicate rows exist
      if (c.type === 'direct' && otherMember) {
        if (otherMember.role === 'system' || otherMember.username === 'system' || otherMember.username === 'bug_reports') {
          if (seenSystemUserIds.has(otherMember.id)) {
            continue; // Skip duplicate conversation
          }
          seenSystemUserIds.add(otherMember.id);
        }

        if (otherMember.role !== 'system' && otherMember.username !== 'system' && otherMember.username !== 'bug_reports') {
          const isFriend = await areAcceptedFriends(userId, otherMember.id);
          if (!isFriend) {
            isLocked = true;
          }
        }
      }

      // Latest message
      const lastMessage = await queryOne<any>(`
        SELECT id, sender_id, content, created_at
        FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at DESC LIMIT 1
      `, [c.id]);

      conversations.push({
        ...c,
        unread_count: unreadRow?.count || 0,
        is_locked: isLocked,
        members,
        last_message: lastMessage || null
      });
    }

    return res.json({ conversations });
  } catch (err) {
    console.error('Fetch conversations error:', err);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// 3. Start or Retrieve 1-on-1 Direct Message with Accepted Friend (or System Bot)
router.post('/conversations/direct', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const target_user_id = Number(req.body.target_user_id || req.body.friend_user_id || req.body.user_id);

    if (!target_user_id || isNaN(target_user_id)) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    if (userId === target_user_id) {
      return res.status(400).json({ error: 'You cannot direct message yourself' });
    }

    const targetUser = await queryOne<any>('SELECT id, username, display_name, role FROM users WHERE id = ?', [target_user_id]);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const isSystemBot = targetUser.role === 'system' || targetUser.username === 'system' || targetUser.username === 'bug_reports';

    if (!isSystemBot && !(await areAcceptedFriends(userId, target_user_id))) {
      return res.status(403).json({ error: `You can only direct message accepted friends. You are not friends with @${targetUser.username}.` });
    }

    const existing = await queryOne<any>(`
      SELECT c.id 
      FROM conversations c
      JOIN conversation_members cm1 ON c.id = cm1.conversation_id
      JOIN conversation_members cm2 ON c.id = cm2.conversation_id
      WHERE c.type = 'direct' AND cm1.user_id = ? AND cm2.user_id = ? AND cm1.id != cm2.id
    `, [userId, target_user_id]);

    if (existing) {
      return res.json({ conversation_id: existing.id });
    }

    const resInsert = await execute('INSERT INTO conversations (type, name, creator_user_id) VALUES ("direct", "", ?)', [userId]);
    const convId = resInsert.lastID;

    const uniqueMemberIds = Array.from(new Set([userId, target_user_id]));
    for (const mId of uniqueMemberIds) {
      await execute('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)', [convId, mId]);
    }

    return res.json({ conversation_id: convId });
  } catch (err) {
    console.error('Create direct conversation error:', err);
    return res.status(500).json({ error: 'Failed to start direct conversation' });
  }
});

// 4. Create Group Chat
router.post('/conversations/group', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, avatar_url, member_ids } = req.body;

    if (!Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({ error: 'At least one member is required to create a group chat' });
    }

    const cleanMemberIds = Array.from(new Set(member_ids.map(id => Number(id)))).filter(id => id !== userId);

    if (cleanMemberIds.length === 0) {
      return res.status(400).json({ error: 'Please select valid group members' });
    }

    // Verify creator is accepted friends with EACH member
    for (const mId of cleanMemberIds) {
      const isFriend = await areAcceptedFriends(userId, mId);
      if (!isFriend) {
        const memberUser = await queryOne<any>('SELECT username FROM users WHERE id = ?', [mId]);
        const mUsername = memberUser ? `@${memberUser.username}` : `User #${mId}`;
        return res.status(403).json({ error: `Cannot add ${mUsername} to group. You can only add accepted friends.` });
      }
    }

    const groupName = (name || 'Group Chat').trim();
    const groupAvatar = (avatar_url || '').trim();

    const resInsert = await execute(
      'INSERT INTO conversations (type, name, avatar_url, creator_user_id) VALUES ("group", ?, ?, ?)',
      [groupName, groupAvatar, userId]
    );
    const convId = resInsert.lastID;

    await execute('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)', [convId, userId]);
    for (const mId of cleanMemberIds) {
      await execute('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)', [convId, mId]);
    }

    const creatorUser = await queryOne<any>('SELECT username FROM users WHERE id = ?', [userId]);
    // Centered inline notice for group creation
    await execute(
      'INSERT INTO messages (conversation_id, sender_id, content, is_system_notice) VALUES (?, ?, ?, 1)',
      [convId, userId, `@${creatorUser?.username || 'User'} created the group chat "${groupName}"`]
    );

    return res.json({ conversation_id: convId });
  } catch (err) {
    console.error('Create group conversation error:', err);
    return res.status(500).json({ error: 'Failed to create group chat' });
  }
});

// 5. Get Messages for a Conversation (with Bug Reports Privacy Isolation, Replies & Reactions)
router.get('/conversations/:id/messages', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const convId = req.params.id;

    // Verify membership
    const memberCheck = await queryOne<any>('SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, userId]);
    if (!memberCheck) {
      return res.status(403).json({ error: 'You are not a member of this conversation' });
    }

    // Check conversation metadata & locking
    const conv = await queryOne<any>('SELECT type, name, avatar_url, creator_user_id FROM conversations WHERE id = ?', [convId]);
    let isLocked = false;
    let lockedReason = '';

    // Check if this conversation is with the Bug Reports bot
    const bugBot = await getBugReportsBotUser();
    const systemBot = await getSystemBotUser();

    const isBugReportsChat = bugBot && (await queryOne<any>(
      'SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?',
      [convId, bugBot.id]
    ));

    const isSystemChat = systemBot && (await queryOne<any>(
      'SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?',
      [convId, systemBot.id]
    ));

    // Lock non-admin users out of posting to System Announcement channel
    const isAdmin = req.user!.role === 'admin';
    if (isSystemChat && !isAdmin) {
      isLocked = true;
      lockedReason = 'Only administrators can post to System Announcements.';
    }

    if (conv?.type === 'direct' && !isSystemChat && !isBugReportsChat) {
      const members = await query<any>('SELECT user_id FROM conversation_members WHERE conversation_id = ?', [convId]);
      const other = members.find((m: any) => m.user_id !== userId);
      if (other) {
        const otherUser = await queryOne<any>('SELECT id, username, role FROM users WHERE id = ?', [other.user_id]);
        if (otherUser && otherUser.role !== 'system' && otherUser.username !== 'system' && otherUser.username !== 'bug_reports') {
          const isFriend = await areAcceptedFriends(userId, otherUser.id);
          if (!isFriend) {
            isLocked = true;
            lockedReason = `This conversation is locked because you and @${otherUser.username} are no longer accepted friends. Past message history is preserved.`;
          }
        }
      }
    }

    // Mark as read
    await execute('UPDATE conversation_members SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND user_id = ?', [convId, userId]);

    // Fetch messages with Bug Reports privacy filtering
    let rawMessages: any[] = [];

    if (isBugReportsChat) {
      if (isAdmin) {
        // Admins see all bug reports
        rawMessages = await query<any>(`
          SELECT 
            m.id, m.conversation_id, m.sender_id, m.content, m.reply_to_id, m.is_system_notice, m.created_at,
            u.username as sender_username, u.display_name as sender_display_name, u.avatar_url as sender_avatar_url, u.role as sender_role,
            n.theme as sender_theme, n.bg_color as sender_bg_color, n.accent_color as sender_accent_color, n.text_color as sender_text_color
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          LEFT JOIN nooks n ON n.user_id = u.id
          WHERE m.conversation_id = ?
          ORDER BY m.created_at ASC
        `, [convId]);
      } else {
        // Regular users ONLY see their own bug reports AND admin replies to their messages
        rawMessages = await query<any>(`
          SELECT 
            m.id, m.conversation_id, m.sender_id, m.content, m.reply_to_id, m.is_system_notice, m.created_at,
            u.username as sender_username, u.display_name as sender_display_name, u.avatar_url as sender_avatar_url, u.role as sender_role,
            n.theme as sender_theme, n.bg_color as sender_bg_color, n.accent_color as sender_accent_color, n.text_color as sender_text_color
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          LEFT JOIN nooks n ON n.user_id = u.id
          WHERE m.conversation_id = ?
            AND (
              m.sender_id = ? 
              OR m.reply_to_id IN (SELECT id FROM messages WHERE sender_id = ?)
            )
          ORDER BY m.created_at ASC
        `, [convId, userId, userId]);
      }
    } else {
      rawMessages = await query<any>(`
        SELECT 
          m.id, m.conversation_id, m.sender_id, m.content, m.reply_to_id, m.is_system_notice, m.created_at,
          u.username as sender_username, u.display_name as sender_display_name, u.avatar_url as sender_avatar_url, u.role as sender_role,
          n.theme as sender_theme, n.bg_color as sender_bg_color, n.accent_color as sender_accent_color, n.text_color as sender_text_color
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        LEFT JOIN nooks n ON n.user_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
      `, [convId]);
    }

    // Attach reactions & reply_to details to each message
    const formattedMessages = [];
    for (const msg of rawMessages) {
      // Reactions
      const reactions = await query<any>(`
        SELECT mr.emoji, COUNT(mr.id) as count,
               MAX(CASE WHEN mr.user_id = ? THEN 1 ELSE 0 END) as user_reacted
        FROM message_reactions mr
        WHERE mr.message_id = ?
        GROUP BY mr.emoji
      `, [userId, msg.id]);

      // Reply_to details
      let replyTo = null;
      if (msg.reply_to_id) {
        const parentMsg = await queryOne<any>(`
          SELECT m.id, m.content, u.username as sender_username
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.id = ?
        `, [msg.reply_to_id]);
        if (parentMsg) {
          replyTo = {
            id: parentMsg.id,
            sender_username: parentMsg.sender_username,
            content: parentMsg.content
          };
        }
      }

      formattedMessages.push({
        ...msg,
        is_system_notice: !!msg.is_system_notice,
        reactions: reactions.map(r => ({ emoji: r.emoji, count: r.count, user_reacted: !!r.user_reacted })),
        reply_to: replyTo
      });
    }

    return res.json({
      messages: formattedMessages,
      is_locked: isLocked,
      locked_reason: lockedReason,
      is_bug_reports: !!isBugReportsChat,
      is_system_chat: !!isSystemChat
    });
  } catch (err) {
    console.error('Fetch messages error:', err);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// 6. Post Message in Conversation (Checks system locks & supports reply_to_id)
router.post('/conversations/:id/messages', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const convId = req.params.id;
    const { content, reply_to_id } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    const memberCheck = await queryOne<any>('SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, userId]);
    if (!memberCheck) {
      return res.status(403).json({ error: 'You are not a member of this conversation' });
    }

    const systemBot = await getSystemBotUser();
    const isSystemChat = systemBot && (await queryOne<any>(
      'SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?',
      [convId, systemBot.id]
    ));

    const bugBot = await getBugReportsBotUser();
    const isBugReportsChat = bugBot && (await queryOne<any>(
      'SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?',
      [convId, bugBot.id]
    ));

    if (isBugReportsChat) {
      // Ensure all active site admins are members of this bug reports conversation so they can read and reply
      const admins = await query<any>('SELECT id FROM users WHERE role = "admin" AND is_disabled = 0');
      for (const a of admins) {
        await execute('INSERT OR IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?)', [convId, a.id]);
      }
    }

    const isAdmin = req.user!.role === 'admin';
    if (isSystemChat && !isAdmin) {
      return res.status(403).json({ error: 'Only administrators can post to System Announcements.' });
    }

    // Check lock status for 1-on-1 DMs
    const conv = await queryOne<any>('SELECT type, name FROM conversations WHERE id = ?', [convId]);
    if (conv?.type === 'direct' && !isSystemChat) {
      const members = await query<any>('SELECT user_id FROM conversation_members WHERE conversation_id = ?', [convId]);
      const other = members.find((m: any) => m.user_id !== userId);
      if (other) {
        const otherUser = await queryOne<any>('SELECT id, username, role FROM users WHERE id = ?', [other.user_id]);
        if (otherUser && otherUser.role !== 'system' && otherUser.username !== 'system' && otherUser.username !== 'bug_reports') {
          const isFriend = await areAcceptedFriends(userId, otherUser.id);
          if (!isFriend) {
            return res.status(403).json({ error: `This conversation is locked because you and @${otherUser.username} are no longer friends.` });
          }
        }
      }
    }

    const cleanContent = content.trim();
    const replyId = reply_to_id ? Number(reply_to_id) : null;

    const resInsert = await execute(
      'INSERT INTO messages (conversation_id, sender_id, content, reply_to_id, is_system_notice) VALUES (?, ?, ?, ?, 0)',
      [convId, userId, cleanContent, replyId]
    );

    await execute('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [convId]);
    await execute('UPDATE conversation_members SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND user_id = ?', [convId, userId]);

    const sender = await queryOne<any>('SELECT username, display_name FROM users WHERE id = ?', [userId]);
    const members = await query<any>(`
      SELECT cm.user_id, cm.is_muted, u.email, u.username, u.notify_email_messages
      FROM conversation_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.conversation_id = ? AND cm.user_id != ?
    `, [convId, userId]);

    const snippet = cleanContent.length > 80 ? cleanContent.substring(0, 77) + '...' : cleanContent;
    const notifTitle = conv?.type === 'group' ? `Group "${conv.name}": @${sender?.username}` : `New message from @${sender?.username}`;

    for (const m of members) {
      if (!m.is_muted) {
        await createNotification(
          m.user_id,
          'system',
          userId,
          notifTitle,
          snippet,
          `/messages?conv=${convId}`,
          'Open Messages'
        );

        if (m.email && m.notify_email_messages !== 0) {
          sendStyledEmail({
            to: m.email,
            subject: `${notifTitle} - WebNook Messages`,
            title: notifTitle,
            bodyHtml: `<p>Hello @<strong>${m.username}</strong>,</p><p>You have a new message in WebNook Messages:</p><blockquote style="background:rgba(255,255,255,0.05);padding:0.75rem;border-left:3px solid #6366f1;">${snippet}</blockquote>`,
            actionUrl: `/messages?conv=${convId}`,
            actionText: 'Open Messages'
          });
        }
      }
    }

    const createdMsg = await queryOne<any>(`
      SELECT 
        m.id, m.conversation_id, m.sender_id, m.content, m.reply_to_id, m.is_system_notice, m.created_at,
        u.username as sender_username, u.display_name as sender_display_name, u.avatar_url as sender_avatar_url, u.role as sender_role,
        n.theme as sender_theme, n.bg_color as sender_bg_color, n.accent_color as sender_accent_color, n.text_color as sender_text_color
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN nooks n ON n.user_id = u.id
      WHERE m.id = ?
    `, [resInsert.lastID]);

    let replyTo = null;
    if (createdMsg.reply_to_id) {
      const parentMsg = await queryOne<any>(`
        SELECT m.id, m.content, u.username as sender_username
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id = ?
      `, [createdMsg.reply_to_id]);
      if (parentMsg) {
        replyTo = {
          id: parentMsg.id,
          sender_username: parentMsg.sender_username,
          content: parentMsg.content
        };
      }
    }

    return res.json({
      message: {
        ...createdMsg,
        is_system_notice: !!createdMsg.is_system_notice,
        reactions: [],
        reply_to: replyTo
      }
    });
  } catch (err) {
    console.error('Post message error:', err);
    return res.status(500).json({ error: 'Failed to post message' });
  }
});

// 7. Toggle Reaction on Message
router.post('/conversations/:id/messages/:messageId/reactions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id: convId, messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    // Verify membership
    const memberCheck = await queryOne<any>('SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, userId]);
    if (!memberCheck) {
      return res.status(403).json({ error: 'You are not a member of this conversation' });
    }

    // Check if system announcement channel (reactions disabled for system announcements)
    const systemBot = await getSystemBotUser();
    const isSystemChat = systemBot && (await queryOne<any>(
      'SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?',
      [convId, systemBot.id]
    ));
    if (isSystemChat) {
      return res.status(403).json({ error: 'Reactions are not enabled on System Announcements.' });
    }

    // Toggle reaction
    const existing = await queryOne<any>(
      'SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
      [messageId, userId, emoji]
    );

    if (existing) {
      await execute('DELETE FROM message_reactions WHERE id = ?', [existing.id]);
    } else {
      await execute('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)', [messageId, userId, emoji]);
    }

    // Return updated reactions for message
    const reactions = await query<any>(`
      SELECT mr.emoji, COUNT(mr.id) as count,
             MAX(CASE WHEN mr.user_id = ? THEN 1 ELSE 0 END) as user_reacted
      FROM message_reactions mr
      WHERE mr.message_id = ?
      GROUP BY mr.emoji
    `, [userId, messageId]);

    return res.json({
      message_id: Number(messageId),
      reactions: reactions.map(r => ({ emoji: r.emoji, count: r.count, user_reacted: !!r.user_reacted }))
    });
  } catch (err) {
    console.error('Toggle reaction error:', err);
    return res.status(500).json({ error: 'Failed to toggle reaction' });
  }
});

// 8. Update User Reaction Preferences (Quick Emojis & Default Double-Tap Emoji)
router.put('/reaction-settings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { reaction_picker_json, default_reaction } = req.body;

    const pickerJson = Array.isArray(reaction_picker_json)
      ? JSON.stringify(reaction_picker_json)
      : (typeof reaction_picker_json === 'string' ? reaction_picker_json : '["👍","❤️","😂","🔥","😮","🎉"]');

    const defaultEmoji = (default_reaction || '❤️').trim();

    await execute(
      'UPDATE users SET reaction_picker_json = ?, default_reaction = ? WHERE id = ?',
      [pickerJson, defaultEmoji, userId]
    );

    return res.json({ message: 'Reaction preferences saved successfully!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update reaction preferences' });
  }
});

// 9. Update Group Chat Settings (Name & Avatar)
router.put('/conversations/:id/settings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const convId = req.params.id;
    const { name, avatar_url } = req.body;

    const memberCheck = await queryOne<any>('SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, userId]);
    if (!memberCheck) {
      return res.status(403).json({ error: 'You are not a member of this conversation' });
    }

    const conv = await queryOne<any>('SELECT type, name FROM conversations WHERE id = ?', [convId]);
    if (conv?.type !== 'group') {
      return res.status(400).json({ error: 'Settings can only be modified for group chats' });
    }

    const cleanName = (name !== undefined ? name : conv.name).trim() || 'Group Chat';
    const cleanAvatar = avatar_url !== undefined ? avatar_url.trim() : conv.avatar_url;

    await execute('UPDATE conversations SET name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [cleanName, cleanAvatar, convId]);

    const sender = await queryOne<any>('SELECT username FROM users WHERE id = ?', [userId]);
    await execute(
      'INSERT INTO messages (conversation_id, sender_id, content, is_system_notice) VALUES (?, ?, ?, 1)',
      [convId, userId, `@${sender?.username} updated the group settings`]
    );

    return res.json({ message: 'Group chat settings updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update group chat settings' });
  }
});

// 10. Add Member to Group Chat
router.post('/conversations/:id/members', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const convId = req.params.id;
    const { new_member_id } = req.body;

    if (!new_member_id) return res.status(400).json({ error: 'New member ID is required' });

    const callerMember = await queryOne<any>('SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, userId]);
    if (!callerMember) {
      return res.status(403).json({ error: 'You are not a member of this group chat' });
    }

    const conv = await queryOne<any>('SELECT type FROM conversations WHERE id = ?', [convId]);
    if (conv?.type !== 'group') {
      return res.status(400).json({ error: 'Members can only be added to group chats' });
    }

    const isFriend = await areAcceptedFriends(userId, Number(new_member_id));
    if (!isFriend) {
      const targetUser = await queryOne<any>('SELECT username FROM users WHERE id = ?', [new_member_id]);
      return res.status(403).json({ error: `You can only add accepted friends to the group chat. You are not friends with @${targetUser?.username || 'user'}.` });
    }

    const existing = await queryOne<any>('SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, new_member_id]);
    if (existing) {
      return res.status(400).json({ error: 'User is already a member of this group chat' });
    }

    await execute('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)', [convId, new_member_id]);
    await execute('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [convId]);

    const inviter = await queryOne<any>('SELECT username FROM users WHERE id = ?', [userId]);
    const addedUser = await queryOne<any>('SELECT username FROM users WHERE id = ?', [new_member_id]);

    await execute(
      'INSERT INTO messages (conversation_id, sender_id, content, is_system_notice) VALUES (?, ?, ?, 1)',
      [convId, userId, `@${inviter?.username} added @${addedUser?.username} to the group chat`]
    );

    return res.json({ message: `@${addedUser?.username} added to the group chat!` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add member to group chat' });
  }
});

// 11. Leave Group Chat
router.post('/conversations/:id/leave', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const convId = req.params.id;

    const callerMember = await queryOne<any>('SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, userId]);
    if (!callerMember) {
      return res.status(403).json({ error: 'You are not a member of this group chat' });
    }

    const conv = await queryOne<any>('SELECT type FROM conversations WHERE id = ?', [convId]);
    if (conv?.type !== 'group') {
      return res.status(400).json({ error: 'You can only leave group chats' });
    }

    await execute('DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, userId]);

    const userObj = await queryOne<any>('SELECT username FROM users WHERE id = ?', [userId]);
    await execute(
      'INSERT INTO messages (conversation_id, sender_id, content, is_system_notice) VALUES (?, ?, ?, 1)',
      [convId, userId, `@${userObj?.username} left the group chat`]
    );

    return res.json({ message: 'You have left the group chat' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to leave group chat' });
  }
});

// 12. Toggle Mute
router.put('/conversations/:id/mute', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const convId = req.params.id;
    const { is_muted } = req.body;

    const isMutedVal = is_muted ? 1 : 0;
    await execute('UPDATE conversation_members SET is_muted = ? WHERE conversation_id = ? AND user_id = ?', [isMutedVal, convId, userId]);

    return res.json({ message: is_muted ? 'Conversation muted' : 'Notifications unmuted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update mute status' });
  }
});

// 13. Admin DM Broadcast
router.post('/admin/broadcast', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { target_type, target_user_id, content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const sys = await getSystemBotUser();
    if (!sys) return res.status(500).json({ error: 'System Bot unavailable' });

    const cleanContent = content.trim();

    if (target_type === 'user') {
      if (!target_user_id) return res.status(400).json({ error: 'Target User ID required' });
      const convId = await ensureSystemDM(Number(target_user_id));
      if (convId) {
        await execute('INSERT INTO messages (conversation_id, sender_id, content, is_system_notice) VALUES (?, ?, ?, 0)', [convId, sys.id, cleanContent]);
        await execute('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [convId]);
      }
      return res.json({ message: 'System message sent to target user DM!' });
    } else {
      const users = await query<any>('SELECT id FROM users WHERE is_disabled = 0');
      let count = 0;
      for (const u of users) {
        const convId = await ensureSystemDM(u.id);
        if (convId) {
          await execute('INSERT INTO messages (conversation_id, sender_id, content, is_system_notice) VALUES (?, ?, ?, 0)', [convId, sys.id, cleanContent]);
          await execute('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [convId]);
          count++;
        }
      }
      return res.json({ message: `System DM broadcast sent to ${count} users!` });
    }
  } catch (err) {
    console.error('Admin DM broadcast error:', err);
    return res.status(500).json({ error: 'Failed to broadcast system message' });
  }
});

export default router;
