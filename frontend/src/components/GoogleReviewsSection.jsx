import GoogleReviewCard from './google-reviews/GoogleReviewCard';
import GoogleReviewSkeleton from './google-reviews/GoogleReviewSkeleton';
import GoogleReviewsSummary from './google-reviews/GoogleReviewsSummary';
import useGoogleReviews from '../hooks/useGoogleReviews';
import { MAX_VISIBLE_GOOGLE_REVIEWS } from '../lib/googleReviewsUiUtils';

const GoogleReviewsSection = () => {
  const { loading, error, data } = useGoogleReviews();

  return (
    <section className="section-padding bg-gradient-to-b from-white to-cream-50">
      <div className="container-custom">
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-soft-lg md:p-8">
          <GoogleReviewsSummary
            businessName={data.businessName}
            averageRating={data.averageRating}
            totalReviewCount={data.totalReviewCount}
            writeReviewUrl={data.writeReviewUrl}
          />

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <GoogleReviewSkeleton key={index} />
              ))}
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
              <p className="text-sm text-amber-900">{error}</p>
              <a
                href={data.writeReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center justify-center rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                Write a Review on Google
              </a>
            </div>
          ) : null}

          {!loading && !error && data.reviews.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
              <p className="text-sm text-gray-700">No reviews available yet.</p>
            </div>
          ) : null}

          {!loading && !error && data.reviews.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.reviews.slice(0, MAX_VISIBLE_GOOGLE_REVIEWS).map((review) => (
                <GoogleReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default GoogleReviewsSection;
