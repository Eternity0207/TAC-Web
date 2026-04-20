import { useCart } from '../context/CartContext';

const FloatingDonationBadge = ({ onClick }) => {
  const { itemCount } = useCart();

  // Move up when mobile cart bar is visible
  const bottomClass = itemCount > 0 ? 'bottom-20 lg:bottom-5' : 'bottom-5';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed right-4 z-40 inline-flex max-w-[18rem] items-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-primary shadow-soft-lg ring-1 ring-primary-100 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-soft-xl active:scale-[0.97] ${bottomClass}`}
      aria-label="Open donation information"
    >
      <i className="fas fa-cow text-primary text-base" aria-hidden="true" />
      <span className="text-left leading-tight">
        <span className="block text-[11px] font-bold sm:text-xs">Rs 5/order supports animal welfare</span>
        <span className="block text-[10px] font-medium text-primary-700/90 sm:text-[11px]">Zero preservatives • 100% pure natural fruit</span>
      </span>
    </button>
  );
};

export default FloatingDonationBadge;
