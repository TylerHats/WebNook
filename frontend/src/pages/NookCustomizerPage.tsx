import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Palette, Sparkles, Image, Music, Eye, Code, Plus, Trash2, Save, Gamepad2, Layers, CheckSquare } from 'lucide-react';
import { Sticker } from '../components/nook/StickerCanvas';
import { PRESET_STICKERS } from '../constants/presetStickers';

export const NookCustomizerPage: React.FC = () => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [theme, setTheme] = useState('glassmorphism');
  const [visibilityNook, setVisibilityNook] = useState('private');
  const [bgColor, setBgColor] = useState('#12131C');
  const [cardBgColor, setCardBgColor] = useState('rgba(255,255,255,0.06)');
  const [accentColor, setAccentColor] = useState('#6366f1');
  const [textColor, setTextColor] = useState('#ffffff');
  const [borderColor, setBorderColor] = useState('rgba(255,255,255,0.1)');

  // Steam & Music integration state
  const [steamId64, setSteamId64] = useState('');
  const [spotifyTrackUrl, setSpotifyTrackUrl] = useState('');
  const [appleMusicUrl, setAppleMusicUrl] = useState('');
  const [bgMusicUrl, setBgMusicUrl] = useState('');
  const [bgMusicTitle, setBgMusicTitle] = useState('');

  // Card Enablement Toggles
  const [cardVisibility, setCardVisibility] = useState<Record<string, boolean>>({
    bio: true,
    music: true,
    friends: true,
    guestbook: true,
    steam: true
  });

  const [customCss, setCustomCss] = useState('');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && token) {
      fetch(`/api/nook/profile/${user.username}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.nookSettings) {
            setTheme(data.nookSettings.theme || 'glassmorphism');
            setVisibilityNook(data.nookSettings.visibility_nook || 'private');
            setBgColor(data.nookSettings.bg_color || '#12131C');
            setAccentColor(data.nookSettings.accent_color || '#6366f1');
            setTextColor(data.nookSettings.text_color || '#ffffff');
            setBgMusicUrl(data.nookSettings.bg_music_url || '');
            setBgMusicTitle(data.nookSettings.bg_music_title || '');
            setSteamId64(data.nookSettings.steam_id64 || '');
            setSpotifyTrackUrl(data.nookSettings.spotify_track_url || '');
            setAppleMusicUrl(data.nookSettings.apple_music_url || '');
            setCustomCss(data.nookSettings.custom_css || '');

            if (data.nookSettings.card_visibility_json) {
              try {
                const parsed = typeof data.nookSettings.card_visibility_json === 'string'
                  ? JSON.parse(data.nookSettings.card_visibility_json)
                  : data.nookSettings.card_visibility_json;
                setCardVisibility(prev => ({ ...prev, ...parsed }));
              } catch (e) {}
            }

            if (data.nookSettings.card_colors_json) {
              try {
                const parsedColors = typeof data.nookSettings.card_colors_json === 'string'
                  ? JSON.parse(data.nookSettings.card_colors_json)
                  : data.nookSettings.card_colors_json;
                if (parsedColors.cardBg) setCardBgColor(parsedColors.cardBg);
                if (parsedColors.border) setBorderColor(parsedColors.border);
              } catch (e) {}
            }
          }
          if (data.stickers) {
            setStickers(data.stickers);
          }
        })
        .catch(err => console.error(err));
    }
  }, [user, token]);

  const handleApplyPalette = (palette: { bg: string; cardBg: string; accent: string; text: string; border: string }) => {
    setBgColor(palette.bg);
    setCardBgColor(palette.cardBg);
    setAccentColor(palette.accent);
    setTextColor(palette.text);
    setBorderColor(palette.border);
    showToast('Theme palette applied!', 'info');
  };

  const handleAddSticker = (url: string) => {
    const newSticker: Sticker = {
      sticker_url: url,
      pos_x: Math.floor(Math.random() * 60) + 20,
      pos_y: Math.floor(Math.random() * 60) + 20,
      scale: 1.0,
      rotation: Math.floor(Math.random() * 30) - 15,
      layer: 'above_cards'
    };
    setStickers([...stickers, newSticker]);
    showToast('Sticker added to canvas!', 'info');
  };

  const handleCustomStickerUpload = async (file: File | null) => {
    if (!file || !token) return;
    const formData = new FormData();
    formData.append('sticker', file);

    try {
      const res = await fetch('/api/nook/upload/sticker', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        handleAddSticker(data.sticker_url);
        showToast('Custom sticker uploaded & converted to lossless WebP!', 'success');
      } else {
        showToast(data.error || 'Failed to upload sticker', 'error');
      }
    } catch (e) {
      showToast('Error uploading sticker file', 'error');
    }
  };

  const handleRemoveSticker = (index: number) => {
    setStickers(stickers.filter((_, i) => i !== index));
  };

  const handleToggleStickerLayer = (index: number) => {
    setStickers(stickers.map((st, i) => {
      if (i === index) {
        const nextLayer = st.layer === 'behind_cards' ? 'above_cards' : 'behind_cards';
        return { ...st, layer: nextLayer };
      }
      return st;
    }));
  };

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);

    try {
      // Save Nook Customization
      const custRes = await fetch('/api/nook/customization', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          theme,
          visibility_nook: visibilityNook,
          bg_color: bgColor,
          text_color: textColor,
          accent_color: accentColor,
          bg_music_url: bgMusicUrl,
          bg_music_title: bgMusicTitle,
          steam_id64: steamId64,
          spotify_track_url: spotifyTrackUrl,
          apple_music_url: appleMusicUrl,
          card_visibility_json: cardVisibility,
          card_colors_json: { cardBg: cardBgColor, border: borderColor },
          custom_css: customCss
        })
      });

      // Save Stickers
      const stickRes = await fetch('/api/nook/stickers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ stickers })
      });

      if (custRes.ok && stickRes.ok) {
        showToast('Nook customized successfully!', 'success');
      } else {
        showToast('Failed to save customization', 'error');
      }
    } catch (e) {
      showToast('Error saving customization', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMusicFileUpload = async (file: File | null) => {
    if (!file || !token) return;
    const formData = new FormData();
    formData.append('music', file);
    try {
      const res = await fetch('/api/nook/upload/music', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setBgMusicUrl(data.bg_music_url);
        showToast('Background audio file uploaded successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to upload audio file', 'error');
      }
    } catch (e) {
      showToast('Error uploading audio file', 'error');
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
        showToast('Profile avatar uploaded successfully!', 'success');
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
        showToast('Banner image uploaded successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to upload banner', 'error');
      }
    } catch (e) {
      showToast('Error uploading banner file', 'error');
    }
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Login Required</h2>
        <p>Please log in to customize your Nook.</p>
      </div>
    );
  }

  return (
    <div className={`theme-${theme}`} style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Palette size={28} />
              <span>Nook Visual Studio & Customizer</span>
            </h1>
            <p style={{ opacity: 0.7 }}>Design your dream page with cute themes, audio, stickers, and custom CSS.</p>
          </div>
          <button onClick={handleSave} className="btn-primary" disabled={isSaving}>
            <Save size={18} />
            <span>{isSaving ? 'Saving...' : 'Save Nook'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Direct Photo Uploads Panel */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Image size={20} />
              <span>Upload Profile Avatar & Banner Images</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Upload Avatar Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleAvatarFileUpload(e.target.files?.[0] || null)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Upload Banner Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleBannerFileUpload(e.target.files?.[0] || null)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* Theme Selector & Color Palette Customizer */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Sparkles size={20} />
              <span>Choose Nook Theme & Color Palettes</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { id: 'glassmorphism', name: 'Modern Glass', desc: 'Frosted glass with dark blurred backdrops', palette: { bg: '#12131C', cardBg: 'rgba(255,255,255,0.06)', accent: '#6366f1', text: '#ffffff', border: 'rgba(255,255,255,0.1)' } },
                { id: 'synthwave', name: 'Synthwave Neon', desc: 'Neon magenta glow with synthwave purples', palette: { bg: '#0d0221', cardBg: '#190b34', accent: '#ff007f', text: '#00f5d4', border: '#ff007f' } },
                { id: 'cyberpunk', name: 'Cyberpunk Y2K', desc: 'High-contrast dark synthwave & neon yellow', palette: { bg: '#050505', cardBg: '#121212', accent: '#facc15', text: '#00ffcc', border: '#facc15' } },
                { id: 'pastel', name: 'Y2K Retro Pastel', desc: 'Warm soft pinks and playful pastel accents', palette: { bg: '#fef2f2', cardBg: '#ffffff', accent: '#ec4899', text: '#1f2937', border: '#f472b6' } },
                { id: 'coffee', name: 'Cozy Coffee', desc: 'Warm amber tones and dark roasts', palette: { bg: '#1c1917', cardBg: '#292524', accent: '#d97706', text: '#f5f5f4', border: '#78350f' } },
                { id: 'velvet', name: 'Midnight Velvet', desc: 'Deep violet, plum and glowing amethysts', palette: { bg: '#09090b', cardBg: '#18181b', accent: '#a855f7', text: '#fafafa', border: '#3f3f46' } }
              ].map(t => (
                <div
                  key={t.id}
                  onClick={() => { setTheme(t.id); handleApplyPalette(t.palette); }}
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    border: theme === t.id ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                    background: theme === t.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, lineHeight: 1.4 }}>{t.desc}</div>
                </div>
              ))}
            </div>

            {/* Custom Theme Color Pickers */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Theme Color Overrides:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Base Background</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ width: '36px', height: '36px', border: 'none', background: 'none', cursor: 'pointer' }} />
                    <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Accent Highlight</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width: '36px', height: '36px', border: 'none', background: 'none', cursor: 'pointer' }} />
                    <input type="text" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Text Main</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ width: '36px', height: '36px', border: 'none', background: 'none', cursor: 'pointer' }} />
                    <input type="text" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Enablement Toggles Section */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <CheckSquare size={20} />
              <span>Nook Card & Widget Enablement Toggles</span>
            </div>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1rem' }}>
              Select which cards and features to display on your public Nook page:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {[
                { key: 'bio', label: 'Bio & About Me Card' },
                { key: 'music', label: 'Profile Anthem & Music Player' },
                { key: 'friends', label: 'Top Friends Grid' },
                { key: 'guestbook', label: 'Guestbook Notes' },
                { key: 'steam', label: 'Steam Gaming Showcase' }
              ].map(c => (
                <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={cardVisibility[c.key] !== false}
                    onChange={e => setCardVisibility({ ...cardVisibility, [c.key]: e.target.checked })}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Nook Privacy Controls */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Eye size={20} />
              <span>Nook Visibility & Privacy</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {[
                { id: 'private', label: '🔒 Private (Default - Friends Only Access)' },
                { id: 'public', label: '🌐 Public (Anyone can view)' }
              ].map(opt => (
                <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.id}
                    checked={visibilityNook === opt.id}
                    onChange={e => setVisibilityNook(e.target.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Steam Setup Section */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Gamepad2 size={20} />
              <span>Steam Account Integration Setup</span>
            </div>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1rem' }}>
              Link your Steam account to display your live avatar, online status, and recently played games!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Steam ID64 (17-Digit Number)</label>
                <input
                  type="text"
                  placeholder="e.g. 76561198000000000"
                  value={steamId64}
                  onChange={e => setSteamId64(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'monospace' }}
                />
              </div>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--accent-color)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                💡 <strong>How to find your Steam ID64:</strong> Visit your Steam Profile page in a browser, or go to <a href="https://steamid.io" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>steamid.io</a> and paste your custom URL handle to get your 17-digit Steam ID64.
              </div>
            </div>
          </div>

          {/* Background Audio & Music Services (Spotify & Apple Music) */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Music size={20} />
              <span>Profile Anthem & Music Services (Spotify / Apple Music)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Spotify Track Link</label>
                  <input
                    type="url"
                    placeholder="https://open.spotify.com/track/..."
                    value={spotifyTrackUrl}
                    onChange={e => setSpotifyTrackUrl(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                  />
                  <span style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '2px', display: 'block' }}>Copy song link from Spotify share menu</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Apple Music Track Link</label>
                  <input
                    type="url"
                    placeholder="https://music.apple.com/..."
                    value={appleMusicUrl}
                    onChange={e => setAppleMusicUrl(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                  />
                  <span style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '2px', display: 'block' }}>Copy track link from Apple Music</span>
                </div>
              </div>

              {/* Upload MP3 Anthem File */}
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.85rem', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Upload Anthem MP3 File (Converted to 44.1kHz stereo MP3)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Song Title (e.g. Synthwave Dreams)"
                    value={bgMusicTitle}
                    onChange={e => setBgMusicTitle(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={e => handleMusicFileUpload(e.target.files?.[0] || null)}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stickers Studio & Badges Layer */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Layers size={20} />
              <span>Stickers Studio & Custom Uploads</span>
            </div>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1rem' }}>
              Add cute stickers to your profile! Choose preset stickers or upload custom transparent image files:
            </p>

            {/* Custom Sticker Upload */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>Upload Custom Sticker Image (PNG / GIF / SVG / WebP)</label>
                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Files are automatically processed to WebP format to save bandwidth.</span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={e => handleCustomStickerUpload(e.target.files?.[0] || null)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            {/* Preset Sticker Pickers */}
            <div style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.7, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Preset Stickers Library:
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {PRESET_STICKERS.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleAddSticker(st.url)}
                  style={{ background: 'rgba(255,255,255,0.08)', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  title={st.name}
                >
                  <span>{st.url}</span>
                </button>
              ))}
            </div>

            {stickers.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Active Canvas Stickers ({stickers.length}):</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {stickers.map((st, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.25)', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{st.sticker_url.startsWith('/') ? '🖼️' : st.sticker_url}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sticker #{idx + 1}</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.6, background: 'rgba(255,255,255,0.1)', padding: '0.15rem 0.5rem', borderRadius: '10px' }}>
                          Layer: {st.layer === 'behind_cards' ? 'Behind Cards' : 'Above Cards'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStickerLayer(idx)}
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          Toggle Layer
                        </button>
                        <Trash2 size={16} style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => handleRemoveSticker(idx)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Custom CSS Editor */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Code size={20} />
              <span>Custom CSS Overrides</span>
            </div>
            <textarea
              rows={5}
              placeholder="/* Inject custom CSS rules for your Nook! */&#10;.nook-panel { border-color: #ff007f; }"
              value={customCss}
              onChange={e => setCustomCss(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                borderRadius: 'var(--border-radius-btn)',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                color: '#22c55e'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
