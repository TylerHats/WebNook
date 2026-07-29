import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Palette, Music, Users, Shield, UserPlus, LogIn, Heart, Home, Star, Smile, Film, BookOpen, MessageSquare, Bug, HardDrive } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [appName, setAppName] = useState('WebNook');

  useEffect(() => {
    fetch('/api/branding/public')
      .then(res => res.json())
      .then(data => {
        if (data.app_name) setAppName(data.app_name);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '90vh', padding: '2rem 1rem', maxWidth: '1050px', margin: '0 auto' }}>
      {/* Hero Welcome Panel - Kitschy & Cozy */}
      <div className="nook-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem', marginBottom: '2.5rem', position: 'relative', overflow: 'hidden', border: '2px dashed var(--accent-color)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid var(--accent-color)', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-color)', marginBottom: '1.25rem' }}>
          <Sparkles size={16} />
          <span>Your Friendly Personal Web Nook ✨</span>
        </div>

        <h1 style={{ fontSize: '2.8rem', fontWeight: 900, lineHeight: 1.2, marginBottom: '1rem' }}>
          Welcome Home to {appName}! 🏡
        </h1>
        <p style={{ fontSize: '1.15rem', opacity: 0.85, maxWidth: '720px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
          A cozy, private online space for you and your favorite people. Decorate your profile, pick cute themes, add stickers, play background music, chat in real-time, and swap notes in guestbooks!
        </p>

        {user ? (
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={`/nook/${user.username}`} className="btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Home size={18} />
              <span>Step Inside My Nook (@{user.username})</span>
            </Link>
            <Link to="/messages" className="btn-secondary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={18} />
              <span>Open Messages</span>
            </Link>
            <Link to="/customize" className="btn-secondary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Palette size={18} />
              <span>Decorate Profile</span>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={18} />
              <span>Create My Nook</span>
            </Link>
            <Link to="/login" className="btn-secondary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <LogIn size={18} />
              <span>Welcome Back (Sign In)</span>
            </Link>
          </div>
        )}
      </div>

      {/* Feature Showcase Grid - Friendly Layperson Copy */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <Star size={22} color="var(--accent-color)" />
        <span>Fun Things You Can Do Here</span>
        <Star size={22} color="var(--accent-color)" />
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
        <div className="nook-panel">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--accent-color)' }}>
            <MessageSquare size={26} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Cozy Direct & Group Messaging</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.5 }}>
            Chat 1-on-1 with accepted friends or create group chats with custom icons! Messages are styled after each person's unique Nook theme.
          </p>
        </div>

        <div className="nook-panel">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#ec4899' }}>
            <Smile size={26} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Emoji Reactions & Message Replies</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.5 }}>
            React with custom emoji pickers, double-tap messages for quick reactions, and reply directly to messages with quote previews!
          </p>
        </div>

        <div className="nook-panel">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#ef4444' }}>
            <Bug size={26} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Direct Bug Reports & Support</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.5 }}>
            Need help or noticed an issue? Send feedback straight to site admins in your private Bug Reports channel for fast support.
          </p>
        </div>

        <div className="nook-panel">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#22c55e' }}>
            <Music size={26} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Continuous Playlist Music Player</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.5 }}>
            Upload custom MP3 audio files or search Spotify to create music playlists with automatic track autoplay, continuous playback, and looping!
          </p>
        </div>

        <div className="nook-panel">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--accent-color)' }}>
            <Palette size={26} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Visual Sticker Studio</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.5 }}>
            Drag, rotate, scale, and layer cute stickers anywhere over your live Nook page preview with our real-time Sticker Studio!
          </p>
        </div>

        <div className="nook-panel">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#f43f5e' }}>
            <Sparkles size={26} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>12 Unique Themes & Sound FX</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.5 }}>
            Pick from 12 unique themes (Cozy Cat Café, Cloud Dream, Pixel Arcade, Windows 9x) with toggleable audio clicks & laser sweep animations!
          </p>
        </div>

        <div className="nook-panel">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#a855f7' }}>
            <Heart size={26} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Top Friends & Guestbook</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.5 }}>
            Showcase your best friends in a special profile grid, write friendly notes in guestbooks, and see who favorited you!
          </p>
        </div>

        <div className="nook-panel">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#eab308' }}>
            <Shield size={26} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Safe, Private & Peace-of-Mind Backups</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.5 }}>
            No ads, no algorithms, hardware Passkey security, plus automated scheduled backups to keep your Nook data completely safe!
          </p>
        </div>
      </div>
    </div>
  );
};
