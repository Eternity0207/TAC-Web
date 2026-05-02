import { Helmet } from 'react-helmet-async';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';

const maskOrderNumber = (value) => {
  const orderNumber = String(value || '').trim();
  if (!orderNumber) return '';
  if (orderNumber.length <= 8) return orderNumber;
  return `${orderNumber.slice(0, 4)}•••${orderNumber.slice(-4)}`;
};

const Donation = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSummary = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await apiService.donation.getSummary();
        if (cancelled) return;
        setSummary(response?.data?.data || null);
      } catch {
        if (cancelled) return;
        setError('Unable to load donation summary right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  const amountPerOrder = Number(summary?.amountPerOrder || 5);
  const totalOrders = Number(summary?.totalEligibleOrders || 0);
  const totalContribution = Number(summary?.estimatedTotalContribution || 0);
  const recentOrderNumbers = Array.isArray(summary?.recentOrderNumbers) ? summary.recentOrderNumbers : [];
  const lastDonationDate = String(summary?.lastDonationDate || '');
  const lastDonationNote = String(summary?.lastDonationNote || '');
  const lastDonationAmount = Number(summary?.lastDonationAmount || 0);
  const lastDonationOrdersCovered = Number(summary?.lastDonationOrdersCovered || 0);
  const photos = Array.isArray(summary?.photos) ? summary.photos : [];
  const sortedPhotos = useMemo(
    () =>
      [...photos].sort(
        (a, b) =>
          new Date(b?.uploadedAt || 0).getTime() - new Date(a?.uploadedAt || 0).getTime()
      ),
    [photos]
  );

  return (
    <>
      <Helmet>
        <title>Donation Impact | The Awla Company</title>
        <meta
          name="description"
          content="See how customer orders support cow fodder and animal welfare through The Awla Company donation initiative."
        />
      </Helmet>

      <section className="section-padding bg-gradient-to-b from-white to-cream">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Donation Impact</p>
            <h1 className="mt-2 text-4xl font-bold text-gray-900 md:text-5xl">Cow Fodder Support from Your Orders</h1>
            <p className="mt-4 text-sm leading-relaxed text-gray-600 md:text-base">
              {summary?.subheadline || `Every successful order contributes Rs ${amountPerOrder} toward cow fodder and animal welfare.`}
            </p>
          </motion.div>

          {loading ? (
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer h-28 rounded-2xl border border-gray-200 bg-white p-4" />
              ))}
            </div>
          ) : null}

          {!loading && error ? (
            <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {!loading && !error ? (
            <>
              <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-2xl border border-primary-100 bg-primary-50/50 p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Per Order</p>
                  <p className="mt-2 text-3xl font-bold text-primary">Rs {amountPerOrder}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Eligible Orders</p>
                  <p className="mt-2 text-3xl font-bold text-amber-900">{totalOrders.toLocaleString('en-IN')}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl border border-green-100 bg-green-50/70 p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Estimated Contribution</p>
                  <p className="mt-2 text-3xl font-bold text-green-900">Rs {totalContribution.toLocaleString('en-IN')}</p>
                </motion.div>
              </div>

              {(lastDonationDate || lastDonationNote || lastDonationAmount > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-soft"
                >
                  <h2 className="text-lg font-semibold text-gray-900">Latest Donation Update</h2>
                  {lastDonationDate ? (
                    <p className="mt-2 text-sm text-gray-700">
                      Donation Date: <span className="font-semibold">{new Date(lastDonationDate).toLocaleDateString('en-IN')}</span>
                    </p>
                  ) : null}
                  {lastDonationAmount > 0 ? (
                    <p className="mt-1 text-sm text-gray-700">
                      Amount Donated: <span className="font-semibold">Rs {lastDonationAmount.toLocaleString('en-IN')}</span>
                    </p>
                  ) : null}
                  {lastDonationOrdersCovered > 0 ? (
                    <p className="mt-1 text-sm text-gray-700">
                      Covered Orders: <span className="font-semibold">{lastDonationOrdersCovered.toLocaleString('en-IN')}</span>
                    </p>
                  ) : null}
                  {lastDonationNote ? <p className="mt-3 text-sm leading-relaxed text-gray-600">{lastDonationNote}</p> : null}
                </motion.div>
              )}

              {/* Donation Photos Grid */}
              {sortedPhotos.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8"
                >
                  <h2 className="mb-4 text-xl font-bold text-gray-900 text-center">Our Donation Journey</h2>
                  <p className="mb-6 text-center text-sm text-gray-500">
                    Here's how your purchases help provide cow fodder and support animal welfare.
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:gap-4">
                    {sortedPhotos.map((photo, index) => (
                      <motion.div
                        key={photo.id || index}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.05 * index, duration: 0.35 }}
                        className="group relative cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white shadow-soft transition-all duration-300 hover:shadow-soft-lg hover:-translate-y-1"
                        onClick={() => setLightboxPhoto(photo)}
                      >
                        <div className="aspect-square overflow-hidden">
                          <img
                            src={photo.url}
                            alt={photo.caption || 'Donation photo'}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        </div>
                        {photo.caption && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-8">
                            <p className="text-xs font-medium text-white leading-snug line-clamp-2">
                              {photo.caption}
                            </p>
                          </div>
                        )}
                        {/* Hover zoom icon */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/20">
                          <span className="scale-0 rounded-full bg-white/90 p-2.5 shadow-lg transition-transform duration-300 group-hover:scale-100">
                            <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : null}

              {/* Lightbox */}
              <AnimatePresence>
                {lightboxPhoto && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={() => setLightboxPhoto(null)}
                  >
                    <motion.div
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.85, opacity: 0 }}
                      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                      className="relative max-w-3xl w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setLightboxPhoto(null)}
                        className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                        aria-label="Close"
                      >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <img
                        src={lightboxPhoto.url}
                        alt={lightboxPhoto.caption || 'Donation photo'}
                        className="w-full rounded-2xl object-contain max-h-[80vh] shadow-2xl"
                      />
                      {lightboxPhoto.caption && (
                        <p className="mt-3 text-center text-sm text-white/90 font-medium">{lightboxPhoto.caption}</p>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {recentOrderNumbers.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-soft"
                >
                  <h2 className="text-lg font-semibold text-gray-900">Recently Counted Orders</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    These orders are included in the donation contribution calculation.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {recentOrderNumbers.map((orderNumber) => (
                      <span
                        key={orderNumber}
                        className="inline-flex justify-center rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700"
                      >
                        {maskOrderNumber(orderNumber)}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </>
  );
};

export default Donation;
