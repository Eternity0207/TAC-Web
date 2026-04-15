import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DonationModal from '../components/DonationModal';
import FloatingDonationBadge from '../components/FloatingDonationBadge';

const DONATION_MODAL_STORAGE_KEY = 'awla-donation-modal-seen';

const MainLayout = ({ children }) => {
  const [showDonationModal, setShowDonationModal] = useState(false);

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
      <main className="flex-grow pt-20">
        {children}
      </main>
      <FloatingDonationBadge onClick={() => setShowDonationModal(true)} />
      <DonationModal isOpen={showDonationModal} onClose={closeDonationModal} />
      <Footer />
    </div>
  );
};

export default MainLayout;
