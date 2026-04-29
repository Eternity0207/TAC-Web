import { useMemo, useState } from 'react';
import StarRating from './StarRating';
import { GOOGLE_REVIEW_READ_MORE_THRESHOLD } from '../../lib/googleReviewsUiUtils';

const GoogleReviewCard = ({ review }) => {
  const [expanded, setExpanded] = useState(false);

  const displayText = useMemo(() => {
    const text = String(review?.text || '').trim();
    if (!text) return 'Rating-only review';
    if (expanded || text.length <= GOOGLE_REVIEW_READ_MORE_THRESHOLD) return text;
    return `${text.slice(0, GOOGLE_REVIEW_READ_MORE_THRESHOLD).trimEnd()}...`;
  }, [expanded, review?.text]);

  const canExpand = String(review?.text || '').trim().length > GOOGLE_REVIEW_READ_MORE_THRESHOLD;
  const authorName = String(review?.authorName || 'Google User').trim() || 'Google User';
  const authorInitial = authorName.charAt(0).toUpperCase() || 'G';
  const profilePhotoUrl = String(review?.profilePhotoUrl || '').trim();
  const relativeTime = String(review?.relativeTime || 'Recently posted').trim() || 'Recently posted';
  const hasRating = Number.isFinite(Number(review?.rating));

  return (
    <article className="fade-in-up rounded-2xl border border-gray-200 bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-soft-lg">
      <div className="mb-4 flex items-start gap-3">
        {profilePhotoUrl ? (
          <img
            src={profilePhotoUrl}
            alt={`${authorName} profile`}
            className="h-11 w-11 rounded-full border border-gray-100 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary">
            {authorInitial}
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{authorName}</p>
          <p className="text-xs text-gray-500">{relativeTime}</p>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <StarRating rating={review?.rating} />
        <span className="text-xs font-medium text-gray-500">{hasRating ? `${Number(review?.rating).toFixed(1)}/5` : 'No rating value'}</span>
      </div>

      <p className="text-sm leading-relaxed text-gray-700">{displayText}</p>

      {canExpand ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-3 text-xs font-semibold text-primary transition hover:text-primary-800"
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      ) : null}
    </article>
  );
};

export default GoogleReviewCard;
