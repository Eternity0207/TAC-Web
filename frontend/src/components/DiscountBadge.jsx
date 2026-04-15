const DiscountBadge = ({ text, className = '' }) => {
  if (!text) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold tracking-wide text-white shadow-md ring-2 ring-white/80 ${className}`}
    >
      {text}
    </span>
  );
};

export default DiscountBadge;
