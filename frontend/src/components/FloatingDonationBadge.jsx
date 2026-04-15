const FloatingDonationBadge = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-lg ring-1 ring-primary-100 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
      aria-label="Open donation information"
    >
      <i className="fas fa-cow text-primary" aria-hidden="true"></i>
      <span>Rs 5 goes to animal welfare</span>
    </button>
  );
};

export default FloatingDonationBadge;
