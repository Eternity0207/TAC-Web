import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
                <div className="rounded-2xl border border-primary-100 bg-primary-50/50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Per Order</p>
                  <p className="mt-2 text-3xl font-bold text-primary">Rs {amountPerOrder}</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Eligible Orders</p>
                  <p className="mt-2 text-3xl font-bold text-amber-900">{totalOrders.toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-2xl border border-green-100 bg-green-50/70 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Estimated Contribution</p>
                  <p className="mt-2 text-3xl font-bold text-green-900">Rs {totalContribution.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {(lastDonationDate || lastDonationNote || lastDonationAmount > 0) && (
                <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-soft">
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
                </div>
              )}

              {recentOrderNumbers.length > 0 ? (
                <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-soft">
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
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </>
  );
};

export default Donation;
