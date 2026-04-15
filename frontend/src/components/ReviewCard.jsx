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

const ReviewCard = ({ review, index = 0 }) => {
  const rating = Math.max(0, Math.min(5, Number(review?.rating || 0)));
  const rounded = Math.round(rating);
  const dateText = renderDate(review?.createdAt);

  return (
    <article className="fade-in-up rounded-lg bg-gray-50 p-4" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-semibold text-gray-900">{review?.customerName || 'Verified Buyer'}</p>
        <div className="flex items-center gap-1 text-sm" aria-label={`Rating ${rating} out of 5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < rounded ? 'text-amber-400' : 'text-gray-300'}>
              ★
            </span>
          ))}
        </div>
      </div>
      <p className="text-sm leading-relaxed text-gray-600">{review?.reviewText || 'Great product.'}</p>
      {dateText ? <p className="mt-3 text-xs text-gray-400">{dateText}</p> : null}
    </article>
  );
};

export default ReviewCard;
