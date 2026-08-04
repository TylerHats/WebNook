import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePWA } from '../context/PWAContext';
import { startRegistration } from '@simplewebauthn/browser';
import { Sparkles, Image, Palette, ArrowRight, CheckCircle2, Upload, Heart, Check, Mail, KeyRound, Smartphone, ShieldCheck, Download, Info, Globe, Lock, Crop } from 'lucide-react';
import { ImageCropModal } from '../components/ui/ImageCropModal';
import { ALL_THEMES } from '../themes/registry';

export const UserOnboardingPage: React.FC = () => {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const { isInstallable, isStandalone, promptInstall } = usePWA();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Media Files & Crop Modal
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatar_url || '/branding/default_avatar.svg');

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>(user?.banner_url || '');

  const [cropModal, setCropModal] = useState<{
    isOpen: boolean;
    file: File | string | null;
    title: string;
    aspectRatio: number;
    target: 'avatar' | 'banner' | '';
  }>({
    isOpen: false,
    file: null,
    title: '',
    aspectRatio: 1,
    target: ''
  });

  // Step 2: Basic Info
  const [displayName, setDisplayName] = useState(user?.display_name || user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusEmoji, setStatusEmoji] = useState('✨');

  // Step 3: Theme Picker
  const [selectedTheme, setSelectedTheme] = useState<string>('glassmorphism');

  // Step 4: Email Preferences & Security (Passkeys & PWA)
  const [notifyEmailGuestbook, setNotifyEmailGuestbook] = useState(true);
  const [notifyEmailFriends, setNotifyEmailFriends] = useState(true);
  const [notifyEmailMessages, setNotifyEmailMessages] = useState(true);
  const [notifyEmailSystem, setNotifyEmailSystem] = useState(true);

  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (token) {
      fetchPasskeys();
    }
  }, [token]);

  const fetchPasskeys = () => {
    if (!token) return;
    fetch('/api/mfa/passkeys', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.passkeys) setPasskeys(data.passkeys);
      })
      .catch(err => console.error(err));
  };

  const handleRegisterPasskey = async () => {
    if (!token) return;
    setIsRegisteringPasskey(true);
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
        showToast('Passkey registered successfully for passwordless login!', 'success');
        fetchPasskeys();
      } else {
        showToast(verifyData.error || 'Passkey registration failed', 'error');
      }
    } catch (e: any) {
      showToast('Passkey registration cancelled or failed', 'error');
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const [visibilityNook, setVisibilityNook] = useState<'public' | 'friends' | 'private'>('public');

  const [rawAvatarFile, setRawAvatarFile] = useState<File | null>(null);
  const [rawBannerFile, setRawBannerFile] = useState<File | null>(null);

  const handleCompleteOnboarding = async () => {
    if (!token || !user) return;
    setIsSubmitting(true);

    try {
      // 1. Upload Avatar File if provided
      if (avatarFile) {
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', avatarFile);
        if (rawAvatarFile) {
          avatarFormData.append('avatar_original', rawAvatarFile);
        }
        await fetch('/api/nook/upload/avatar', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: avatarFormData
        });
      }

      // 2. Upload Banner File if provided
      if (bannerFile) {
        const bannerFormData = new FormData();
        bannerFormData.append('banner', bannerFile);
        if (rawBannerFile) {
          bannerFormData.append('banner_original', rawBannerFile);
        }
        await fetch('/api/nook/upload/banner', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: bannerFormData
        });
      }

      // 3. Save Theme Preference, Palette Colors & Nook Page Privacy
      const themeObj = ALL_THEMES.find(t => t.id === selectedTheme);
      await fetch('/api/nook/customization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          theme: selectedTheme,
          visibility_nook: visibilityNook,
          bg_color: themeObj?.palette.bg,
          text_color: themeObj?.palette.text,
          accent_color: themeObj?.palette.accent,
          card_colors_json: { cardBg: themeObj?.palette.cardBg, border: themeObj?.palette.border }
        })
      });

      // 4. Save Email Notification Preferences
      await fetch('/api/nook/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          notify_email_guestbook: notifyEmailGuestbook,
          notify_email_friends: notifyEmailFriends,
          notify_email_system: notifyEmailSystem,
          notify_email_messages: notifyEmailMessages
        })
      });

      // 5. Submit Profile Info & Complete Onboarding
      const res = await fetch('/api/nook/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          display_name: displayName,
          bio,
          status_message: statusMessage,
          status_emoji: statusEmoji
        })
      });

      if (res.ok) {
        showToast('Nook setup complete! Welcome to WebNook 🎉', 'success');
        window.location.href = `/nook/${user.username}`;
      } else {
        showToast('Failed to save setup data', 'error');
      }
    } catch (err) {
      showToast('Error completing Nook setup', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="nook-panel" style={{ maxWidth: '620px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Sparkles size={36} color="var(--accent-color)" style={{ margin: '0 auto 0.5rem' }} />
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Setup Your Nook</h2>
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Welcome @{user?.username}! Let's personalize your profile & preferences.</p>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          {[
            { num: 1, label: 'Photos & Banner' },
            { num: 2, label: 'About & Status' },
            { num: 3, label: 'Nook Theme' },
            { num: 4, label: 'Emails & App' }
          ].map(s => (
            <div
              key={s.num}
              onClick={() => setStep(s.num as any)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: step === s.num ? 'var(--accent-color)' : 'var(--text-muted)',
                fontWeight: step === s.num ? 700 : 500,
                fontSize: '0.82rem'
              }}
            >
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: step === s.num ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                {s.num}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* STEP 1: Avatar & Banner File Uploads with Crop */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Image size={20} color="var(--accent-color)" />
              <span>Upload Profile & Banner Images</span>
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Profile Avatar Image</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '10px' }}>
                <img src={avatarPreview} alt="Avatar" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                    <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}>
                      <Upload size={15} />
                      <span>{avatarFile ? avatarFile.name : 'Choose Avatar Image...'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setRawAvatarFile(f);
                            setCropModal({ isOpen: true, file: f, title: 'Crop Profile Avatar', aspectRatio: 1, target: 'avatar' });
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {(rawAvatarFile || user?.avatar_original_url || user?.avatar_url) && (
                      <button
                        type="button"
                        onClick={() => {
                          const src = rawAvatarFile || user?.avatar_original_url || user?.avatar_url;
                          if (src) setCropModal({ isOpen: true, file: src, title: 'Adjust Avatar Crop', aspectRatio: 1, target: 'avatar' });
                        }}
                        className="btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}
                      >
                        <Crop size={15} />
                        <span>Adjust Crop</span>
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>PNG, JPG, SVG, GIF (Max 25MB)</div>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Banner Background Image</label>
              {bannerPreview && (
                <div style={{ height: '80px', backgroundImage: `url(${bannerPreview})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '8px', marginBottom: '0.5rem' }} />
              )}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '10px' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}>
                    <Upload size={15} />
                    <span>{bannerFile ? bannerFile.name : 'Choose Banner Image...'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setRawBannerFile(f);
                          setCropModal({ isOpen: true, file: f, title: 'Crop Header Banner Image', aspectRatio: 3, target: 'banner' });
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {(rawBannerFile || user?.banner_original_url || user?.banner_url) && (
                    <button
                      type="button"
                      onClick={() => {
                        const src = rawBannerFile || user?.banner_original_url || user?.banner_url;
                        if (src) setCropModal({ isOpen: true, file: src, title: 'Adjust Banner Crop', aspectRatio: 3, target: 'banner' });
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

            <button onClick={() => setStep(2)} className="btn-primary" style={{ alignSelf: 'flex-end', marginTop: '0.5rem' }}>
              <span>Next: About & Status</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 2: Bio & Status Message */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Heart size={20} color="var(--accent-color)" />
              <span>Personal Bio & Status Message</span>
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Alex ✨"
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Bio / About Me</label>
              <textarea
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell friends about your interests, music taste, and hobbies..."
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Status Message</label>
              <input
                type="text"
                value={statusMessage}
                onChange={e => setStatusMessage(e.target.value)}
                placeholder="e.g. Listening to music... ✨"
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
              <button onClick={() => setStep(3)} className="btn-primary">
                <span>Next: Choose Theme</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Theme Selection & Nook Page Privacy */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Palette size={20} color="var(--accent-color)" />
              <span>Nook Privacy & Theme Selection</span>
            </h3>

            {/* Nook Page Privacy Card */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.9rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                Nook Page Access Privacy
              </label>
              <p style={{ fontSize: '0.78rem', opacity: 0.75, margin: '0 0 0.65rem 0' }}>
                Control who can view your profile, guestbook, and widgets when visiting your URL.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div
                  onClick={() => setVisibilityNook('public')}
                  style={{
                    cursor: 'pointer',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    background: visibilityNook === 'public' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0,0,0,0.25)',
                    border: visibilityNook === 'public' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Globe size={18} style={{ color: visibilityNook === 'public' ? 'var(--accent-color)' : 'inherit', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Public (Everyone)</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>Anyone can view your Nook</div>
                  </div>
                </div>

                <div
                  onClick={() => setVisibilityNook('friends')}
                  style={{
                    cursor: 'pointer',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    background: visibilityNook === 'friends' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0,0,0,0.25)',
                    border: visibilityNook === 'friends' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Lock size={18} style={{ color: visibilityNook === 'friends' ? 'var(--accent-color)' : 'inherit', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Friends Only (Private)</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>Only accepted friends enter</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                Select Your Starting Nook Theme
              </label>
              <p style={{ fontSize: '0.78rem', opacity: 0.75, margin: '0 0 0.65rem 0' }}>
                Choose an aesthetic for your profile. You can customize colors, stickers, and layout anytime!
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', maxHeight: '230px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                {ALL_THEMES.map(t => {
                  const isSelected = selectedTheme === t.id;
                  const colors = [t.palette.bg, t.palette.cardBg, t.palette.accent, t.palette.text, t.palette.border];
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTheme(t.id)}
                      style={{
                        cursor: 'pointer',
                        padding: '0.85rem',
                        borderRadius: '12px',
                        background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0,0,0,0.25)',
                        border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          {t.badge && <span>{t.badge}</span>}
                          <span>{t.name}</span>
                        </span>
                        {isSelected && <Check size={16} color="var(--accent-color)" />}
                      </div>
                      <p style={{ fontSize: '0.73rem', opacity: 0.65, margin: '0 0 0.5rem 0', lineHeight: 1.3 }}>{t.description}</p>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {colors.map((c, idx) => (
                          <div key={idx} style={{ width: '14px', height: '14px', borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.2)' }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <button onClick={() => setStep(2)} className="btn-secondary">Back</button>
              <button onClick={() => setStep(4)} className="btn-primary">
                <span>Next: Emails & App</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Email Preferences & Security (Passkeys & PWA Installation) */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} color="var(--accent-color)" />
              <span>Email Preferences & App Security</span>
            </h3>

            {/* Email Notification Preferences Card */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={16} color="var(--accent-color)" />
                <span>Email Notification Preferences</span>
              </div>
              <p style={{ fontSize: '0.8rem', opacity: 0.75, marginBottom: '0.85rem', margin: 0 }}>
                Choose which events send styled notification emails to your inbox.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.84rem' }}>
                  <input
                    type="checkbox"
                    checked={notifyEmailGuestbook}
                    onChange={e => setNotifyEmailGuestbook(e.target.checked)}
                  />
                  <span>Guestbook Notes</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.84rem' }}>
                  <input
                    type="checkbox"
                    checked={notifyEmailFriends}
                    onChange={e => setNotifyEmailFriends(e.target.checked)}
                  />
                  <span>Friend Requests</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.84rem' }}>
                  <input
                    type="checkbox"
                    checked={notifyEmailMessages}
                    onChange={e => setNotifyEmailMessages(e.target.checked)}
                  />
                  <span>Direct & Group Messages</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.84rem' }}>
                  <input
                    type="checkbox"
                    checked={notifyEmailSystem}
                    onChange={e => setNotifyEmailSystem(e.target.checked)}
                  />
                  <span>System Announcements</span>
                </label>
              </div>
            </div>

            {/* Passkey WebAuthn Creation Card */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <KeyRound size={16} color="var(--accent-color)" />
                <span>Passkey Passwordless Login (Optional)</span>
              </div>
              <p style={{ fontSize: '0.8rem', opacity: 0.75, margin: '0 0 0.75rem 0' }}>
                Register FaceID, TouchID, or YubiKey hardware passkey for 1-click passwordless login.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleRegisterPasskey}
                  disabled={isRegisteringPasskey}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 600 }}
                >
                  <KeyRound size={15} />
                  <span>{isRegisteringPasskey ? 'Registering...' : 'Register Passkey Now'}</span>
                </button>
                {passkeys.length > 0 && (
                  <span style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <CheckCircle2 size={16} />
                    <span>{passkeys.length} Passkey{passkeys.length > 1 ? 's' : ''} Registered!</span>
                  </span>
                )}
              </div>
            </div>

            {/* Mobile PWA & App Installation Card */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Smartphone size={16} color="var(--accent-color)" />
                <span>Mobile & Desktop WebNook App</span>
              </div>

              {isStandalone ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22c55e', fontSize: '0.85rem', fontWeight: 600 }}>
                  <CheckCircle2 size={18} />
                  <span>Running as standalone WebNook app!</span>
                </div>
              ) : isInstallable ? (
                <div>
                  <p style={{ fontSize: '0.8rem', opacity: 0.75, marginBottom: '0.75rem', margin: 0 }}>
                    Install WebNook to your home screen or desktop for a native full-screen app experience.
                  </p>
                  <button
                    type="button"
                    onClick={promptInstall}
                    className="btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 600 }}
                  >
                    <Download size={15} />
                    <span>Install WebNook App to Home Screen</span>
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', opacity: 0.75, margin: 0 }}>
                  WebNook can be added to your home screen anytime from your browser menu (Chrome ➔ Add to Home Screen, Safari ➔ Share ➔ Add to Home Screen).
                </p>
              )}
            </div>

            {/* Helper Notice Tooltip */}
            <div style={{ fontSize: '0.78rem', opacity: 0.8, background: 'rgba(99, 102, 241, 0.1)', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.25)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Info size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
              <span>You can update your email preferences, passkeys, and app installation anytime later from Account Settings.</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <button onClick={() => setStep(3)} className="btn-secondary">Back</button>
              <button onClick={handleCompleteOnboarding} className="btn-primary" disabled={isSubmitting}>
                <CheckCircle2 size={18} />
                <span>{isSubmitting ? 'Saving Nook Profile...' : 'Complete & Launch My Nook'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={cropModal.isOpen}
        imageFile={cropModal.file}
        title={cropModal.title}
        aspectRatio={cropModal.aspectRatio}
        onCropComplete={(croppedFile) => {
          if (cropModal.target === 'avatar') {
            setAvatarFile(croppedFile);
            setAvatarPreview(URL.createObjectURL(croppedFile));
          } else if (cropModal.target === 'banner') {
            setBannerFile(croppedFile);
            setBannerPreview(URL.createObjectURL(croppedFile));
          }
          setCropModal({ isOpen: false, file: null, title: '', aspectRatio: 1, target: '' });
        }}
        onClose={() => setCropModal({ isOpen: false, file: null, title: '', aspectRatio: 1, target: '' })}
      />
    </div>
  );
};
