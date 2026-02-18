import React, { useState } from 'react';

interface StarRatingProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  max?: number;
}

const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  max = 5,
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  const display = hovered ?? value ?? 0;

  return (
    <div className='flex items-center gap-1'>
      {Array.from({ length: max }, (_, i) => i + 1).map(star => (
        <button
          key={star}
          type='button'
          className={`transition-colors ${
            star <= display ? 'text-accent-yellow' : 'text-text-secondary/30'
          }`}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(star === value ? undefined : star)}
        >
          <span
            className='material-symbols-outlined text-[24px]'
            style={{
              fontVariationSettings: star <= display ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            star
          </span>
        </button>
      ))}
      {value !== undefined && (
        <button
          type='button'
          className='ml-1 text-text-secondary/50 hover:text-text-secondary text-xs transition-colors'
          onClick={() => onChange(undefined)}
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default StarRating;
