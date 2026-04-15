const Badge = ({ children, tone = 'default', className = '' }) => {
  const toneClass = tone === 'danger'
    ? 'bg-red-600 text-white'
    : tone === 'success'
      ? 'bg-primary text-white'
      : 'bg-gray-100 text-gray-700';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide shadow-sm ${toneClass} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
