import React from 'react';
import { Clapperboard } from 'lucide-react';
import { StarRatingDisplay } from '../ui/StarRatingDisplay';

export interface MovieItem {
  id: string;
  title: string;
  type?: 'Movie' | 'TV Series' | string;
  year?: string;
  posterUrl?: string;
  overview?: string;
  rating?: number | string;
  inProgress?: boolean;
  onMyList?: boolean;
}

interface MoviesWidgetProps {
  title?: string;
  movies?: MovieItem[];
}

export const MoviesWidget: React.FC<MoviesWidgetProps> = ({
  title = 'Movies & TV Favorites',
  movies
}) => {
  const movieList = (movies || []);

  return (
    <div className="nook-panel">
      <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clapperboard size={20} />
          <span>{title}</span>
        </div>
        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>({movieList.length})</span>
      </div>

      {movieList.length === 0 ? (
        <p style={{ opacity: 0.6, fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0', margin: 0 }}>
          No favorite movies or TV shows added yet 🍿
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: '0.75rem', justifyContent: 'start' }}>
          {movieList.map((m, idx) => {
            const isFullUrl = m.overview && (m.overview.startsWith('http://') || m.overview.startsWith('https://'));
            const movieUrl = isFullUrl ? m.overview! : (m.title ? `https://www.themoviedb.org/search?query=${encodeURIComponent(m.title)}` : '#');
            return (
              <a
                key={m.id || idx}
                href={movieUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: '100%',
                  minWidth: 0,
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform 0.2s ease, border-color 0.2s ease'
                }}
                className="nook-card-hover"
              >
                <img
                  src={m.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&auto=format&fit=crop&q=80'}
                  alt={m.title}
                  style={{ width: '100%', height: '175px', objectFit: 'cover' }}
                />
                <div style={{ padding: '0.55rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.25, marginBottom: '0.2rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {m.title}
                    </div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                      {m.type === 'TV Series' ? '📺 TV' : '🎬 Movie'} {m.year && `• ${m.year}`}
                    </div>
                  </div>

                  <div style={{ marginTop: '0.4rem' }}>
                    {m.inProgress ? (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.15rem 0.45rem', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        Watching... 🍿
                      </span>
                    ) : m.onMyList ? (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a855f7', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '0.15rem 0.45rem', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        On My List 📌
                      </span>
                    ) : (
                      <StarRatingDisplay rating={m.rating ?? 5} size={12} />
                    )}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};
