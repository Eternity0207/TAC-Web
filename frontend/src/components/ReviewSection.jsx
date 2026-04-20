import { useMemo } from 'react';
import ReviewCard from './ReviewCard';
import SkeletonCard from './SkeletonCard';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const doesReviewMatchProduct = (reviewProductName, productName) => {
  const reviewName = normalizeText(reviewProductName);
  const currentProduct = normalizeText(productName);

  if (!reviewName || !currentProduct) return false;
  if (reviewName === currentProduct || reviewName === 'both products') return true;
  return reviewName.includes(currentProduct) || currentProduct.includes(reviewName);
};

export const ReviewPreview = ({ avgRating = 0, reviewCount = 0 }) => {
  if (!reviewCount) {
    return <p className="text-sm text-gray-500">No reviews yet</p>;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-700">
      <span className="text-amber-400">★</span>
      <span className="font-semibold">{Number(avgRating || 0).toFixed(1)}</span>
      <span className="text-gray-500">({reviewCount})</span>
    </div>
  );
};

export const ReviewSectionSkeleton = ({ rows = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: rows }).map((_, idx) => (
      <SkeletonCard key={idx} className="rounded-lg" rows={2} />
    ))}
  </div>
);

const ReviewSection = ({
  productName,
  reviews = [],
  loading = false,
  error = '',
  title = 'Customer Reviews',
  maxItems,
}) => {
  const productReviews = useMemo(() => {
    const filtered = reviews
      .filter((review) => doesReviewMatchProduct(review?.productName, productName))
      .sort((a, b) => {
        const videoDiff = Number(Boolean(b?.videoUrl || b?.driveLink)) - Number(Boolean(a?.videoUrl || a?.driveLink));
        if (videoDiff) return videoDiff;

        const dateA = new Date(a?.createdAt || 0).getTime();
        const dateB = new Date(b?.createdAt || 0).getTime();
        return dateB - dateA;
      });

    if (typeof maxItems === 'number') return filtered.slice(0, maxItems);
    return filtered;
  }, [reviews, productName, maxItems]);

  const averageRating = useMemo(() => {
    if (!productReviews.length) return 0;
    const total = productReviews.reduce((sum, review) => sum + Number(review?.rating || 0), 0);
    return total / productReviews.length;
  }, [productReviews]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <ReviewPreview avgRating={averageRating} reviewCount={productReviews.length} />
      </div>

      {loading ? <ReviewSectionSkeleton /> : null}

      {!loading && error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">Unable to load reviews right now.</p>
      ) : null}

      {!loading && !error && !productReviews.length ? (
        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">No reviews yet</p>
      ) : null}

      {!loading && !error && productReviews.length ? (
        <div className="space-y-4">
          {productReviews.map((review, index) => (
            <ReviewCard
              key={review.id || `${review.customerName}-${review.createdAt}`}
              review={review}
              index={index}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default ReviewSection;
