const GoogleReviewSkeleton = () => {
  return (
    <article className="skeleton-shimmer rounded-2xl border border-gray-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-gray-200" />
        <div className="space-y-2">
          <div className="h-3.5 w-28 rounded bg-gray-200" />
          <div className="h-3 w-20 rounded bg-gray-100" />
        </div>
      </div>

      <div className="mb-4 h-4 w-24 rounded bg-gray-100" />

      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-11/12 rounded bg-gray-100" />
        <div className="h-3 w-8/12 rounded bg-gray-100" />
      </div>
    </article>
  );
};

export default GoogleReviewSkeleton;
