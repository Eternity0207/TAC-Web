import { useId } from 'react';

const STAR_PATH =
  'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const StarIcon = ({ fill = 0, sizeClass = 'h-4 w-4' }) => {
  const gradientId = useId();
  const safeFill = clamp(Number(fill) || 0, 0, 1);
  const percent = Math.round(safeFill * 100);

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`${sizeClass} flex-none`}
      role="img"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset={`${percent}%`} stopColor="#f59e0b" />
          <stop offset={`${percent}%`} stopColor="#e5e7eb" />
        </linearGradient>
      </defs>
      <path d={STAR_PATH} fill={`url(#${gradientId})`} stroke="#d1d5db" strokeWidth="0.8" />
    </svg>
  );
};

const StarRating = ({ rating = null, size = 'sm', showValue = false, className = '' }) => {
  const safeRating = clamp(Number(rating) || 0, 0, 5);
  const sizeClass = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      aria-label={rating ? `${safeRating.toFixed(1)} out of 5 stars` : 'Rating unavailable'}
    >
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, index) => {
          const fillAmount = clamp(safeRating - index, 0, 1);
          return <StarIcon key={index} fill={fillAmount} sizeClass={sizeClass} />;
        })}
      </div>

      {showValue ? (
        <span className="text-sm font-semibold text-gray-800">
          {rating ? safeRating.toFixed(1) : 'N/A'}
        </span>
      ) : null}
    </div>
  );
};

export default StarRating;
