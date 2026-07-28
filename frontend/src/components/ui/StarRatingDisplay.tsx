import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingDisplayProps {
  rating?: number | string;
  size?: number;
}

export const StarRatingDisplay: React.FC<StarRatingDisplayProps> = ({
  rating = 5,
  size = 14
}) => {
  const numRating = typeof rating === 'number' ? rating : parseFloat(String(rating).replace(/[^\d.]/g, '')) || 5;
  const clamped = Math.max(0, Math.min(5, numRating));

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const diff = clamped - (i - 1);
    if (diff >= 0.75) {
      // Full Star
      stars.push(<Star key={i} size={size} fill="#facc15" color="#facc15" />);
    } else if (diff >= 0.25) {
      // Half Star / Partial Star
      stars.push(
        <div key={i} style={{ position: 'relative', display: 'inline-block', width: `${size}px`, height: `${size}px` }}>
          <Star size={size} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', top: 0, left: 0 }} />
          <div style={{ width: '50%', overflow: 'hidden', position: 'absolute', top: 0, left: 0 }}>
            <Star size={size} fill="#facc15" color="#facc15" />
          </div>
        </div>
      );
    } else {
      // Empty Star
      stars.push(<Star key={i} size={size} color="rgba(255,255,255,0.3)" />);
    }
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }} title={`${clamped.toFixed(1)} / 5 stars`}>
      {stars}
      <span style={{ fontSize: '0.72rem', fontWeight: 700, marginLeft: '4px', color: '#facc15' }}>
        {clamped.toFixed(1)}
      </span>
    </div>
  );
};
