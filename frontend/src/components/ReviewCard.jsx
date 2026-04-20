import { extractPhotoUrls, getVideoEmbedInfo } from '../lib/reviewUtils';

const renderDate = (createdAt) => {
  if (!createdAt) return '';
  try {
    return new Date(createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

const ReviewCard = ({ review, index = 0, compact = false }) => {
  const rating = Math.max(0, Math.min(5, Number(review?.rating || 0)));
  const rounded = Math.round(rating);
  const dateText = renderDate(review?.createdAt);
  const photoUrls = extractPhotoUrls(review);
  const previewPhotos = compact ? photoUrls.slice(0, 2) : photoUrls.slice(0, 3);
  const videoInfo = getVideoEmbedInfo(review?.videoUrl || review?.driveLink || '');
  const canInlineVideo = Boolean(videoInfo && !compact && (videoInfo.type === 'iframe' || videoInfo.type === 'video'));
  const isVerifiedPurchase = Boolean(review?.purchaseVerified || review?.verifiedOrderNumber || review?.isVerifiedPurchase);

  return (
    <article
      className={`fade-in-up rounded-lg bg-gray-50 p-4 ${compact ? 'h-full shadow-soft' : ''}`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{review?.customerName || 'Verified Buyer'}</p>
          {review?.productName ? (
            <p className="mt-0.5 text-xs text-primary">{review.productName}</p>
          ) : null}
          {isVerifiedPurchase ? (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              <i className="fas fa-check-circle" aria-hidden="true" />
              Verified Purchase
            </span>
          ) : null}
        </div>
        <div className="shrink-0 flex items-center gap-1 text-sm" aria-label={`Rating ${rating} out of 5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < rounded ? 'text-amber-400' : 'text-gray-300'}>
              ★
            </span>
          ))}
        </div>
      </div>

      <p className={`text-sm leading-relaxed text-gray-600 ${compact ? 'max-h-[4.5rem] overflow-hidden' : ''}`}>
        {review?.reviewText || 'Great product.'}
      </p>

      {videoInfo ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-black/90">
          {canInlineVideo && videoInfo.type === 'iframe' ? (
            <div className="aspect-video">
              <iframe
                className="h-full w-full"
                src={videoInfo.src}
                title={`Video review by ${review?.customerName || 'customer'}`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : null}

          {canInlineVideo && videoInfo.type === 'video' ? (
            <video
              className="aspect-video w-full"
              controls
              preload="metadata"
              src={videoInfo.src}
            />
          ) : null}

          {!canInlineVideo || videoInfo.type === 'link' ? (
            <a
              href={videoInfo.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 px-3 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              <i className="fas fa-play-circle" aria-hidden="true" />
              Watch Video Review
            </a>
          ) : null}
        </div>
      ) : null}

      {previewPhotos.length ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {previewPhotos.map((photoUrl, photoIndex) => (
            <a
              key={`${photoUrl}-${photoIndex}`}
              href={photoUrl}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-lg border border-gray-200"
            >
              <img
                src={photoUrl}
                alt={`Review media ${photoIndex + 1}`}
                className="h-20 w-full object-cover"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      ) : null}

      {dateText ? <p className="mt-3 text-xs text-gray-400">{dateText}</p> : null}
    </article>
  );
};

export default ReviewCard;
