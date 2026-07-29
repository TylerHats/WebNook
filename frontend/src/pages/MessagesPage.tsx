import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Plus, Bell, BellOff, Send, Users, User, 
  Bold, Italic, Code, Link as LinkIcon, List, Eye, Search, X, Bot, 
  Lock, Settings, LogOut, UserPlus, Image as ImageIcon, Upload,
  Bug, Reply, Smile, ShieldAlert, ArrowLeft
} from 'lucide-react';
import { ImageCropModal } from '../components/ui/ImageCropModal';

// Markdown parser helper for standard chat messages
const renderMessageMarkdown = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div style={{ lineHeight: 1.5, fontSize: '0.9rem', overflowWrap: 'anywhere' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} style={{ height: '0.35rem' }} />;

        if (trimmed.startsWith('### ')) {
          return <h4 key={idx} style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0.4rem 0 0.2rem', color: 'inherit' }}>{trimmed.replace('### ', '')}</h4>;
        }
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          return <h3 key={idx} style={{ fontSize: '1rem', fontWeight: 800, margin: '0.5rem 0 0.2rem', color: 'inherit' }}>{trimmed.replace(/^#+\s*/, '')}</h3>;
        }
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote key={idx} style={{ margin: '0.3rem 0', paddingLeft: '0.6rem', borderLeft: '3px solid currentColor', opacity: 0.85 }}>
              {trimmed.replace('> ', '')}
            </blockquote>
          );
        }

        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ');
        const content = isBullet ? trimmed.replace(/^[-•*]\s*/, '') : trimmed;

        const parts = content.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g);

        const renderedParts = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={pIdx}>{part.slice(1, -1)}</em>;
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code key={pIdx} style={{ background: 'rgba(0,0,0,0.25)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                {part.slice(1, -1)}
              </code>
            );
          }
          const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
          if (linkMatch) {
            return (
              <a key={pIdx} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}>
                {linkMatch[1]}
              </a>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.2rem', paddingLeft: '0.4rem' }}>
              <span>•</span>
              <div>{renderedParts}</div>
            </div>
          );
        }

        return <p key={idx} style={{ margin: '0 0 0.25rem' }}>{renderedParts}</p>;
      })}
    </div>
  );
};

