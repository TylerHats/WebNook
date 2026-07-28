import React from 'react';
import { Music, Star, Disc, ExternalLink } from 'lucide-react';

export interface TopSong {
  rank: number;
  title: string;
  artist: string;
  coverUrl?: string;
  linkUrl?: string;
}

interface TopSongsWidgetProps {
  songs?: TopSong[];
}

export const TopSongsWidget: React.FC<TopSongsWidgetProps> = ({ songs = [] }) => {
  if (!songs || songs.length === 0) {
    return null; // Don't render if no top songs configured
  }

  return (
    <div className="nook-panel">
      <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Star size={20} color="var(--accent-color)" fill="var(--accent-color)" />
          <span>Top 5 Favorite Songs</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {songs.slice(0, 5).map((song, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              background: 'rgba(0,0,0,0.2)',
              padding: '0.6rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-color)', width: '24px', textAlign: 'center' }}>
              #{idx + 1}
            </div>

            <img
              src={song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=80'}
              alt={song.title}
              style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover' }}
            />

            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {song.title}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {song.artist}
              </div>
            </div>

            {song.linkUrl && (
              <a
                href={song.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent-color)', opacity: 0.8 }}
                title="Listen / View Track"
              >
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
