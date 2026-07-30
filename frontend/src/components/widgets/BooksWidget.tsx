import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import { StarRatingDisplay } from '../ui/StarRatingDisplay';

export interface BookItem {
  id: string;
  title: string;
  author?: string;
  year?: string;
  coverUrl?: string;
  rating?: number | string;
  status?: 'read' | 'currently_reading' | 'want_to_read' | string;
  inProgress?: boolean;
  onMyList?: boolean;
}

interface BooksWidgetProps {
  title?: string;
  books?: BookItem[];
  storygraphUsername?: string;
}

export const BooksWidget: React.FC<BooksWidgetProps> = ({
  title = 'Books & Reading Nook',
  books,
  storygraphUsername
}) => {
  const bookList = (books || []);

  return (
    <div className="nook-panel">
      <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={20} color="var(--accent-color)" />
          <span>{title}</span>
        </div>
        {storygraphUsername && (
          <a
            href={`https://app.thestorygraph.com/profile/${encodeURIComponent(storygraphUsername)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.75rem',
              color: 'var(--accent-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              textDecoration: 'none',
              background: 'rgba(99, 102, 241, 0.15)',
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              fontWeight: 600
            }}
          >
            <span>StoryGraph Profile</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {bookList.length === 0 ? (
        <p style={{ opacity: 0.6, fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0', margin: 0 }}>
          No favorite books added yet 📖
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 135px)', gap: '1rem', justifyContent: 'start' }}>
          {bookList.map((b, idx) => {
            const bookUrl = (b.title ? `https://openlibrary.org/search?q=${encodeURIComponent(b.title + (b.author ? ' ' + b.author : ''))}` : '#');
            return (
              <a
                key={b.id || idx}
                href={bookUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: '135px',
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
                  src={b.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=80'}
                  alt={b.title}
                  style={{ width: '100%', height: '175px', objectFit: 'cover' }}
                />
                <div style={{ padding: '0.55rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.25, marginBottom: '0.2rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {b.title}
                    </div>
                    {b.author && (
                      <div style={{ fontSize: '0.7rem', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        by {b.author}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '0.4rem' }}>
                    {(b.inProgress || b.status === 'currently_reading') ? (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f472b6', background: 'rgba(244, 114, 182, 0.15)', border: '1px solid rgba(244, 114, 182, 0.3)', padding: '0.15rem 0.45rem', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        Reading... 📖
                      </span>
                    ) : (b.onMyList || b.status === 'want_to_read') ? (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a855f7', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '0.15rem 0.45rem', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        On My List 📌
                      </span>
                    ) : (
                      <StarRatingDisplay rating={b.rating ?? 5} size={12} />
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
