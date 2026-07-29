import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Sparkles, Image, Palette, ArrowRight, CheckCircle2, Upload, Heart, Check } from 'lucide-react';
import { ImageCropModal } from '../components/ui/ImageCropModal';

const ONBOARDING_THEMES = [
  { id: 'glassmorphism', name: 'Glassmorphism', desc: 'Vibrant frosted glass & subtle glow', colors: ['#6366f1', '#a855f7', '#ec4899'] },
  { id: 'neumorphism', name: 'Neumorphic Clean', desc: 'Soft extruded shadows & modern feel', colors: ['#e0e5ec', '#a3b1c6', '#6d7f9c'] },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', desc: 'Futuristic neon pink & electric blue', colors: ['#ff007f', '#00f0ff', '#7000ff'] },
  { id: 'retro90s', name: '90s Retro Arcade', desc: 'Nostalgic pixel vibes & bright accents', colors: ['#ff9900', '#33cc33', '#ff0066'] },
  { id: 'y2k', name: 'Y2K Metallic Gloss', desc: 'Early 2000s chrome, silver & cyan', colors: ['#c0c0c0', '#00ffff', '#ff69b4'] },
  { id: 'dark_minimal', name: 'Minimal Dark', desc: 'Sleek dark mode & sharp contrast', colors: ['#18181b', '#27272a', '#6366f1'] },
  { id: 'cottagecore', name: 'Cozy Cottagecore', desc: 'Warm botanical tones & soft sage', colors: ['#87a96b', '#d8c3a5', '#e8d8c8'] }
];

export const UserOnboardingPage: React.FC = () => {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Media Files & Crop Modal
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80');

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>(user?.banner_url || '');

  const [cropModal, setCropModal] = useState<{
    isOpen: boolean;
    file: File | null;
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      // 3. Save Theme Preference
      await fetch('/api/nook/customizer/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theme: selectedTheme })
      });

      // 4. Submit Profile Info & Complete Onboarding
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
      <div className="nook-panel" style={{ maxWidth: '580px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Sparkles size={36} color="var(--accent-color)" style={{ margin: '0 auto 0.5rem' }} />
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Setup Your Nook</h2>
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Welcome @{user?.username}! Let's personalize your profile & theme.</p>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          {[
            { num: 1, label: 'Photos & Banner' },
            { num: 2, label: 'About & Status' },
            { num: 3, label: 'Choose Nook Theme' }
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
                  <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.8rem', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                    <Upload size={15} />
                    <span>{avatarFile ? avatarFile.name : 'Choose Avatar Image...'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) setCropModal({ isOpen: true, file: f, title: 'Crop Profile Avatar', aspectRatio: 1, target: 'avatar' });
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>
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
                <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}>
                  <Upload size={15} />
                  <span>{bannerFile ? bannerFile.name : 'Choose Banner Image...'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) setCropModal({ isOpen: true, file: f, title: 'Crop Header Banner Image', aspectRatio: 3, target: 'banner' });
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
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

        {/* STEP 3: Theme Selection Picker */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Palette size={20} color="var(--accent-color)" />
              <span>Select Your Nook Theme</span>
            </h3>
            <p style={{ fontSize: '0.83rem', opacity: 0.75, margin: 0 }}>
              Choose a starting aesthetic for your profile. You can fully customize colors, stickers, and layout anytime!
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '0.2rem' }}>
              {ONBOARDING_THEMES.map(t => {
                const isSelected = selectedTheme === t.id;
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
                      <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{t.name}</span>
                      {isSelected && <Check size={16} color="var(--accent-color)" />}
                    </div>
                    <p style={{ fontSize: '0.73rem', opacity: 0.65, margin: '0 0 0.5rem 0', lineHeight: 1.3 }}>{t.desc}</p>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {t.colors.map((c, idx) => (
                        <div key={idx} style={{ width: '16px', height: '16px', borderRadius: '50%', background: c }} />
                      ))}
                    </div>
                  </div>
                );
              })}
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
