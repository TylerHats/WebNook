import React, { useEffect, useState } from 'react';
import { Disc, ExternalLink } from 'lucide-react';

interface Artist {
  name: string;
  genre: string;
  image: string;
  track: string;
}

export const SpotifyWidget: React.FC = () => {
  const [artists, setArtists] = useState<Artist[]>([]);

  useEffect(() => {
    fetch('/api/integrations/spotify/top-artists')
      .then(res => res.json())
      .then(data => {
        if (data.artists) setArtists(data.artists);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="nook-panel">
      <div className="nook-panel-header">
        <Disc size={20} color="#1db954" />
        <span style={{ color: '#1db954' }}>Spotify Top Artists</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {artists.map((artist, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <img src={artist.image} alt={artist.name} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {artist.name}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{artist.genre}</div>
              <div style={{ fontSize: '0.7rem', color: '#1db954', marginTop: '2px' }}>🎵 {artist.track}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
