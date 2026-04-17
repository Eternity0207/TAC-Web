import { useCart } from '../context/CartContext';

const FloatingDonationBadge = ({ onClick }) => {
  const { itemCount } = useCart();

  // Move up when mobile cart bar is visible
  const bottomClass = itemCount > 0 ? 'bottom-20 lg:bottom-5' : 'bottom-5';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed right-5 z-40 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-soft-lg ring-1 ring-primary-100 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-soft-xl active:scale-[0.97] ${bottomClass}`}
      aria-label="Open donation information"
    >
      <i className="fas fa-cow text-primary" aria-hidden="true" />
      <span className="hidden sm:inline">Rs 5 goes to animal welfare</span>
      <span className="sm:hidden">Rs 5 for welfare</span>
    </button>
  );
};

export default FloatingDonationBadge;
