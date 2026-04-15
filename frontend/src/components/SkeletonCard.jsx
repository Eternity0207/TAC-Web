const SkeletonCard = ({ className = '', rows = 3 }) => {
  return (
    <div className={`overflow-hidden rounded-2xl border border-primary-100 bg-white ${className}`}>
      <div className="skeleton-shimmer h-72 bg-primary-50" />
      <div className="space-y-3 p-6">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className={`skeleton-shimmer h-4 rounded bg-primary-50 ${idx === rows - 1 ? 'w-1/2' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
};

export default SkeletonCard;
