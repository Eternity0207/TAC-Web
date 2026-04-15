import { useEffect, useState } from 'react';

const STORAGE_KEY = 'awla-donation-banner-dismissed';

const DonationBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    setVisible(!isDismissed);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="slide-down sticky top-20 z-40 border-b border-primary-100 bg-gradient-to-r from-primary-50 via-lime-50 to-accent-50">
      <div className="container-custom flex items-center justify-between gap-3 py-2 text-sm text-primary-900">
        <p className="font-medium">
          <i className="fas fa-cow mr-2" aria-hidden="true"></i>
          Rs 5 from every order goes towards cow fodder and animal welfare.
        </p>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss donation banner"
          className="rounded-full px-2 py-1 text-primary-700 transition-colors hover:bg-primary-100 hover:text-primary"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default DonationBanner;
