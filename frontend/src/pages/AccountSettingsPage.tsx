import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePWA } from '../context/PWAContext';
import { startRegistration } from '@simplewebauthn/browser';
import { ShieldCheck, KeyRound, QrCode, User, Save, Trash2, CheckCircle2, Mail, Smile, Upload, Smartphone, Download, AlertTriangle, X, Crop, Info, ExternalLink, GitBranch, Github, Sparkles, Globe, Lock } from 'lucide-react';
import { ImageCropModal } from '../components/ui/ImageCropModal';

export const AccountSettingsPage: React.FC = () => {
  const { user, token, refreshUser, logout } = useAuth();
  const { showToast } = useToast();
  const { isInstallable, isStandalone, promptInstall, resetDismissedBanner, isBannerDismissed } = usePWA();
  const navigate = useNavigate();

  const [deleteModalStep, setDeleteModalStep] = useState<0 | 1 | 2>(0);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [bannerUrl, setBannerUrl] = useState(user?.banner_url || '');
  const [avatarFileName, setAvatarFileName] = useState('');
  const [bannerFileName, setBannerFileName] = useState('');
  const [statusMessage, setStatusMessage] = useState(user?.status_message || '');
  const [statusEmoji, setStatusEmoji] = useState(user?.status_emoji || '');

  // Nook Privacy State
  const [nookVisibility, setNookVisibility] = useState<'public' | 'private'>('private');

  const fetchNookPrivacy = () => {
    if (!token) return;
    fetch('/api/nook/settings/mine', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.nookSettings?.visibility_nook) {
          setNookVisibility(data.nookSettings.visibility_nook as any);
        }
      })
      .catch(err => console.error('Error fetching nook privacy:', err));
  };

  const handleUpdateNookPrivacy = async (newVal: 'public' | 'private') => {
    if (!token) return;
    try {
      const res = await fetch('/api/nook/customize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ visibility_nook: newVal })
      });
      if (res.ok) {
        setNookVisibility(newVal);
        showToast(`Nook privacy set to ${newVal === 'public' ? 'Public 🌐' : 'Private (Friends Only) 🔒'}!`, 'success');
      } else {
        showToast('Failed to update Nook privacy', 'error');
      }
    } catch (e) {
      showToast('Error updating Nook privacy', 'error');
    }
  };

  // Message reaction preferences
  const [reactionEmojis, setReactionEmojis] = useState<string[]>(['👍', '❤️', '😂', '🔥', '😮', '🎉']);
  const [defaultReaction, setDefaultReaction] = useState<string>('❤️');

  // Crop Modal state
  const [cropModal, setCropModal] = useState<{
    isOpen: boolean;
    file: File | string | null;
    title: string;
    aspectRatio: number;
    target: 'avatar' | 'banner';
    isRecrop?: boolean;
  }>({
    isOpen: false,
    file: null,
    title: '',
    aspectRatio: 1,
    target: 'avatar',
    isRecrop: false
  });

  // Email Notifications Preferences state
  const [notifyEmailGuestbook, setNotifyEmailGuestbook] = useState((user as any)?.notify_email_guestbook !== 0);
  const [notifyEmailFriends, setNotifyEmailFriends] = useState((user as any)?.notify_email_friends !== 0);
  const [notifyEmailSystem, setNotifyEmailSystem] = useState((user as any)?.notify_email_system !== 0);
  const [notifyEmailMessages, setNotifyEmailMessages] = useState((user as any)?.notify_email_messages !== 0);

  // TOTP setup state
  const [totpQr, setTotpQr] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpCodeInput, setTotpCodeInput] = useState('');

  // Passkeys list
  const [passkeys, setPasskeys] = useState<any[]>([]);

  // About WebNook Modal State
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [aboutInfo, setAboutInfo] = useState<any>(null);
  const [isAboutLoading, setIsAboutLoading] = useState(false);

  const fetchAboutInfo = () => {
    setIsAboutLoading(true);
    fetch('/api/nook/about')
      .then(res => res.json())
      .then(data => {
        setAboutInfo(data);
        setIsAboutLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsAboutLoading(false);
      });
  };

  useEffect(() => {
    if (token) {
      fetchPasskeys();
    }
    if ((user as any)?.reaction_picker_json) {
      try {
        const parsed = typeof (user as any).reaction_picker_json === 'string'
          ? JSON.parse((user as any).reaction_picker_json)
          : (user as any).reaction_picker_json;
        if (Array.isArray(parsed) && parsed.length > 0) setReactionEmojis(parsed);
      } catch (e) {}
    }
    if ((user as any)?.default_reaction) {
      setDefaultReaction((user as any).default_reaction);
    }
  }, [user, token]);

  const handleSaveReactionPreferences = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/messages/reaction-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          reaction_picker_json: reactionEmojis,
          default_reaction: defaultReaction
        })
      });
      if (res.ok) {
        showToast('Reaction preferences saved!', 'success');
        refreshUser();
      } else {
        showToast('Failed to save reaction preferences', 'error');
      }
    } catch (e) {
      showToast('Error saving reaction preferences', 'error');
    }
  };

  const handleSaveNotificationPreferences = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/nook/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          notify_email_guestbook: notifyEmailGuestbook,
          notify_email_friends: notifyEmailFriends,
          notify_email_system: notifyEmailSystem,
          notify_email_messages: notifyEmailMessages
        })
      });
      if (res.ok) {
        showToast('Email notification preferences saved!', 'success');
        refreshUser();
      } else {
        showToast('Failed to save email preferences', 'error');
      }
    } catch (e) {
      showToast('Error updating notification preferences', 'error');
    }
  };

  const fetchPasskeys = () => {
    fetch('/api/mfa/passkeys', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.passkeys) setPasskeys(data.passkeys);
      })
      .catch(err => console.error(err));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Preserve existing uploaded avatar/banner if inputs are left blank
    const finalAvatar = avatarUrl.trim() !== '' ? avatarUrl.trim() : (user?.avatar_url || '');
    const finalBanner = bannerUrl.trim() !== '' ? bannerUrl.trim() : (user?.banner_url || '');

    try {
      const res = await fetch('/api/nook/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          display_name: displayName,
          bio,
          avatar_url: finalAvatar,
          banner_url: finalBanner,
          status_message: statusMessage,
          status_emoji: statusEmoji
        })
      });

      if (res.ok) {
        showToast('Profile info updated!', 'success');
        refreshUser();
      } else {
        showToast('Failed to update profile', 'error');
      }
    } catch (e) {
      showToast('Error updating profile', 'error');
    }
  };

  // Setup TOTP
  const handleSetupTotp = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/mfa/totp/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTotpQr(data.qrDataUrl);
        setTotpSecret(data.secret);
      }
    } catch (e) {
      showToast('Failed to initialize TOTP', 'error');
    }
  };

  const handleVerifyTotp = async () => {
    if (!token || !totpCodeInput) return;
    try {
      const res = await fetch('/api/mfa/totp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ token: totpCodeInput })
      });
      if (res.ok) {
        showToast('TOTP 2FA enabled!', 'success');
        setTotpQr(null);
        refreshUser();
      } else {
        showToast('Invalid TOTP token', 'error');
      }
    } catch (e) {
      showToast('Error verifying TOTP token', 'error');
    }
  };

  // Register Passkey WebAuthn
  const handleRegisterPasskey = async () => {
    if (!token) return;
    try {
      const optRes = await fetch('/api/mfa/passkey/register-options', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const options = await optRes.json();

      const attResp = await startRegistration(options);

      const verifyRes = await fetch('/api/mfa/passkey/register-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(attResp)
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.verified) {
        showToast('Passkey registered successfully!', 'success');
        fetchPasskeys();
      } else {
        showToast(verifyData.error || 'Passkey registration failed', 'error');
      }
    } catch (e: any) {
      showToast('Passkey registration cancelled or failed', 'error');
    }
  };

  const handleDeletePasskey = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/mfa/passkeys/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Passkey removed', 'info');
        fetchPasskeys();
      }
    } catch (e) {
      showToast('Failed to remove passkey', 'error');
    }
  };

  const [rawAvatarFile, setRawAvatarFile] = useState<File | null>(null);
  const [rawBannerFile, setRawBannerFile] = useState<File | null>(null);

  const handleAvatarFileUpload = async (croppedFile: File | null, originalFile: File | null = null, isRecrop = false) => {
    if (!croppedFile || !token) return;
    const formData = new FormData();
    formData.append('avatar', croppedFile);
    if (originalFile) {
      formData.append('avatar_original', originalFile);
    }
    try {
      const res = await fetch(`/api/nook/upload/avatar?is_recrop=${isRecrop}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setAvatarUrl(data.avatar_url);
        showToast('Avatar updated successfully!', 'success');
        refreshUser();
      } else {
        showToast(data.error || 'Failed to upload avatar', 'error');
      }
    } catch (e) {
      showToast('Error uploading avatar file', 'error');
    }
  };

  const handleBannerFileUpload = async (croppedFile: File | null, originalFile: File | null = null, isRecrop = false) => {
    if (!croppedFile || !token) return;
    const formData = new FormData();
    formData.append('banner', croppedFile);
    if (originalFile) {
      formData.append('banner_original', originalFile);
    }
    try {
      const res = await fetch(`/api/nook/upload/banner?is_recrop=${isRecrop}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setBannerUrl(data.banner_url);
        showToast('Banner updated successfully!', 'success');
        refreshUser();
      } else {
        showToast(data.error || 'Failed to upload banner', 'error');
      }
    } catch (e) {
      showToast('Error uploading banner file', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/nook/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Account permanently deleted', 'info');
        logout();
        navigate('/login');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to delete account', 'error');
      }
    } catch (e) {
      showToast('Error deleting account', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteModalStep(0);
    }
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={28} color="var(--accent-color)" />
          <span>Account & Security Settings</span>
        </h1>
        <button
          type="button"
          onClick={() => {
            setIsAboutModalOpen(true);
            fetchAboutInfo();
          }}
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 0.9rem', fontSize: '0.85rem', fontWeight: 700 }}
        >
          <Info size={17} color="var(--accent-color)" />
          <span>About WebNook</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Profile Information Form */}
        <div className="nook-panel">
          <div className="nook-panel-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={20} style={{ flexShrink: 0 }} />
            <span>Profile Information</span>
          </div>
          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Status Message</label>
                <input
                  type="text"
                  placeholder="Vibing & listening to music..."
                  value={statusMessage}
                  onChange={e => setStatusMessage(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Profile Avatar Image</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}>
                    <Upload size={15} />
                    <span>{avatarFileName || (avatarUrl.startsWith('/uploads/') ? 'Upload New Avatar...' : 'Choose Avatar Image...')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setRawAvatarFile(f);
                          setAvatarFileName(f.name);
                          setCropModal({ isOpen: true, file: f, title: 'Crop Profile Avatar Image', aspectRatio: 1, target: 'avatar', isRecrop: false });
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {(user?.avatar_original_url || user?.avatar_url) && (
                    <button
                      type="button"
                      onClick={() => {
                        const src = user.avatar_original_url || user.avatar_url;
                        if (src) {
                          setCropModal({ isOpen: true, file: src, title: 'Adjust Avatar Position & Crop', aspectRatio: 1, target: 'avatar', isRecrop: true });
                        }
                      }}
                      className="btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}
                    >
                      <Crop size={15} />
                      <span>Adjust Crop</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Header Banner Image</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}>
                    <Upload size={15} />
                    <span>{bannerFileName || (bannerUrl.startsWith('/uploads/') ? 'Upload New Banner...' : 'Choose Banner Image...')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setRawBannerFile(f);
                          setBannerFileName(f.name);
                          setCropModal({ isOpen: true, file: f, title: 'Crop Header Banner Image', aspectRatio: 3, target: 'banner', isRecrop: false });
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {(user?.banner_original_url || user?.banner_url) && (
                    <button
                      type="button"
                      onClick={() => {
                        const src = user.banner_original_url || user.banner_url;
                        if (src) {
                          setCropModal({ isOpen: true, file: src, title: 'Adjust Banner Position & Crop', aspectRatio: 3, target: 'banner', isRecrop: true });
                        }
                      }}
                      className="btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}
                    >
                      <Crop size={15} />
                      <span>Adjust Crop</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Save size={16} style={{ flexShrink: 0 }} />
              <span>Save Profile Info</span>
            </button>
          </form>
        </div>

        {/* Nook Privacy & Access Control */}
        <div className="nook-panel">
          <div className="nook-panel-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={20} style={{ flexShrink: 0 }} />
            <span>Nook Profile Privacy & Visibility</span>
          </div>
          <p style={{ fontSize: '0.85rem', opacity: 0.8, lineHeight: 1.5, marginBottom: '1rem' }}>
            Choose who can view your Nook profile page. You can switch between Public and Private at any time.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div
              onClick={() => handleUpdateNookPrivacy('public')}
              style={{
                background: nookVisibility === 'public' ? 'rgba(99, 102, 241, 0.18)' : 'rgba(0,0,0,0.2)',
                border: nookVisibility === 'public' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Globe size={18} color={nookVisibility === 'public' ? 'var(--accent-color)' : 'inherit'} />
                  <span>Public Nook</span>
                </span>
                {nookVisibility === 'public' && <span style={{ fontSize: '0.72rem', background: 'var(--accent-color)', color: '#fff', padding: '0.15rem 0.55rem', borderRadius: '10px', fontWeight: 700 }}>ACTIVE</span>}
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.75, lineHeight: 1.4 }}>
                Anyone on the web can visit your Nook URL and view your profile, music, and widgets.
              </p>
            </div>

            <div
              onClick={() => handleUpdateNookPrivacy('private')}
              style={{
                background: nookVisibility === 'private' ? 'rgba(99, 102, 241, 0.18)' : 'rgba(0,0,0,0.2)',
                border: nookVisibility === 'private' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Lock size={18} color={nookVisibility === 'private' ? 'var(--accent-color)' : 'inherit'} />
                  <span>Private (Friends Only)</span>
                </span>
                {nookVisibility === 'private' && <span style={{ fontSize: '0.72rem', background: 'var(--accent-color)', color: '#fff', padding: '0.15rem 0.55rem', borderRadius: '10px', fontWeight: 700 }}>ACTIVE</span>}
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.75, lineHeight: 1.4 }}>
                Only accepted friends can view your Nook profile. Unauthenticated users and non-friends will see a private profile message.
              </p>
            </div>
          </div>
        </div>

        {/* Mobile PWA & App Installation Card */}
        <div className="nook-panel">
          <div className="nook-panel-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Smartphone size={20} style={{ flexShrink: 0 }} />
            <span>Mobile PWA & App Installation</span>
          </div>

          {isStandalone ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              <CheckCircle2 size={22} style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: '0.95rem' }}>WebNook App Installed & Active!</strong>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', opacity: 0.9 }}>You are currently running WebNook as a standalone native-feeling progressive web app.</p>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.9rem', opacity: 0.85, lineHeight: 1.5, marginBottom: '1rem' }}>
                Install WebNook on your Android phone, iPhone, or desktop to access your Nook like a native app directly from your home screen with zero browser address bars!
              </p>

              {isInstallable ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      const success = await promptInstall();
                      if (success) {
                        showToast('WebNook App installed successfully!', 'success');
                      }
                    }}
                    className="btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <Download size={18} />
                    <span>Install WebNook App to Home Screen</span>
                  </button>

                  {isBannerDismissed && (
                    <button
                      type="button"
                      onClick={() => {
                        resetDismissedBanner();
                        showToast('PWA installation popup banner restored!', 'info');
                      }}
                      className="btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Smartphone size={16} />
                      <span>Re-enable Installation Banner Prompt</span>
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--accent-color)' }}>📱 How to install WebNook on your phone:</div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6, opacity: 0.9 }}>
                    <li><strong>Android Chrome / Edge:</strong> Tap the 3 dots menu <span style={{ fontWeight: 800 }}>(⋮)</span> at top right ➔ Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.</li>
                    <li><strong>iOS Safari:</strong> Tap the Share button <span style={{ fontWeight: 800 }}>(⎋)</span> ➔ Scroll down & tap <strong>"Add to Home Screen"</strong>.</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* TOTP Authenticator Setup */}
        <div className="nook-panel">
          <div className="nook-panel-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode size={20} style={{ flexShrink: 0 }} />
            <span>TOTP Authenticator 2FA</span>
          </div>

          {user?.is_totp_enabled ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
              <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
              <span>TOTP Authenticator is enabled on your account.</span>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
                Secure your account with authenticator apps like Google Authenticator or Authy.
              </p>
              {!totpQr ? (
                <button onClick={handleSetupTotp} className="btn-secondary">Generate TOTP QR Code</button>
              ) : (
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <img src={totpQr} alt="TOTP QR" style={{ width: '150px', height: '150px', borderRadius: '10px', background: '#fff', padding: '5px' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Scan this QR code in your authenticator app, then enter the 6-digit verification code below:</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="123456"
                        value={totpCodeInput}
                        onChange={e => setTotpCodeInput(e.target.value)}
                        style={{ width: '120px', padding: '0.5rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', textAlign: 'center' }}
                      />
                      <button onClick={handleVerifyTotp} className="btn-primary">Enable TOTP</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* WebAuthn / Passkeys Setup */}
        <div className="nook-panel">
          <div className="nook-panel-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <KeyRound size={20} style={{ flexShrink: 0 }} />
            <span>Passkeys & Hardware Keys (WebAuthn)</span>
          </div>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
            Passkeys allow instant, passwordless biometrics (FaceID, TouchID, YubiKey) login.
          </p>

          <button onClick={handleRegisterPasskey} className="btn-primary" style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <KeyRound size={16} style={{ flexShrink: 0 }} />
            <span>Register New Passkey</span>
          </button>

          {passkeys.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '0.85rem', opacity: 0.7 }}>Your Registered Passkeys:</h4>
              {passkeys.map(pk => (
                <div key={pk.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.85rem', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>Passkey ID: {pk.id.substring(0, 16)}...</span>
                  <Trash2 size={16} style={{ cursor: 'pointer', color: '#ef4444', flexShrink: 0 }} onClick={() => handleDeletePasskey(pk.id)} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email Notifications Preferences Card */}
        <div className="nook-panel">
          <div className="nook-panel-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={20} style={{ flexShrink: 0 }} />
            <span>Email Notification Preferences</span>
          </div>
          <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1.25rem' }}>
            Choose which interactions will send styled system emails to your inbox.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={notifyEmailGuestbook}
                onChange={e => setNotifyEmailGuestbook(e.target.checked)}
              />
              <span>Send email when someone leaves a guestbook note on my Nook</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={notifyEmailFriends}
                onChange={e => setNotifyEmailFriends(e.target.checked)}
              />
              <span>Send email on new friend requests and accepted invitations</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={notifyEmailSystem}
                onChange={e => setNotifyEmailSystem(e.target.checked)}
              />
              <span>Send email for system announcements and admin notifications</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={notifyEmailMessages}
                onChange={e => setNotifyEmailMessages(e.target.checked)}
              />
              <span>Send email on new direct and group messages</span>
            </label>
          </div>

          <button onClick={handleSaveNotificationPreferences} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
            <Save size={16} />
            <span>Save Email Preferences</span>
          </button>
        </div>

        {/* Message Reaction Preferences Card */}
        <div className="nook-panel" style={{ marginTop: '1.5rem' }}>
          <div className="nook-panel-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Smile size={20} style={{ flexShrink: 0 }} />
            <span>Message Reaction Preferences</span>
          </div>
          <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1.25rem' }}>
            Customize the quick emojis available when reacting to messages, and choose your default double-tap reaction emoji.
          </p>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Default Double-Tap Reaction Emoji</label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Type or paste any emoji (e.g. ❤️, 🔥, 🎉)"
                value={defaultReaction}
                onChange={e => setDefaultReaction(e.target.value)}
                style={{
                  width: '100px',
                  fontSize: '1.3rem',
                  textAlign: 'center',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.25)',
                  border: '2px solid var(--accent-color)',
                  color: 'var(--text-main)'
                }}
              />
              <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Or pick from quick reactions:</span>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {reactionEmojis.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setDefaultReaction(emoji)}
                    style={{
                      fontSize: '1.2rem',
                      padding: '0.3rem 0.5rem',
                      borderRadius: '8px',
                      border: defaultReaction === emoji ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                      background: defaultReaction === emoji ? 'rgba(99, 102, 241, 0.25)' : 'rgba(0,0,0,0.2)',
                      cursor: 'pointer'
                    }}
                    title={`Set ${emoji} as Default`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Quick Reactions List (Comma separated emojis)</label>
            <input
              type="text"
              value={reactionEmojis.join(', ')}
              onChange={e => {
                const split = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                setReactionEmojis(split.length > 0 ? split : ['👍', '❤️', '😂', '🔥', '😮', '🎉']);
              }}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', boxSizing: 'border-box' }}
            />
          </div>

          <button onClick={handleSaveReactionPreferences} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
            <Save size={16} />
            <span>Save Reaction Preferences</span>
          </button>
        </div>

        {/* Danger Zone: Account Deletion Card */}
        <div className="nook-panel" style={{ marginTop: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
          <div className="nook-panel-header" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <span>Danger Zone</span>
          </div>
          <p style={{ fontSize: '0.85rem', opacity: 0.85, lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Permanently delete your WebNook account, profile customizations, and stickers. This action is permanent and cannot be undone.
          </p>

          <button
            type="button"
            onClick={() => setDeleteModalStep(1)}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: 'var(--border-radius-btn)',
              padding: '0.6rem 1.2rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Trash2 size={16} />
            <span>Delete My Account</span>
          </button>
        </div>
      </div>

      {/* Double Confirmation Modal Step 1 */}
      {deleteModalStep === 1 && (
        <div className="custom-modal-backdrop" onClick={() => setDeleteModalStep(0)}>
          <div className="custom-modal-content" onClick={e => e.stopPropagation()} style={{ border: '1px solid #ef4444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 800, fontSize: '1.1rem' }}>
                <AlertTriangle size={22} />
                <span>Delete Account? (Step 1 of 2)</span>
              </div>
              <button onClick={() => setDeleteModalStep(0)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '0.9rem', lineHeight: 1.5, opacity: 0.9, marginBottom: '1.5rem' }}>
              <p style={{ marginTop: 0 }}>
                Are you sure you want to delete your WebNook account <strong>@{user?.username}</strong>?
              </p>
              <ul style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
                <li>Your Nook customizations, widgets, theme selections, and stickers will be permanently erased.</li>
                <li>Your friends list and pending requests will be cleared.</li>
                <li>Messages sent in chats will remain visible, but your profile avatar will be replaced by a <strong>generic gray silhouette avatar</strong> and your name will display as <strong>"Deleted User"</strong>.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setDeleteModalStep(0)} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setDeleteModalStep(2); setDeleteConfirmText(''); }}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--border-radius-btn)',
                  padding: '0.6rem 1.2rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Proceed to Final Step ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Double Confirmation Modal Step 2 (Type Username or DELETE to Confirm) */}
      {deleteModalStep === 2 && (
        <div className="custom-modal-backdrop" onClick={() => setDeleteModalStep(0)}>
          <div className="custom-modal-content" onClick={e => e.stopPropagation()} style={{ border: '2px solid #ef4444', boxShadow: '0 0 25px rgba(239, 68, 68, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 800, fontSize: '1.1rem' }}>
                <AlertTriangle size={22} />
                <span>Final Confirmation Required (Step 2 of 2)</span>
              </div>
              <button onClick={() => setDeleteModalStep(0)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '0.9rem', lineHeight: 1.5, opacity: 0.9, marginBottom: '1.25rem' }}>
              <p style={{ marginTop: 0, color: '#ef4444', fontWeight: 700 }}>
                🚨 Final Warning: This action is permanent and cannot be undone!
              </p>
              <p>
                To confirm permanent deletion, please type <strong style={{ color: 'var(--accent-color)' }}>{user?.username}</strong> or <strong style={{ color: '#ef4444' }}>DELETE</strong> in the box below:
              </p>
              <input
                type="text"
                placeholder={`Type "${user?.username}" or "DELETE"`}
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid #ef4444',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  marginTop: '0.5rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setDeleteModalStep(0)} className="btn-secondary" disabled={isDeleting}>
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || (deleteConfirmText.trim() !== user?.username && deleteConfirmText.trim() !== 'DELETE')}
                onClick={handleDeleteAccount}
                style={{
                  background: (deleteConfirmText.trim() === user?.username || deleteConfirmText.trim() === 'DELETE') ? '#ef4444' : 'rgba(239, 68, 68, 0.3)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--border-radius-btn)',
                  padding: '0.6rem 1.2rem',
                  fontWeight: 800,
                  cursor: (deleteConfirmText.trim() === user?.username || deleteConfirmText.trim() === 'DELETE') ? 'pointer' : 'not-allowed',
                  opacity: (deleteConfirmText.trim() === user?.username || deleteConfirmText.trim() === 'DELETE') ? 1 : 0.5
                }}
              >
                {isDeleting ? 'Deleting Account...' : 'Confirm Permanent Account Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About WebNook Popup Modal */}
      {isAboutModalOpen && (
        <div className="custom-modal-backdrop" onClick={() => setIsAboutModalOpen(false)}>
          <div className="custom-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <img src="/branding/logo.png" alt="WebNook" style={{ height: '36px', width: 'auto', borderRadius: '6px' }} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>WebNook</span>
                    <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.55rem', borderRadius: '12px', background: 'var(--accent-color)', color: '#fff', fontWeight: 700 }}>
                      {aboutInfo?.currentVersion || 'v3.3.0'}
                    </span>
                  </h3>
                  <div style={{ fontSize: '0.78rem', opacity: 0.7, marginTop: '2px' }}>Your Cozy Digital Corner of the Web</div>
                </div>
              </div>
              <button type="button" onClick={() => setIsAboutModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {isAboutLoading ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.7 }}>
                <Sparkles size={28} className="animate-spin" style={{ margin: '0 auto 0.5rem', color: 'var(--accent-color)' }} />
                <p style={{ fontSize: '0.85rem' }}>Fetching release notes & system info...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {/* System Info Badges Row */}
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '140px', background: 'rgba(0,0,0,0.25)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', opacity: 0.7, textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <GitBranch size={13} color="var(--accent-color)" />
                      <span>Active Branch / Channel</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'capitalize' }}>
                      {aboutInfo?.channel ? `${aboutInfo.channel} (main)` : 'main (stable)'}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: '140px', background: 'rgba(0,0,0,0.25)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', opacity: 0.7, textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>
                      <span>Current Release</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-color)' }}>
                      {aboutInfo?.latestRelease?.tag || aboutInfo?.currentVersion || 'v3.3.0'}
                    </div>
                  </div>
                </div>

                {/* Release Change Notes */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-color)' }}>
                    <Sparkles size={15} />
                    <span>Latest Release Notes & Features:</span>
                  </div>
                  <p style={{ fontSize: '0.83rem', lineHeight: 1.5, opacity: 0.9, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {aboutInfo?.latestRelease?.notes || 'WebNook v3.3.0 brings passkey PC authenticator compatibility, Steam showcase input debouncing, Cloud theme edge animation improvements, deduplicated friend requests, Nook Public vs Private settings, full original image crop retention, and deleted user DM display improvements.'}
                  </p>
                </div>

                {/* GitHub Repository Link Button */}
                <a
                  href={aboutInfo?.githubUrl || 'https://github.com/TylerHats/WebNook'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    padding: '0.7rem 1.2rem',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    borderRadius: 'var(--border-radius-btn)'
                  }}
                >
                  <Github size={20} />
                  <span>View Project Repository on GitHub</span>
                  <ExternalLink size={16} style={{ marginLeft: 'auto' }} />
                </a>

                <div style={{ textAlign: 'center', fontSize: '0.75rem', opacity: 0.6, marginTop: '0.2rem' }}>
                  Built with ❤️ for personal spaces and cozy web customization.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ImageCropModal
        isOpen={cropModal.isOpen}
        imageFile={cropModal.file}
        title={cropModal.title}
        aspectRatio={cropModal.aspectRatio}
        onCropComplete={(croppedFile) => {
          if (cropModal.target === 'avatar') {
            handleAvatarFileUpload(croppedFile, rawAvatarFile, cropModal.isRecrop);
          } else if (cropModal.target === 'banner') {
            handleBannerFileUpload(croppedFile, rawBannerFile, cropModal.isRecrop);
          }
        }}
        onClose={() => setCropModal({ ...cropModal, isOpen: false, file: null })}
      />
    </div>
  );
};
