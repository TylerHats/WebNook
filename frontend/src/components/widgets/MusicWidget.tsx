import React, { useState, useRef, useEffect } from 'react';
import { Music, Disc, Play, Pause, Volume2 } from 'lucide-react';

export interface MusicTrack {
  id: string;
  title: string;
  artist?: string;
  type: 'audio' | 'spotify' | 'apple';
  url: string;
  autoplay?: boolean;
}

interface MusicWidgetProps {
  title?: string;
  tracks?: MusicTrack[];
  autoNextPlay?: boolean;
  loopPlaylist?: boolean;
  // Legacy fallback props
  bgMusicUrl?: string;
  bgMusicTitle?: string;
  spotifyTrackUrl?: string;
  appleMusicUrl?: string;
}

export const MusicWidget: React.FC<MusicWidgetProps> = ({
  title = 'My Music Playlist',
  tracks = [],
  autoNextPlay = true,
  loopPlaylist = false,
  bgMusicUrl,
  bgMusicTitle,
  spotifyTrackUrl,
  appleMusicUrl
}) => {
  // Construct playlist array from tracks prop or legacy fallback props
  const playlist: MusicTrack[] = [...(tracks || [])];

  if (playlist.length === 0) {
    if (bgMusicUrl) {
      playlist.push({ id: 'legacy_audio', title: bgMusicTitle || 'Background Audio Track', type: 'audio', url: bgMusicUrl });
    }
    if (spotifyTrackUrl) {
      playlist.push({ id: 'legacy_spotify', title: 'Spotify Single Track', type: 'spotify', url: spotifyTrackUrl });
    }
    if (appleMusicUrl) {
      playlist.push({ id: 'legacy_apple', title: 'Apple Music Track', type: 'apple', url: appleMusicUrl });
    }
  }

  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeTrack = playlist[activeTrackIndex];
  const isAllMp3 = playlist.length > 0 && playlist.every(t => t.type === 'audio');

  // Detect touch device vs desktop
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Attempt autoplay on mount if first track is MP3 and has autoplay enabled
  useEffect(() => {
    if (playlist.length === 0) return;
    const firstTrack = playlist[0];
    if (firstTrack.type !== 'audio' || !firstTrack.autoplay) return;

    const timer = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            setAutoplayBlocked(false);
          })
          .catch(err => {
            console.log('Autoplay blocked by browser policy:', err);
            setAutoplayBlocked(true);
          });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Global document click/tap listener to unblock autoplay if blocked
  useEffect(() => {
    if (!autoplayBlocked) return;

    const handleUserInteraction = () => {
      if (audioRef.current && autoplayBlocked) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            setAutoplayBlocked(false);
          })
          .catch(console.error);
      }
    };

    window.addEventListener('click', handleUserInteraction, { once: true });
    window.addEventListener('touchstart', handleUserInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [autoplayBlocked]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch(e => console.log('Playback blocked', e));
    }
  };

  const handleSelectTrack = (index: number) => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setActiveTrackIndex(index);
  };

  // Handle MP3 Track ended logic (Auto Next Play & Loop)
  const handleTrackEnded = () => {
    if (isAllMp3 && autoNextPlay) {
      if (activeTrackIndex < playlist.length - 1) {
        const nextIdx = activeTrackIndex + 1;
        setActiveTrackIndex(nextIdx);
        setIsPlaying(true);
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().catch(console.error);
          }
        }, 100);
      } else if (loopPlaylist && playlist.length > 0) {
        setActiveTrackIndex(0);
        setIsPlaying(true);
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().catch(console.error);
          }
        }, 100);
      } else {
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(false);
    }
  };

  const getSpotifyEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('spotify.com/embed/')) return url;
    const match = url.match(/(track|album|playlist)\/([a-zA-Z0-9]+)/);
    if (match && match[1] && match[2]) {
      return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
    }
    return url;
  };

  const getAppleMusicEmbedUrl = (url: string) => {
    if (!url) return '';
    const embedUrl = url.replace('music.apple.com', 'embed.music.apple.com');
    return embedUrl.includes('?') ? `${embedUrl}&theme=dark` : `${embedUrl}?theme=dark`;
  };

  return (
    <div className="nook-panel" style={{ position: 'relative' }}>
      <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Music size={20} />
          <span>{title} ({playlist.length})</span>
        </div>
      </div>

      {playlist.length === 0 ? (
        <p style={{ opacity: 0.6, fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0', margin: 0 }}>
          No music tracks or streaming links added yet ✨
        </p>
      ) : (
        <div>
          {/* Active Featured Track Player */}
          {activeTrack && (
            <div style={{ marginBottom: '1rem' }}>
              {activeTrack.type === 'audio' && (
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    onClick={togglePlay}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'var(--accent-color)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: isPlaying ? '0 0 12px var(--accent-color)' : 'none',
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
                  </div>

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Disc size={16} className={isPlaying ? 'animate-spin' : ''} color="var(--accent-color)" />
                      <span>{activeTrack.title}</span>
                    </div>
                    {activeTrack.artist && <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{activeTrack.artist}</div>}
                    <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '2px' }}>
                      {isPlaying ? 'Now Playing' : 'Click play button to listen'}
                    </div>
                  </div>

                  <audio
                    ref={audioRef}
                    src={activeTrack.url}
                    onEnded={handleTrackEnded}
                    style={{ display: 'none' }}
                  />
                </div>
              )}

              {(activeTrack.type === 'spotify' || activeTrack.type === 'apple') && (
                <div style={{
                  fontSize: '0.73rem',
                  opacity: 0.85,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  marginBottom: '0.5rem',
                  border: '1px solid var(--border-color)'
                }}>
                  <span>💡</span>
                  <span>Sign in to <strong>{activeTrack.type === 'spotify' ? 'Spotify' : 'Apple Music'}</strong> in your browser to hear full-length tracks!</span>
                </div>
              )}

              {activeTrack.type === 'spotify' && (
                <div style={{ borderRadius: '12px', overflow: 'hidden' }}>
                  <iframe
                    key={activeTrack.url}
                    title="Spotify Track"
                    src={getSpotifyEmbedUrl(activeTrack.url)}
                    width="100%"
                    height="152"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    style={{ borderRadius: '12px', border: 'none' }}
                  />
                </div>
              )}

              {activeTrack.type === 'apple' && (
                <div style={{ borderRadius: '12px', overflow: 'hidden' }}>
                  <iframe
                    title="Apple Music Track"
                    src={getAppleMusicEmbedUrl(activeTrack.url)}
                    width="100%"
                    height="175"
                    frameBorder="0"
                    allow="autoplay *; encrypted-media *; fullscreen *"
                    sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
                    style={{ borderRadius: '12px', border: 'none' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Playlist Track Items List */}
          {playlist.length > 1 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.7, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                All Playlist Tracks:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {playlist.map((tr, idx) => (
                  <div
                    key={tr.id || idx}
                    onClick={() => handleSelectTrack(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: activeTrackIndex === idx ? 'rgba(99, 102, 241, 0.15)' : 'rgba(0,0,0,0.18)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: activeTrackIndex === idx ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 700, width: '20px' }}>#{idx + 1}</span>
                      <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tr.title}</span>
                    </div>

                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.8, background: 'rgba(255,255,255,0.08)', padding: '0.15rem 0.5rem', borderRadius: '10px', fontWeight: 700 }}>
                      {tr.type === 'audio' ? 'MP3' : tr.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Browser Unmute Toast Banner */}
      {autoplayBlocked && (
        <div
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.play().then(() => {
                setIsPlaying(true);
                setAutoplayBlocked(false);
              }).catch(console.error);
            }
          }}
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            padding: '0.75rem 1.5rem',
            borderRadius: '30px',
            background: 'var(--accent-color, #6366f1)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            border: '2px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <Volume2 size={20} />
          <span>🎵 {isTouchDevice ? 'Tap anywhere to start music' : 'Click anywhere to start music'}</span>
        </div>
      )}
    </div>
  );
};
