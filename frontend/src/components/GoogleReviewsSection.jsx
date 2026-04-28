import { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/api';
import {
  GOOGLE_BUSINESS_NAME,
  GOOGLE_PLACE_ID,
  GOOGLE_WRITE_REVIEW_URL,
} from '../lib/googleReviewConfig';

const MAX_VISIBLE_REVIEWS = 5;

const renderStars = (rating, sizeClass = 'text-sm') => {
  const safeRating = Math.max(0, Math.min(5, Number(rating || 0)));
  const fullStars = Math.round(safeRating);

  return (
    <div className={`flex items-center gap-0.5 ${sizeClass}`} aria-label={`${safeRating} star rating`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={index < fullStars ? 'text-amber-400' : 'text-gray-300'}>
          ★
        </span>
      ))}
    </div>
  );
};

const ReviewSkeleton = () => (
  <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 shadow-soft">
    <div className="mb-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-gray-200" />
      <div className="space-y-1.5">
        <div className="h-3.5 w-28 rounded bg-gray-200" />
        <div className="h-3 w-20 rounded bg-gray-100" />
      </div>
    </div>
    <div className="mb-3 h-3.5 w-24 rounded bg-gray-200" />
    <div className="space-y-2">
      <div className="h-3 w-full rounded bg-gray-100" />
      <div className="h-3 w-11/12 rounded bg-gray-100" />
      <div className="h-3 w-9/12 rounded bg-gray-100" />
    </div>
  </div>
);

const GoogleReviewsSection = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadGoogleReviews = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await apiService.reviews.getGoogle();
        if (cancelled) return;

        const data = response?.data?.data;
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid Google reviews payload');
        }

        setPayload(data);
      } catch (requestError) {
        if (cancelled) return;
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            'Unable to load Google reviews at the moment.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadGoogleReviews();
    return () => {
      cancelled = true;
    };
  }, []);

  const businessName = String(payload?.businessName || GOOGLE_BUSINESS_NAME);
  const averageRating = Number(payload?.rating || 0);
  const totalRatings = Number(payload?.userRatingsTotal || 0);
  const reviewsSort = String(payload?.reviewsSort || 'most_relevant').replace('_', ' ');
  const writeReviewUrl = String(payload?.writeReviewUrl || GOOGLE_WRITE_REVIEW_URL);
  const googleMapsUrl = String(payload?.googleMapsUrl || '');

  const reviews = useMemo(() => {
    const list = Array.isArray(payload?.reviews) ? payload.reviews : [];
    return list.slice(0, MAX_VISIBLE_REVIEWS);
  }, [payload]);

  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-gray-50/60 to-white p-6 shadow-soft md:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Google Reviews</p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">{businessName}</h2>
              <p className="mt-2 text-sm text-gray-600">
                Live from Google Places API. Reviews are shown as-is from Google.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  {renderStars(averageRating, 'text-base')}
                  <span className="text-base font-bold text-gray-900">{averageRating ? averageRating.toFixed(1) : '-'}</span>
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {totalRatings > 0 ? `${totalRatings.toLocaleString('en-IN')} total ratings` : 'No rating count available'}
                </p>
              </div>

              <a
                href={writeReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-800"
              >
                Write a Review
              </a>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="rounded-full bg-gray-100 px-3 py-1">Sorted by {reviewsSort}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1">Showing up to {MAX_VISIBLE_REVIEWS} reviews</span>
            <span className="rounded-full bg-gray-100 px-3 py-1">Place ID: {payload?.placeId || GOOGLE_PLACE_ID}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1">Source: Google Maps</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <ReviewSkeleton key={index} />
              ))}
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
              <a
                href={writeReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
              >
                Write a Review on Google
              </a>
            </div>
          ) : null}

          {!loading && !error && !reviews.length ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center text-sm text-gray-600">
              No Google reviews available right now.
            </div>
          ) : null}

          {!loading && !error && reviews.length ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review, index) => {
                const authorName = String(review?.authorName || 'Google User');
                const authorInitial = authorName.trim().charAt(0).toUpperCase() || 'G';
                const profilePhoto = String(review?.profilePhotoUrl || '');
                const authorUrl = String(review?.authorUrl || '');
                const reviewText = String(review?.text || '');
                const relativeTime = String(review?.relativeTimeDescription || '');
                const numericRating = Number(review?.rating || 0);

                return (
                  <article key={`${authorName}-${review?.time || index}`} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-soft">
                    <div className="mb-3 flex items-center gap-3">
                      {profilePhoto ? (
                        <img
                          src={profilePhoto}
                          alt={`${authorName} profile`}
                          className="h-10 w-10 rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary">
                          {authorInitial}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{authorName}</p>
                        <p className="text-xs text-gray-500">{relativeTime || 'Recently posted'}</p>
                      </div>
                    </div>

                    <div className="mb-3 flex items-center justify-between gap-2">
                      {renderStars(numericRating)}
                      {authorUrl ? (
                        <a
                          href={authorUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Author profile
                        </a>
                      ) : null}
                    </div>

                    <p className="text-sm leading-relaxed text-gray-700">{reviewText || 'Rating-only review'}</p>
                  </article>
                );
              })}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>Attribution: Google Maps</span>
            {googleMapsUrl ? (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                View listing on Google Maps
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default GoogleReviewsSection;
