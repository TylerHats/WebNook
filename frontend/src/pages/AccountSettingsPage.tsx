import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { startRegistration } from '@simplewebauthn/browser';
import { ShieldCheck, KeyRound, QrCode, User, Save, Trash2, CheckCircle2, Mail, Smile, Upload } from 'lucide-react';
import { ImageCropModal } from '../components/ui/ImageCropModal';

export const AccountSettingsPage: React.FC = () => {
  const { user, token, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [bannerUrl, setBannerUrl] = useState(user?.banner_url || '');
  const [avatarFileName, setAvatarFileName] = useState('');
  const [bannerFileName, setBannerFileName] = useState('');
  const [statusMessage, setStatusMessage] = useState(user?.status_message || '');
  const [statusEmoji, setStatusEmoji] = useState(user?.status_emoji || '');

  // Message reaction preferences
  const [reactionEmojis, setReactionEmojis] = useState<string[]>(['👍', '❤️', '😂', '🔥', '😮', '🎉']);
  const [defaultReaction, setDefaultReaction] = useState<string>('❤️');

  // Crop Modal state
  const [cropModal, setCropModal] = useState<{
    isOpen: boolean;
    file: File | null;
    title: string;
    aspectRatio: number;
    target: 'avatar' | 'banner';
  }>({
    isOpen: false,
    file: null,
    title: '',
    aspectRatio: 1,
    target: 'avatar'
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

  const handleAvatarFileUpload = async (file: File | null) => {
    if (!file || !token) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await fetch('/api/nook/upload/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setAvatarUrl(data.avatar_url);
        showToast('Avatar uploaded successfully!', 'success');
        refreshUser();
      } else {
        showToast(data.error || 'Failed to upload avatar', 'error');
      }
    } catch (e) {
      showToast('Error uploading avatar file', 'error');
    }
  };

  const handleBannerFileUpload = async (file: File | null) => {
    if (!file || !token) return;
    const formData = new FormData();
    formData.append('banner', file);
    try {
      const res = await fetch('/api/nook/upload/banner', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setBannerUrl(data.banner_url);
        showToast('Banner uploaded successfully!', 'success');
        refreshUser();
      } else {
        showToast(data.error || 'Failed to upload banner', 'error');
      }
    } catch (e) {
      showToast('Error uploading banner file', 'error');
    }
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ShieldCheck size={28} color="var(--accent-color)" />
        <span>Account & Security Settings</span>
      </h1>

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
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Profile Avatar Image (URL or Direct Upload)</label>
                <input
                  type="text"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', marginBottom: '0.4rem' }}
                />
                <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}>
                  <Upload size={15} />
                  <span>{avatarFileName || 'Choose Avatar Image...'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setAvatarFileName(f.name);
                        setCropModal({ isOpen: true, file: f, title: 'Crop Profile Avatar Image', aspectRatio: 1, target: 'avatar' });
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Header Banner Image (URL or Direct Upload)</label>
                <input
                  type="text"
                  placeholder="https://example.com/banner.jpg"
                  value={bannerUrl}
                  onChange={e => setBannerUrl(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', marginBottom: '0.4rem' }}
                />
                <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}>
                  <Upload size={15} />
                  <span>{bannerFileName || 'Choose Banner Image...'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setBannerFileName(f.name);
                        setCropModal({ isOpen: true, file: f, title: 'Crop Header Banner Image', aspectRatio: 3, target: 'banner' });
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
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
      </div>

      <ImageCropModal
        isOpen={cropModal.isOpen}
        imageFile={cropModal.file}
        title={cropModal.title}
        aspectRatio={cropModal.aspectRatio}
        onCropComplete={(croppedFile) => {
          if (cropModal.target === 'avatar') {
            handleAvatarFileUpload(croppedFile);
          } else if (cropModal.target === 'banner') {
            handleBannerFileUpload(croppedFile);
          }
        }}
        onClose={() => setCropModal({ ...cropModal, isOpen: false, file: null })}
      />
    </div>
  );
};
