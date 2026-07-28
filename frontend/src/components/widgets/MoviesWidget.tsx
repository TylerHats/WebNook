import React from 'react';
import { Film, Tv, Star, Clapperboard } from 'lucide-react';

export interface MovieItem {
  id: string;
  title: string;
  type?: 'Movie' | 'TV Series' | string;
  year?: string;
  posterUrl?: string;
  overview?: string;
  rating?: string;
}

interface MoviesWidgetProps {
  title?: string;
  movies?: MovieItem[];
}

export const MoviesWidget: React.FC<MoviesWidgetProps> = ({
  title = 'Movies & TV Favorites',
  movies = []
}) => {
  return (
    <div className="nook-panel">
      <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clapperboard size={20} color="var(--accent-color)" />
          <span>{title}</span>
        </div>
        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>({movies.length})</span>
      </div>

      {movies.length === 0 ? (
        <p style={{ opacity: 0.6, fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0', margin: 0 }}>
          No favorite movies or TV shows added yet 🍿
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
          {movies.map((m, idx) => (
            <div
              key={m.id || idx}
              style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <img
                src={m.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&auto=format&fit=crop&q=80'}
                alt={m.title}
                style={{ width: '100%', height: '160px', objectFit: 'cover' }}
              />
              <div style={{ padding: '0.65rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3, marginBottom: '0.2rem' }}>
                    {m.title}
                  </div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                    <span>{m.type === 'TV Series' ? '📺 TV' : '🎬 Movie'}</span>
                    {m.year && <span>• {m.year}</span>}
                  </div>
                </div>

                {m.rating && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Star size={12} fill="var(--accent-color)" />
                    <span>{m.rating}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
