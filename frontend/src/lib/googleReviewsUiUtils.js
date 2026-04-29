import { GOOGLE_BUSINESS_NAME, GOOGLE_WRITE_REVIEW_URL } from './googleReviewConfig';

export const MAX_VISIBLE_GOOGLE_REVIEWS = 5;
export const GOOGLE_REVIEW_READ_MORE_THRESHOLD = 180;

const FRIENDLY_ERROR_MESSAGE = 'Unable to load reviews right now. Please try again shortly.';
const DEFAULT_BUSINESS_NAME = GOOGLE_BUSINESS_NAME;

const sanitizeText = (value) => String(value || '').trim();

const clampRating = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(5, numeric));
};

const normalizeReviewCount = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) return null;
  return Math.round(numeric);
};

const normalizeWriteReviewUrl = (value) => {
  const candidate = sanitizeText(value) || GOOGLE_WRITE_REVIEW_URL;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return GOOGLE_WRITE_REVIEW_URL;
  }

  return GOOGLE_WRITE_REVIEW_URL;
};

const formatRelativeTime = (unixSeconds) => {
  const numeric = Number(unixSeconds);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';

  const diffMs = Date.now() - numeric * 1000;
  if (diffMs <= 0) return 'Recently posted';

  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const monthMs = 30 * dayMs;
  const yearMs = 365 * dayMs;

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  if (diffMs < dayMs) {
    const hours = Math.floor(diffMs / hourMs);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  if (diffMs < monthMs) {
    const days = Math.floor(diffMs / dayMs);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  if (diffMs < yearMs) {
    const months = Math.floor(diffMs / monthMs);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }

  const years = Math.floor(diffMs / yearMs);
  return `${years} year${years === 1 ? '' : 's'} ago`;
};

const normalizeReview = (review, index) => {
  const authorName = sanitizeText(review?.authorName) || 'Google User';
  const normalizedRating = clampRating(review?.rating);
  const text = sanitizeText(review?.text);
  const relativeTime = sanitizeText(review?.relativeTimeDescription) || formatRelativeTime(review?.time) || 'Recently posted';

  return {
    id: sanitizeText(review?.time) ? `time-${review.time}-${index}` : `google-review-${index}`,
    authorName,
    profilePhotoUrl: sanitizeText(review?.profilePhotoUrl),
    rating: normalizedRating,
    text,
    relativeTime,
  };
};

export const createGoogleReviewsFallbackData = () => ({
  businessName: DEFAULT_BUSINESS_NAME,
  averageRating: null,
  totalReviewCount: null,
  writeReviewUrl: GOOGLE_WRITE_REVIEW_URL,
  reviews: [],
});

export const normalizeGoogleReviewsPayload = (payload) => {
  const base = createGoogleReviewsFallbackData();

  const list = Array.isArray(payload?.reviews) ? payload.reviews : [];
  const reviews = list.slice(0, MAX_VISIBLE_GOOGLE_REVIEWS).map(normalizeReview);

  return {
    businessName: sanitizeText(payload?.businessName) || base.businessName,
    averageRating: clampRating(payload?.rating),
    totalReviewCount: normalizeReviewCount(payload?.userRatingsTotal),
    writeReviewUrl: normalizeWriteReviewUrl(payload?.writeReviewUrl),
    reviews,
  };
};

export const getGoogleReviewsErrorMessage = () => FRIENDLY_ERROR_MESSAGE;
