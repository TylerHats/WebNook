import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Palette, Music, Users, Shield, ArrowRight, UserPlus, LogIn, Heart, ExternalLink } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [appName, setAppName] = useState('WebNook');
  const [logoUrl, setLogoUrl] = useState('/branding/logo.png');
  const [publicUsers, setPublicUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/branding/public')
      .then(res => res.json())
      .then(data => {
        if (data.app_name) setAppName(data.app_name);
        if (data.logo_url) setLogoUrl(data.logo_url);
      })
      .catch(() => {});

    // Fetch featured public nooks
    fetch('/api/nook/profile/admin')
      .then(res => res.json())
      .then(data => {
        if (data.owner) {
          setPublicUsers([data.owner]);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '90vh', padding: '2rem 1rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Hero Header Banner */}
      <div className="nook-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem', marginBottom: '2.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '220px', height: '220px', borderRadius: '50%', background: 'var(--accent-color)', opacity: 0.15, filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '220px', height: '220px', borderRadius: '50%', background: '#a855f7', opacity: 0.15, filter: 'blur(50px)', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid var(--accent-color)', padding: '0.35rem 0.9rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-color)', marginBottom: '1.25rem' }}>
          <Sparkles size={16} />
          <span>Self-Hosted Friend Group Social Refuge</span>
        </div>

        <h1 style={{ fontSize: '2.8rem', fontWeight: 900, lineHeight: 1.15, marginBottom: '1rem', background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Welcome to {appName}
        </h1>
        <p style={{ fontSize: '1.15rem', opacity: 0.8, maxWidth: '720px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
          A cozy, friend-group centric social platform heavily inspired by classic MySpace aesthetics — powered by modern themes, custom CSS, music players, stickers, and total self-hosted privacy.
        </p>

        {user ? (
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={`/nook/${user.username}`} className="btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              <Users size={18} />
              <span>Go to My Nook (@{user.username})</span>
            </Link>
            <Link to="/customize" className="btn-secondary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              <Palette size={18} />
              <span>Customize Profile</span>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              <UserPlus size={18} />
              <span>Create Account</span>
            </Link>
            <Link to="/login" className="btn-secondary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              <LogIn size={18} />
              <span>Sign In</span>
            </Link>
          </div>
        )}
      </div>

      {/* Feature Showcase Grid */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <Sparkles size={22} color="var(--accent-color)" />
        <span>Platform Features</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
        <div className="nook-panel">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--accent-color)' }}>
            <Palette size={26} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Retro & Modern Themes</h3>
          <p style={{ fontSize: '0.88rem', opacity: 0.75, lineHeight: 1.5 }}>
            Customize your Nook with Glassmorphism, Synthwave, Cyberpunk, and retro themes, or write raw custom CSS rules.
          </p>
        </div>

        <div className="nook-panel">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#22c55e' }}>
            <Music size={26} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Background Music & Spotify</h3>
          <p style={{ fontSize: '0.88rem', opacity: 0.75, lineHeight: 1.5 }}>
            Set a background anthem for visitors to play while browsing, and showcase your live Spotify status.
          </p>
        </div>

        <div className="nook-panel">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#a855f7' }}>
            <Users size={26} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Top Friends & Guestbooks</h3>
          <p style={{ fontSize: '0.88rem', opacity: 0.75, lineHeight: 1.5 }}>
            Rank your Top 4/8/12 friends on your front profile, place interactive stickers, and leave guestbook comments.
          </p>
        </div>

        <div className="nook-panel">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#eab308' }}>
            <Shield size={26} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Self-Hosted Privacy</h3>
          <p style={{ fontSize: '0.88rem', opacity: 0.75, lineHeight: 1.5 }}>
            Enjoy zero ad tracking, total data sovereignty, configurable Nook privacy, and 2FA TOTP authentication.
          </p>
        </div>
      </div>

      {/* Featured Community Nooks */}
      {publicUsers.length > 0 && (
        <div className="nook-panel" style={{ textAlign: 'center', padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Explore Community Nooks</h3>
          <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '1.5rem' }}>Check out recent member profiles on this server:</p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {publicUsers.map(u => (
              <Link
                key={u.id}
                to={`/nook/${u.username}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="nook-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1.25rem', width: '240px', background: 'rgba(255,255,255,0.04)' }}>
                  <img
                    src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    alt={u.username}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{u.display_name || u.username}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>@{u.username}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
