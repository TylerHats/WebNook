import React from 'react';
import { BookOpen, ExternalLink, Star } from 'lucide-react';

export interface BookItem {
  id: string;
  title: string;
  author?: string;
  year?: string;
  coverUrl?: string;
  rating?: string;
}

interface BooksWidgetProps {
  title?: string;
  books?: BookItem[];
  storygraphUsername?: string;
}

export const BooksWidget: React.FC<BooksWidgetProps> = ({
  title = 'Reading Nook & Favorite Books',
  books = [],
  storygraphUsername
}) => {
  return (
    <div className="nook-panel">
      <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={20} color="var(--accent-color)" />
          <span>{title}</span>
        </div>
        {storygraphUsername && (
          <a
            href={`https://app.thestorygraph.com/profile/${storygraphUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--accent-color)',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid var(--border-color)',
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              textDecoration: 'none'
            }}
          >
            <span>StoryGraph Profile</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {books.length === 0 ? (
        <p style={{ opacity: 0.6, fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0', margin: 0 }}>
          No favorite books added to the reading nook yet 📖
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
          {books.map((b, idx) => (
            <div
              key={b.id || idx}
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
                src={b.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=80'}
                alt={b.title}
                style={{ width: '100%', height: '160px', objectFit: 'cover' }}
              />
              <div style={{ padding: '0.65rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3, marginBottom: '0.2rem' }}>
                    {b.title}
                  </div>
                  {b.author && (
                    <div style={{ fontSize: '0.72rem', opacity: 0.7, fontStyle: 'italic' }}>
                      by {b.author}
                    </div>
                  )}
                </div>

                {b.rating && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Star size={12} fill="var(--accent-color)" />
                    <span>{b.rating}</span>
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
