import React, { useState, useRef } from 'react';
import { Music, Play, Pause, Volume2 } from 'lucide-react';

interface MusicPlayerWidgetProps {
  title?: string;
  audioUrl?: string;
}

export const MusicPlayerWidget: React.FC<MusicPlayerWidgetProps> = ({
  title = 'My Nook Anthem',
  audioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.log('Autoplay blocked', e));
      setIsPlaying(true);
    }
  };

  return (
    <div className="nook-panel">
      <div className="nook-panel-header">
        <Music size={20} />
        <span>Nook Audio Player</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <button
          onClick={togglePlay}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'var(--accent-color)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
        </button>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {title}
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
            <Volume2 size={14} />
            <span>{isPlaying ? 'Now Playing...' : 'Click Play to Listen'}</span>
          </div>
        </div>
        <audio ref={audioRef} src={audioUrl} loop />
      </div>
    </div>
  );
};
