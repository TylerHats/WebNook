import React from 'react';
import { Gamepad2, Heart, Sparkles, Compass, Smile } from 'lucide-react';

export interface HobbyItem {
  id: string;
  name: string;
  category?: string;
  icon?: string;
  description?: string;
}

interface HobbiesWidgetProps {
  title?: string;
  hobbies?: HobbyItem[];
  isOwner?: boolean;
  onEdit?: () => void;
}

const DEFAULT_HOBBIES: HobbyItem[] = [
  { id: '1', name: 'Retro Gaming', category: 'Gaming', icon: '🎮', description: 'Collecting & playing classic 90s console games' },
  { id: '2', name: 'Analog Photography', category: 'Creative', icon: '📷', description: 'Shooting 35mm film & vintage cameras' },
  { id: '3', name: 'Lo-Fi Music Production', category: 'Music', icon: '🎧', description: 'Creating chill beats & synthwave tracks' },
  { id: '4', name: 'Coffee Brewing', category: 'Lifestyle', icon: '☕', description: 'Experimenting with pour-over & espresso' }
];

export const HobbiesWidget: React.FC<HobbiesWidgetProps> = ({
  title = 'Hobbies & Passions',
  hobbies,
  isOwner = false,
  onEdit
}) => {
  // If no hobbies are set, only display defaults in owner customizer preview mode. Hide for visitors if empty.
  const hasUserHobbies = Array.isArray(hobbies) && hobbies.length > 0;
  if (!hasUserHobbies && !isOwner) {
    return null;
  }

  const displayHobbies = hasUserHobbies ? hobbies! : DEFAULT_HOBBIES;

  return (
    <div className="nook-panel widget-card hobbies-widget" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Compass size={18} color="var(--accent-color)" />
          <span>{title}</span>
        </h3>
        {isOwner && onEdit && (
          <button
            onClick={onEdit}
            className="btn-secondary"
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
          >
            Edit
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.65rem' }}>
        {displayHobbies.map((hobby) => (
          <div
            key={hobby.id}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '0.65rem 0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              transition: 'transform 0.2s ease, background 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{hobby.icon || '✨'}</span>
              <span style={{ fontWeight: 700, fontSize: '0.83rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {hobby.name}
              </span>
            </div>
            {hobby.category && (
              <span style={{ fontSize: '0.68rem', color: 'var(--accent-color)', fontWeight: 600, opacity: 0.9 }}>
                {hobby.category}
              </span>
            )}
            {hobby.description && (
              <span style={{ fontSize: '0.72rem', opacity: 0.7, lineHeight: 1.25, marginTop: '0.1rem' }}>
                {hobby.description}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
