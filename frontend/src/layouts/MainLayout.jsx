import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import DonationBanner from '../components/DonationBanner';
import DonationModal from '../components/DonationModal';
import FloatingDonationBadge from '../components/FloatingDonationBadge';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';

const DONATION_MODAL_STORAGE_KEY = 'awla-donation-modal-seen';

const MainLayout = ({ children }) => {
  const [showDonationModal, setShowDonationModal] = useState(false);
  const { itemCount, subtotal, shipping, setIsDrawerOpen } = useCart();

  useEffect(() => {
    const hasSeenModal = localStorage.getItem(DONATION_MODAL_STORAGE_KEY) === 'true';
    if (!hasSeenModal) {
      const timer = window.setTimeout(() => {
        setShowDonationModal(true);
      }, 900);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, []);

  const closeDonationModal = () => {
    localStorage.setItem(DONATION_MODAL_STORAGE_KEY, 'true');
    setShowDonationModal(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <DonationBanner />
      <main className="flex-grow pt-20">
        {children}
      </main>

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Floating mobile cart bar */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur-lg p-3 shadow-soft-xl lg:hidden"
          >
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex w-full items-center justify-between rounded-full bg-primary px-5 py-3.5 font-semibold text-white shadow-lg active:scale-[0.98] transition-transform"
            >
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                View Order ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </span>
              <span>₹{subtotal + shipping}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingDonationBadge onClick={() => setShowDonationModal(true)} />
      <DonationModal isOpen={showDonationModal} onClose={closeDonationModal} />
      <Footer />
    </div>
  );
};

export default MainLayout;
