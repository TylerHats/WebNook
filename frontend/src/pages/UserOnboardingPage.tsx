import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Sparkles, Image, User, Music, ArrowRight, CheckCircle2, Upload, Heart } from 'lucide-react';

export const UserOnboardingPage: React.FC = () => {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Media Files
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80');

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>(user?.banner_url || '');

  // Step 2: Basic Info
  const [displayName, setDisplayName] = useState(user?.display_name || user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusEmoji, setStatusEmoji] = useState('✨');

  // Step 3: Anthem Music
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicTitle, setMusicTitle] = useState('My Favorite Song');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAvatarChange = (file: File | null) => {
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (file: File | null) => {
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!token || !user) return;
    setIsSubmitting(true);

    try {
      // 1. Upload Avatar File if provided
      if (avatarFile) {
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', avatarFile);
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
        await fetch('/api/nook/upload/banner', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: bannerFormData
        });
      }

      // 3. Upload Music Audio File if provided
      if (musicFile) {
        const musicFormData = new FormData();
        musicFormData.append('music', musicFile);
        await fetch('/api/nook/upload/music', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: musicFormData
        });
      }

      // 4. Submit Profile Info & Complete Onboarding
      const res = await fetch('/api/nook/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          display_name: displayName,
          bio,
          status_message: statusMessage,
          status_emoji: statusEmoji,
          bg_music_title: musicTitle
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
      <div className="nook-panel" style={{ maxWidth: '580px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Sparkles size={36} color="var(--accent-color)" style={{ margin: '0 auto 0.5rem' }} />
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Setup Your Nook</h2>
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Welcome @{user?.username}! Let's personalize your profile & upload your files.</p>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          {[
            { num: 1, label: 'Photos & Banner' },
            { num: 2, label: 'About & Status' },
            { num: 3, label: 'Anthem Music' }
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
                fontSize: '0.85rem'
              }}
            >
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: step === s.num ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                {s.num}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* STEP 1: Avatar & Banner File Uploads */}
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
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleAvatarChange(e.target.files?.[0] || null)}
                    style={{ fontSize: '0.85rem' }}
                  />
                  <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.2rem' }}>PNG, JPG, SVG, GIF (Max 25MB)</div>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Banner Background Image</label>
              {bannerPreview && (
                <div style={{ height: '80px', backgroundImage: `url(${bannerPreview})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '8px', marginBottom: '0.5rem' }} />
              )}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '10px' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleBannerChange(e.target.files?.[0] || null)}
                  style={{ fontSize: '0.85rem' }}
                />
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
                <span>Next: Anthem Music</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Music Audio File Upload */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Music size={20} color="var(--accent-color)" />
              <span>Background Nook Anthem Audio File</span>
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Song Title</label>
              <input
                type="text"
                value={musicTitle}
                onChange={e => setMusicTitle(e.target.value)}
                placeholder="e.g. My Favorite Anthem"
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Upload Audio File (MP3 / WAV / OGG)</label>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={e => setMusicFile(e.target.files?.[0] || null)}
                  style={{ fontSize: '0.85rem' }}
                />
                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.4rem' }}>
                  Upload an audio file to auto-play on your Nook profile!
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <button onClick={() => setStep(2)} className="btn-secondary">Back</button>
              <button onClick={handleCompleteOnboarding} className="btn-primary" disabled={isSubmitting}>
                <CheckCircle2 size={18} />
                <span>{isSubmitting ? 'Saving Nook Profile...' : 'Complete & Launch My Nook'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
