import StarRating from './StarRating';

const GoogleReviewsSummary = ({ businessName, averageRating, totalReviewCount, writeReviewUrl }) => {
  const hasAverageRating = Number.isFinite(Number(averageRating)) && Number(averageRating) > 0;
  const hasReviewCount = Number.isFinite(Number(totalReviewCount)) && Number(totalReviewCount) > 0;

  return (
    <header className="mb-8 flex flex-col gap-5 border-b border-gray-100 pb-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Google Reviews</p>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{businessName}</h2>

        <div className="flex flex-wrap items-center gap-3">
          <StarRating rating={averageRating} size="lg" showValue />
          <span className="text-sm text-gray-600">
            {hasReviewCount
              ? `${Number(totalReviewCount).toLocaleString('en-IN')} total reviews`
              : 'Review count unavailable'}
          </span>
        </div>

        {!hasAverageRating ? <p className="text-sm text-gray-500">Rating information will appear as soon as Google data is available.</p> : null}
      </div>

      <a
        href={writeReviewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-800 hover:shadow-soft-lg"
      >
        Write a Review on Google
      </a>
    </header>
  );
};

export default GoogleReviewsSummary;
