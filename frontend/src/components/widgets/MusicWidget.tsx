import React, { useState } from 'react';
import { Music, Disc, Play, Pause, Volume2 } from 'lucide-react';

interface MusicWidgetProps {
  bgMusicUrl?: string;
  bgMusicTitle?: string;
  spotifyTrackUrl?: string;
  appleMusicUrl?: string;
}

export const MusicWidget: React.FC<MusicWidgetProps> = ({
  bgMusicUrl,
  bgMusicTitle,
  spotifyTrackUrl,
  appleMusicUrl
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Helper to extract Spotify Track ID
  const getSpotifyEmbedUrl = (url: string) => {
    if (!url) return '';
    const match = url.match(/track\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      return `https://open.spotify.com/embed/track/${match[1]}?utm_source=generator&theme=0`;
    }
    return '';
  };

  const spotifyEmbedUrl = spotifyTrackUrl ? getSpotifyEmbedUrl(spotifyTrackUrl) : '';

  return (
    <div className="nook-panel">
      <div className="nook-panel-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Music size={20} color="var(--accent-color)" />
        <span>Profile Anthem & Music</span>
      </div>

      {/* Mode A: Uploaded Background Anthem Audio Player */}
      {bgMusicUrl && (
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.85rem', borderRadius: '10px', marginBottom: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
              transition: 'all 0.2s ease'
            }}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Disc size={16} className={isPlaying ? 'animate-spin' : ''} color="var(--accent-color)" />
              <span>{bgMusicTitle || 'Nook Theme Anthem'}</span>
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '2px' }}>
              {isPlaying ? 'Now Playing' : 'Click to play song'}
            </div>
          </div>

          <audio
            ref={audioRef}
            src={bgMusicUrl}
            onEnded={() => setIsPlaying(false)}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Mode B: Spotify Embed Player */}
      {spotifyEmbedUrl && (
        <div style={{ marginTop: '0.75rem', borderRadius: '12px', overflow: 'hidden' }}>
          <iframe
            title="Spotify Embed"
            src={spotifyEmbedUrl}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ borderRadius: '12px', border: 'none' }}
          />
        </div>
      )}

      {/* Mode C: Apple Music Embed Player */}
      {appleMusicUrl && (
        <div style={{ marginTop: '0.75rem', borderRadius: '12px', overflow: 'hidden' }}>
          <iframe
            title="Apple Music Embed"
            src={appleMusicUrl.replace('music.apple.com', 'embed.music.apple.com')}
            width="100%"
            height="175"
            frameBorder="0"
            allow="autoplay *; encrypted-media *; fullscreen *"
            sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
            style={{ borderRadius: '12px', border: 'none' }}
          />
        </div>
      )}

      {!bgMusicUrl && !spotifyEmbedUrl && !appleMusicUrl && (
        <p style={{ opacity: 0.6, fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0', margin: 0 }}>
          No background song or music embed configured yet ✨
        </p>
      )}
    </div>
  );
};