export const MessagesPage: React.FC = () => {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isConvLocked, setIsConvLocked] = useState(false);
  const [lockedReason, setLockedReason] = useState('');
  const [isBugReportsChat, setIsBugReportsChat] = useState(false);
  const [isSystemChat, setIsSystemChat] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'direct' | 'group' | 'system'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile responsiveness states
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  
  // Message composing & reply state
  const [messageText, setMessageText] = useState('');
  const [replyingToMessage, setReplyingToMessage] = useState<{ id: number; sender_username: string; content: string } | null>(null);
  const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState<number | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Accepted friends list
  const [acceptedFriends, setAcceptedFriends] = useState<any[]>([]);

  // Modals state
  const [newDmModalOpen, setNewDmModalOpen] = useState(false);
  const [newGroupModalOpen, setNewGroupModalOpen] = useState(false);
  const [groupSettingsModalOpen, setGroupSettingsModalOpen] = useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);

  // Crop modal state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageFile, setCropImageFile] = useState<File | null>(null);
  const [cropSource, setCropSource] = useState<'new_group' | 'edit_group'>('new_group');

  // Form states
  const [selectedFriendForDm, setSelectedFriendForDm] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupAvatarUrl, setNewGroupAvatarUrl] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<number[]>([]);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupAvatarUrl, setEditGroupAvatarUrl] = useState('');
  const [selectedAddMemberId, setSelectedAddMemberId] = useState<string>('');

  // Fetch conversations list
  const fetchConversations = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/messages/conversations', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  // Fetch accepted friends list
  const fetchFriends = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/friends/list', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setAcceptedFriends(data.friends || []);
      }
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    }
  };

  // Fetch messages for active conversation
  const fetchMessages = async (convId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/messages/conversations/${convId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setIsConvLocked(!!data.is_locked);
        setLockedReason(data.locked_reason || '');
        setIsBugReportsChat(!!data.is_bug_reports);
        setIsSystemChat(!!data.is_system_chat);
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchConversations();
      fetchFriends();
    }
  }, [token]);

  // Handle URL query parameter `?conv=ID`
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const convParam = params.get('conv');
    if (convParam) {
      const targetId = Number(convParam);
      if (!isNaN(targetId)) {
        setActiveConvId(targetId);
        if (windowWidth <= 768) {
          setMobileShowChat(true);
        }
      }
    }
  }, [location.search]);

  // Select first conversation if none selected
  useEffect(() => {
    if (!activeConvId && conversations.length > 0) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations, activeConvId]);

  // Poll for messages in active conversation
  useEffect(() => {
    if (!activeConvId) return;
    fetchMessages(activeConvId);
    const interval = setInterval(() => {
      fetchMessages(activeConvId);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeConvId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeConv = conversations.find(c => c.id === activeConvId);

  // Sync group settings form when opening settings
  useEffect(() => {
    if (activeConv && activeConv.type === 'group') {
      setEditGroupName(activeConv.name || '');
      setEditGroupAvatarUrl(activeConv.avatar_url || '');
    }
  }, [activeConv]);

  const handleSelectConv = (convId: number) => {
    setActiveConvId(convId);
    setMobileShowChat(true);
    navigate(`/messages?conv=${convId}`, { replace: true });
  };

  // Handle File selection for crop
  const handleAvatarFileSelected = (e: React.ChangeEvent<HTMLInputElement>, source: 'new_group' | 'edit_group') => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setCropImageFile(files[0]);
      setCropSource(source);
      setCropModalOpen(true);
      e.target.value = '';
    }
  };

  // Handle Crop Completion
  const handleCropComplete = (croppedFile: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      if (cropSource === 'new_group') {
        setNewGroupAvatarUrl(dataUrl);
      } else if (cropSource === 'edit_group') {
        setEditGroupAvatarUrl(dataUrl);
      }
    };
    reader.readAsDataURL(croppedFile);
  };

  // Helper to format conversation title
  const getConvTitle = (conv: any) => {
    if (!conv) return '';
    if (conv.type === 'group') return conv.name || 'Group Chat';
    const otherMember = (conv.members || []).find((m: any) => m.id !== user?.id);
    if (!otherMember) return 'Direct Message';
    if (otherMember.username === 'bug_reports') {
      return 'Bug Reports & Support 🐛';
    }
    if (otherMember.role === 'system' || otherMember.username === 'system') {
      return 'System Announcement 🤖';
    }
    return `@${otherMember.username} (${otherMember.display_name || otherMember.username})`;
  };

  // Helper to format conversation avatar
  const getConvAvatar = (conv: any) => {
    if (!conv) return null;
    if (conv.type === 'group') {
      if (conv.avatar_url) {
        return <img src={conv.avatar_url} alt={conv.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />;
      }
      return <Users size={20} />;
    }
    const otherMember = (conv.members || []).find((m: any) => m.id !== user?.id);
    if (otherMember?.username === 'bug_reports') {
      return <Bug size={20} color="#ef4444" />;
    }
    if (otherMember?.role === 'system' || otherMember?.username === 'system') {
      return <Bot size={20} color="var(--accent-color)" />;
    }
    if (otherMember?.avatar_url) {
      return <img src={otherMember.avatar_url} alt={otherMember.username} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />;
    }
    return <User size={20} />;
  };

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    if (activeFilter === 'direct' && c.type !== 'direct') return false;
    if (activeFilter === 'group' && c.type !== 'group') return false;
    if (activeFilter === 'system') {
      const isSys = (c.members || []).some((m: any) => m.role === 'system' || m.username === 'system' || m.username === 'bug_reports');
      if (!isSys) return false;
    }
    if (searchQuery.trim()) {
      const title = getConvTitle(c).toLowerCase();
      return title.includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Post message handler (with reply support)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConvId || !messageText.trim() || isSending || isConvLocked) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/messages/conversations/${activeConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          content: messageText,
          reply_to_id: replyingToMessage ? replyingToMessage.id : null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessageText('');
        setReplyingToMessage(null);
        fetchMessages(activeConvId);
      } else {
        showToast(data.error || 'Failed to send message', 'error');
      }
    } catch (err) {
      showToast('Error sending message', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Toggle Reaction Handler
  const handleToggleReaction = async (messageId: number, emoji: string) => {
    if (!activeConvId || !token) return;
    try {
      const res = await fetch(`/api/messages/conversations/${activeConvId}/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ emoji })
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: data.reactions } : m));
        setActiveReactionPickerMsgId(null);
      } else {
        showToast(data.error || 'Failed to toggle reaction', 'error');
      }
    } catch (err) {
      showToast('Error toggling reaction', 'error');
    }
  };

  // Double-tap message handler
  const handleDoubleTapMessage = (messageId: number) => {
    const defaultEmoji = (user as any)?.default_reaction || '❤️';
    handleToggleReaction(messageId, defaultEmoji);
  };

  // Toggle Mute handler
  const handleToggleMute = async () => {
    if (!activeConv) return;
    const newMuteState = !activeConv.is_muted;
    try {
      const res = await fetch(`/api/messages/conversations/${activeConv.id}/mute`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_muted: newMuteState })
      });
      if (res.ok) {
        showToast(newMuteState ? 'Conversation muted' : 'Notifications unmuted', 'info');
        fetchConversations();
      }
    } catch (err) {
      showToast('Failed to update mute state', 'error');
    }
  };

  // Update Group Chat Settings handler
  const handleUpdateGroupSettings = async () => {
    if (!activeConvId || !editGroupName.trim()) return;
    try {
      const res = await fetch(`/api/messages/conversations/${activeConvId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editGroupName, avatar_url: editGroupAvatarUrl })
      });
      if (res.ok) {
        showToast('Group settings updated!', 'success');
        setGroupSettingsModalOpen(false);
        fetchConversations();
        fetchMessages(activeConvId);
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update group settings', 'error');
      }
    } catch (err) {
      showToast('Error updating group settings', 'error');
    }
  };

  // Add Friend to Existing Group Chat handler
  const handleAddMemberToGroup = async () => {
    if (!activeConvId || !selectedAddMemberId) return;
    try {
      const res = await fetch(`/api/messages/conversations/${activeConvId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_member_id: Number(selectedAddMemberId) })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Friend added to group!', 'success');
        setAddMemberModalOpen(false);
        setSelectedAddMemberId('');
        fetchConversations();
        fetchMessages(activeConvId);
      } else {
        showToast(data.error || 'Failed to add friend to group', 'error');
      }
    } catch (err) {
      showToast('Error adding friend to group', 'error');
    }
  };

  // Leave Group Chat handler
  const handleLeaveGroup = async () => {
    if (!activeConvId) return;
    if (!window.confirm('Are you sure you want to leave this group chat?')) return;
    try {
      const res = await fetch(`/api/messages/conversations/${activeConvId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('You left the group chat', 'info');
        setGroupSettingsModalOpen(false);
        setActiveConvId(null);
        fetchConversations();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to leave group chat', 'error');
      }
    } catch (err) {
      showToast('Error leaving group chat', 'error');
    }
  };

  // Start new Direct Message
  const handleStartDirectMessage = async () => {
    if (!selectedFriendForDm) {
      showToast('Please select a friend to message', 'error');
      return;
    }
    try {
      const res = await fetch('/api/messages/conversations/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target_user_id: Number(selectedFriendForDm) })
      });
      const data = await res.json();
      if (res.ok) {
        setNewDmModalOpen(false);
        setSelectedFriendForDm('');
        await fetchConversations();
        handleSelectConv(data.conversation_id);
      } else {
        showToast(data.error || 'Failed to start direct message', 'error');
      }
    } catch (err) {
      showToast('Error starting direct message', 'error');
    }
  };

  // Create new Group Chat
  const handleCreateGroupChat = async () => {
    if (!newGroupName.trim()) {
      showToast('Please enter a group chat name', 'error');
      return;
    }
    if (selectedGroupMemberIds.length === 0) {
      showToast('Please select at least one friend for the group chat', 'error');
      return;
    }
    try {
      const res = await fetch('/api/messages/conversations/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newGroupName,
          avatar_url: newGroupAvatarUrl,
          member_ids: selectedGroupMemberIds
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNewGroupModalOpen(false);
        setNewGroupName('');
        setNewGroupAvatarUrl('');
        setSelectedGroupMemberIds([]);
        await fetchConversations();
        handleSelectConv(data.conversation_id);
      } else {
        showToast(data.error || 'Failed to create group chat', 'error');
      }
    } catch (err) {
      showToast('Error creating group chat', 'error');
    }
  };

  // Formatting Toolbar Helper
  const insertFormat = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = messageText;
    const selected = text.substring(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;

    setMessageText(text.substring(0, start) + replacement + text.substring(end));
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 4));
      }
    }, 50);
  };

  const reactionOptions = (user as any)?.reaction_picker_json
    ? (typeof (user as any).reaction_picker_json === 'string' ? JSON.parse((user as any).reaction_picker_json) : (user as any).reaction_picker_json)
    : ['👍', '❤️', '😂', '🔥', '😮', '🎉'];

  return (
    <div style={{ paddingTop: '2rem', paddingBottom: '2rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', maxWidth: '1280px', margin: '0 auto', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <MessageSquare size={28} color="var(--accent-color)" />
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800 }}>WebNook Messages</h1>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>Chat with accepted friends, group chats, bug reports & system updates</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button onClick={() => setNewDmModalOpen(true)} className="btn-primary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}>
            <Plus size={16} />
            <span>New DM</span>
          </button>
          <button onClick={() => setNewGroupModalOpen(true)} className="btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}>
            <Users size={16} />
            <span>New Group Chat</span>
          </button>
        </div>
      </div>

      {/* Main Split / Mobile Collapsible Messaging Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(260px, 320px) 1fr',
        gap: '1.5rem',
        minHeight: '650px'
      }}>
        
        {/* Left Sidebar: Conversations List (Hidden on mobile if viewing active chat) */}
        {(!isMobile || !mobileShowChat) && (
          <div className="nook-panel" style={{ display: 'flex', flexDirection: 'column', padding: '0.85rem' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Category Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.85rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              {(['all', 'direct', 'group', 'system'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  style={{
                    flex: 1,
                    padding: '0.35rem 0.2rem',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: activeFilter === tab ? 'var(--accent-color)' : 'transparent',
                    color: activeFilter === tab ? '#fff' : 'var(--text-main)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Conversations Items Stream */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {filteredConversations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0.5rem', opacity: 0.6, fontSize: '0.85rem' }}>
                  No chats found
                </div>
              ) : (
                filteredConversations.map(conv => {
                  const isActive = conv.id === activeConvId;
                  const title = getConvTitle(conv);

                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConv(conv.id)}
                      style={{
                        padding: '0.65rem 0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)',
                        borderLeft: isActive ? '3px solid var(--accent-color)' : '3px solid transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {getConvAvatar(conv)}
                        </div>
                        {conv.unread_count > 0 && (
                          <span style={{
                            position: 'absolute', top: '-4px', right: '-4px',
                            background: '#ef4444', color: '#fff', fontSize: '0.7rem', fontWeight: 800,
                            borderRadius: '10px', padding: '0.1rem 0.4rem', minWidth: '16px', textAlign: 'center'
                          }}>
                            {conv.unread_count}
                          </span>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span>{title}</span>
                            {conv.is_locked && <span title="Locked" style={{ display: 'inline-flex', alignItems: 'center' }}><Lock size={12} color="#ef4444" /></span>}
                          </span>
                          {conv.is_muted && <BellOff size={13} style={{ opacity: 0.5, flexShrink: 0 }} />}
                        </div>

                        {conv.last_message && (
                          <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {conv.last_message.is_system_notice ? (
                              <em style={{ opacity: 0.85 }}>✨ {conv.last_message.content}</em>
                            ) : (
                              <>
                                <strong style={{ opacity: 0.9 }}>@{conv.last_message.sender_username}: </strong>
                                {conv.last_message.content}
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Right Chat Area (Hidden on mobile if NOT viewing active chat) */}
        {(!isMobile || mobileShowChat) && (
          <div
            className="nook-panel"
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
              border: isBugReportsChat ? '1px solid rgba(239, 68, 68, 0.4)' : undefined
            }}
          >
            {activeConv ? (
              <>
                {/* Chat Window Header */}
                <div style={{
                  padding: '0.85rem 1.25rem',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isBugReportsChat ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0,0,0,0.15)',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {isMobile && (
                      <button
                        type="button"
                        onClick={() => setMobileShowChat(false)}
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        title="Back to Conversations List"
                      >
                        <ArrowLeft size={18} />
                        <span>Chats</span>
                      </button>
                    )}

                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getConvAvatar(activeConv)}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{getConvTitle(activeConv)}</span>
                        {isConvLocked && <Lock size={14} color="#ef4444" />}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>
                        {activeConv.type === 'group' ? `${(activeConv.members || []).length} Members` : (isBugReportsChat ? 'Direct Support Channel' : 'Direct Message')}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {activeConv.type === 'group' && (
                      <>
                        <button
                          onClick={() => setAddMemberModalOpen(true)}
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          title="Add Friend to Group"
                        >
                          <UserPlus size={16} />
                          <span>Add Member</span>
                        </button>

                        <button
                          onClick={() => setGroupSettingsModalOpen(true)}
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          title="Group Settings"
                        >
                          <Settings size={16} />
                          <span>Settings</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={handleToggleMute}
                      className="btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      title={activeConv.is_muted ? 'Unmute Notifications' : 'Mute Notifications'}
                    >
                      {activeConv.is_muted ? <BellOff size={16} color="#ef4444" /> : <Bell size={16} />}
                      <span>{activeConv.is_muted ? 'Muted' : 'Mute'}</span>
                    </button>
                  </div>
                </div>

                {/* Bug Reports Privacy Tooltip Header Banner */}
                {isBugReportsChat && (
                  <div style={{
                    padding: '0.65rem 1rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 600
                  }}>
                    <ShieldAlert size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                    <span>Anything sent here will be sent directly to WebNook Administrators for review. 🛡️</span>
                  </div>
                )}

                {/* Message Stream */}
                <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', margin: 'auto', opacity: 0.5, fontSize: '0.9rem' }}>
                      {isBugReportsChat
                        ? 'Submit a bug report or feedback here to notify site administrators! 🐛'
                        : 'No messages yet. Send a message to start the conversation! ✨'}
                    </div>
                  ) : (
                    messages.map(msg => {
                      // Check if message is a centered faint inline system notice
                      if (msg.is_system_notice) {
                        return (
                          <div
                            key={msg.id}
                            style={{
                              textAlign: 'center',
                              opacity: 0.6,
                              fontSize: '0.78rem',
                              fontStyle: 'italic',
                              margin: '0.5rem auto',
                              padding: '0.2rem 0.8rem',
                              background: 'rgba(255,255,255,0.04)',
                              borderRadius: '12px',
                              border: '1px dashed rgba(255,255,255,0.1)',
                              maxWidth: '90%'
                            }}
                          >
                            ✨ {msg.content} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        );
                      }

                      const isSelf = msg.sender_id === user?.id;
                      const isSystem = msg.sender_role === 'system' || msg.sender_username === 'system' || msg.sender_username === 'bug_reports';

                      const bubbleBg = isSystem 
                        ? (msg.sender_username === 'bug_reports' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(99, 102, 241, 0.25)')
                        : (msg.sender_bg_color || (isSelf ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.08)'));
                      
                      const borderAccent = msg.sender_accent_color || (msg.sender_username === 'bug_reports' ? '#ef4444' : 'var(--accent-color)');
                      const textColor = msg.sender_text_color || '#ffffff';

                      return (
                        <div
                          key={msg.id}
                          onDoubleClick={() => !isSystemChat && handleDoubleTapMessage(msg.id)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isSelf ? 'flex-end' : 'flex-start',
                            maxWidth: '82%',
                            alignSelf: isSelf ? 'flex-end' : 'flex-start',
                            position: 'relative'
                          }}
                        >
                          {/* Sender info */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem', fontSize: '0.75rem', opacity: 0.7 }}>
                            {!isSelf && msg.sender_avatar_url && (
                              <img src={msg.sender_avatar_url} alt={msg.sender_username} style={{ width: '16px', height: '16px', borderRadius: '50%' }} />
                            )}
                            <span style={{ fontWeight: 700 }}>@{msg.sender_username}</span>
                            {msg.sender_theme && (
                              <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.3rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', textTransform: 'capitalize' }}>
                                {msg.sender_theme}
                              </span>
                            )}
                            <span>•</span>
                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          {/* Per-User Theme Bubble */}
                          <div
                            style={{
                              padding: '0.75rem 1rem',
                              borderRadius: isSelf ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                              background: bubbleBg,
                              borderLeft: !isSelf ? `4px solid ${borderAccent}` : 'none',
                              borderRight: isSelf ? `4px solid ${borderAccent}` : 'none',
                              color: textColor,
                              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                              backdropFilter: 'blur(8px)',
                              position: 'relative'
                            }}
                          >
                            {/* Inline Quoted Reply Snippet */}
                            {msg.reply_to && (
                              <div style={{
                                fontSize: '0.75rem',
                                opacity: 0.85,
                                background: 'rgba(0,0,0,0.25)',
                                padding: '0.35rem 0.6rem',
                                borderRadius: '6px',
                                borderLeft: '3px solid var(--accent-color)',
                                marginBottom: '0.4rem'
                              }}>
                                <strong style={{ opacity: 0.9 }}>@{msg.reply_to.sender_username}: </strong>
                                <span>"{msg.reply_to.content.length > 55 ? msg.reply_to.content.substring(0, 52) + '...' : msg.reply_to.content}"</span>
                              </div>
                            )}

                            {renderMessageMarkdown(msg.content)}
                          </div>

                          {/* Message Action Buttons (Reply & Reactions) */}
                          {!msg.is_system_notice && !isSystemChat && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem', position: 'relative' }}>
                              <button
                                type="button"
                                onClick={() => setReplyingToMessage({ id: msg.id, sender_username: msg.sender_username, content: msg.content })}
                                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.6, padding: '2px', display: 'inline-flex', alignItems: 'center' }}
                                title="Reply"
                              >
                                <Reply size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setActiveReactionPickerMsgId(activeReactionPickerMsgId === msg.id ? null : msg.id)}
                                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.6, padding: '2px', display: 'inline-flex', alignItems: 'center' }}
                                title="Add Reaction"
                              >
                                <Smile size={13} />
                              </button>

                              {/* Quick Reaction Picker Popover */}
                              {activeReactionPickerMsgId === msg.id && (
                                <div style={{
                                  position: 'absolute',
                                  bottom: '100%',
                                  zIndex: 999,
                                  background: '#1e293b',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '20px',
                                  padding: '0.3rem 0.5rem',
                                  display: 'flex',
                                  gap: '0.3rem',
                                  boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
                                }}>
                                  {reactionOptions.map((emoji: string) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => handleToggleReaction(msg.id, emoji)}
                                      style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', padding: '2px' }}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Reaction Badges */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                              {msg.reactions.map((r: any) => (
                                <span
                                  key={r.emoji}
                                  onClick={() => !isSystemChat && handleToggleReaction(msg.id, r.emoji)}
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '10px',
                                    background: r.user_reacted ? 'rgba(99, 102, 241, 0.3)' : 'rgba(0,0,0,0.25)',
                                    border: r.user_reacted ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem',
                                    fontWeight: 600
                                  }}
                                >
                                  <span>{r.emoji}</span>
                                  <span>{r.count}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Formatting Toolbar & Message Composing Area (OR Locked Channel Banner) */}
                <div style={{ padding: '0.85rem', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
                  {isConvLocked ? (
                    <div style={{
                      padding: '1rem',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      textAlign: 'center',
                      color: '#fca5a5',
                      fontSize: '0.85rem'
                    }}>
                      <Lock size={20} style={{ margin: '0 auto 0.4rem', display: 'block' }} />
                      <strong>Channel Locked 🔒</strong>
                      <p style={{ margin: '0.2rem 0 0', opacity: 0.9 }}>
                        {lockedReason || 'Posting to this channel is locked.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Active Replying Preview Banner */}
                      {replyingToMessage && (
                        <div style={{
                          padding: '0.5rem 0.85rem',
                          background: 'rgba(99, 102, 241, 0.15)',
                          borderLeft: '4px solid var(--accent-color)',
                          borderRadius: '6px',
                          marginBottom: '0.5rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.8rem'
                        }}>
                          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            <strong style={{ color: 'var(--accent-color)' }}>Replying to @{replyingToMessage.sender_username}: </strong>
                            <span style={{ opacity: 0.85 }}>"{replyingToMessage.content.length > 50 ? replyingToMessage.content.substring(0, 47) + '...' : replyingToMessage.content}"</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setReplyingToMessage(null)}
                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7, padding: '2px' }}
                            title="Cancel Reply"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}

                      {/* Toolbar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => insertFormat('**', '**')} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="Bold">
                          <Bold size={14} />
                        </button>
                        <button type="button" onClick={() => insertFormat('*', '*')} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="Italic">
                          <Italic size={14} />
                        </button>
                        <button type="button" onClick={() => insertFormat('`', '`')} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="Code">
                          <Code size={14} />
                        </button>
                        <button type="button" onClick={() => insertFormat('[', '](url)')} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="Link">
                          <LinkIcon size={14} />
                        </button>
                        <button type="button" onClick={() => insertFormat('\n- ', '')} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="List">
                          <List size={14} />
                        </button>
                        <div style={{ flex: 1 }} />
                        <button
                          type="button"
                          onClick={() => setIsPreviewMode(!isPreviewMode)}
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: isPreviewMode ? 'var(--accent-color)' : 'inherit' }}
                        >
                          <Eye size={14} />
                          <span>{isPreviewMode ? 'Edit' : 'Preview'}</span>
                        </button>
                      </div>

                      {/* Input or Preview Mode */}
                      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
                        {isPreviewMode ? (
                          <div style={{ flex: 1, minHeight: '60px', padding: '0.65rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)' }}>
                            {renderMessageMarkdown(messageText || '*Nothing to preview*')}
                          </div>
                        ) : (
                          <textarea
                            ref={textareaRef}
                            rows={2}
                            placeholder={isBugReportsChat ? "Describe the bug or feedback for admins..." : "Type a message (supports Markdown formatting)..."}
                            value={messageText}
                            onChange={e => setMessageText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '0.65rem',
                              borderRadius: '8px',
                              background: 'rgba(0,0,0,0.25)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-main)',
                              fontSize: '0.9rem',
                              boxSizing: 'border-box',
                              resize: 'none'
                            }}
                          />
                        )}

                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={isSending || !messageText.trim()}
                          style={{ padding: '0.65rem 1rem', height: '100%', alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Send size={18} />
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', margin: 'auto', opacity: 0.6, padding: '3rem' }}>
                <MessageSquare size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                <h3>Select a conversation or start a new chat!</h3>
                <p style={{ fontSize: '0.85rem' }}>You can only send DMs to accepted friends.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New DM Modal */}
      {newDmModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="nook-panel" style={{ width: '100%', maxWidth: '420px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Start Direct Message</h3>
              <button onClick={() => setNewDmModalOpen(false)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1rem' }}>
              Select an accepted friend to message:
            </p>

            {acceptedFriends.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#eab308' }}>You don't have any accepted friends yet! Add friends from the Friends page first.</p>
            ) : (
              <select
                value={selectedFriendForDm}
                onChange={e => setSelectedFriendForDm(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', marginBottom: '1.25rem' }}
              >
                <option value="">-- Select Friend --</option>
                {acceptedFriends.map(f => (
                  <option key={f.id} value={f.id}>@{f.username} ({f.display_name || 'No Name'})</option>
                ))}
              </select>
            )}

            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setNewDmModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleStartDirectMessage} className="btn-primary" disabled={!selectedFriendForDm}>Start Chat</button>
            </div>
          </div>
        </div>
      )}

      {/* New Group Chat Modal */}
      {newGroupModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="nook-panel" style={{ width: '100%', maxWidth: '460px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Create Group Chat</h3>
              <button onClick={() => setNewGroupModalOpen(false)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1rem' }}>
              You can add any accepted friends to your group chat. Members do not need to be friends with each other.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Group Chat Name *</label>
              <input
                type="text"
                placeholder="e.g. Gaming Squad 🎮"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', boxSizing: 'border-box' }}
              />
            </div>

            {/* Avatar Upload & Crop System */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Group Avatar Icon (Upload or Image URL)</label>
              
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                {newGroupAvatarUrl ? (
                  <img src={newGroupAvatarUrl} alt="Group Avatar" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-color)' }} />
                ) : (
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={20} />
                  </div>
                )}

                <label className="btn-secondary" style={{ padding: '0.45rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Upload size={14} />
                  <span>Upload & Crop Image</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleAvatarFileSelected(e, 'new_group')} />
                </label>

                {newGroupAvatarUrl && (
                  <button type="button" onClick={() => setNewGroupAvatarUrl('')} className="btn-secondary" style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', color: '#ef4444' }}>
                    Remove
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder="Or enter Image URL (https://...)"
                value={newGroupAvatarUrl}
                onChange={e => setNewGroupAvatarUrl(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Select Friends to Add *</label>
              {acceptedFriends.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#eab308' }}>No accepted friends available.</p>
              ) : (
                <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(0,0,0,0.15)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  {acceptedFriends.map(f => {
                    const isChecked = selectedGroupMemberIds.includes(f.id);
                    return (
                      <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedGroupMemberIds(selectedGroupMemberIds.filter(id => id !== f.id));
                            } else {
                              setSelectedGroupMemberIds([...selectedGroupMemberIds, f.id]);
                            }
                          }}
                        />
                        <span>@{f.username} ({f.display_name || 'No Name'})</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setNewGroupModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateGroupChat} className="btn-primary" disabled={!newGroupName.trim() || selectedGroupMemberIds.length === 0}>Create Group</button>
            </div>
          </div>
        </div>
      )}

      {/* Group Settings Modal */}
      {groupSettingsModalOpen && activeConv && activeConv.type === 'group' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="nook-panel" style={{ width: '100%', maxWidth: '440px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Settings size={18} />
                <span>Group Chat Settings</span>
              </h3>
              <button onClick={() => setGroupSettingsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Group Title</label>
              <input
                type="text"
                value={editGroupName}
                onChange={e => setEditGroupName(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', boxSizing: 'border-box' }}
              />
            </div>

            {/* Avatar Upload & Crop System */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Group Avatar Icon (Upload or Image URL)</label>
              
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                {editGroupAvatarUrl ? (
                  <img src={editGroupAvatarUrl} alt="Group Avatar" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-color)' }} />
                ) : (
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={20} />
                  </div>
                )}

                <label className="btn-secondary" style={{ padding: '0.45rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Upload size={14} />
                  <span>Upload & Crop Image</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleAvatarFileSelected(e, 'edit_group')} />
                </label>

                {editGroupAvatarUrl && (
                  <button type="button" onClick={() => setEditGroupAvatarUrl('')} className="btn-secondary" style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', color: '#ef4444' }}>
                    Remove
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder="Or enter Image URL (https://...)"
                value={editGroupAvatarUrl}
                onChange={e => setEditGroupAvatarUrl(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
              <button onClick={handleLeaveGroup} className="btn-secondary" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <LogOut size={16} />
                <span>Leave Group</span>
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setGroupSettingsModalOpen(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleUpdateGroupSettings} className="btn-primary">Save Settings</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member to Group Modal */}
      {addMemberModalOpen && activeConv && activeConv.type === 'group' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="nook-panel" style={{ width: '100%', maxWidth: '420px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Add Friend to Group</h3>
              <button onClick={() => setAddMemberModalOpen(false)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1rem' }}>
              Select an accepted friend to add to <strong>"{activeConv.name}"</strong>:
            </p>

            {acceptedFriends.filter(f => !(activeConv.members || []).some((m: any) => m.id === f.id)).length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#eab308' }}>No available friends to add (either all your friends are already in this group or you haven't added friends yet).</p>
            ) : (
              <select
                value={selectedAddMemberId}
                onChange={e => setSelectedAddMemberId(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', marginBottom: '1.25rem' }}
              >
                <option value="">-- Select Friend --</option>
                {acceptedFriends
                  .filter(f => !(activeConv.members || []).some((m: any) => m.id === f.id))
                  .map(f => (
                    <option key={f.id} value={f.id}>@{f.username} ({f.display_name || 'No Name'})</option>
                  ))}
              </select>
            )}

            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setAddMemberModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleAddMemberToGroup} className="btn-primary" disabled={!selectedAddMemberId}>Add to Group</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Crop Modal for Group Chat Icon */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageFile={cropImageFile}
        title="Crop Group Chat Icon"
        aspectRatio={1}
        onCropComplete={handleCropComplete}
        onClose={() => {
          setCropModalOpen(false);
          setCropImageFile(null);
        }}
      />
    </div>
  );
};
