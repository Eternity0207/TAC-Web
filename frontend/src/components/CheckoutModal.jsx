import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { apiService } from '../services/api';
import QuantitySelector from './QuantitySelector';

const STEPS = ['Review', 'Shipping', 'Payment'];

const slideVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const CheckoutModal = ({ isOpen, onClose }) => {
  const { items, subtotal, shipping, updateQuantity, removeItem, clearCart } = useCart();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    customerName: '', customerEmail: '', customerPhone: '',
    addressLine1: '', addressLine2: '',
    city: '', state: '', pincode: '', country: 'India',
  });
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderData, setOrderData] = useState(null);

  const discount = Number(appliedCoupon?.discountAmount || 0);
  const total = Math.max(0, subtotal + shipping - discount);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setOrderError('');
  };

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) { setCouponError('Enter a coupon code'); return; }
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await apiService.coupons.validate({ couponCode: code, subtotal });
      if (res?.data?.valid) {
        setAppliedCoupon({
          code,
          discountAmount: Number(res.data.discountAmount || 0),
          discountType: res.data?.coupon?.discountType,
        });
      } else {
        setAppliedCoupon(null);
        setCouponError(res?.data?.message || 'Invalid coupon');
      }
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err?.response?.data?.message || 'Failed to validate');
    } finally { setCouponLoading(false); }
  };

  const handleSubmit = async () => {
    setOrderLoading(true);
    setOrderError('');
    try {
      const payload = {
        name: formData.customerName,
        email: formData.customerEmail,
        phone: formData.customerPhone,
        address: [formData.addressLine1, formData.addressLine2].filter(Boolean).join(', '),
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        country: formData.country,
        products: items.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          totalPrice: item.price * item.quantity,
          weight: item.weight,
        })),
        paymentMode: 'UPI_QR',
        couponCode: appliedCoupon?.code || '',
        discountAmount: discount,
        discountType: appliedCoupon?.discountType || null,
      };
      const response = await apiService.orders.createLanding(payload);
      if (response.data.success) {
        setOrderSuccess(true);
        setOrderData({
          order: {
            orderNumber:
              response?.data?.data?.order?.orderNumber ||
              response?.data?.data?.orderNumber || '',
            totalAmount:
              response?.data?.data?.order?.totalAmount ||
              response?.data?.data?.totalAmount || 0,
          },
          qrCode: response?.data?.data?.qrCode || response?.data?.qrCode || null,
        });
        clearCart();
      }
    } catch (err) {
      setOrderError(err?.response?.data?.message || 'Failed to place order. Please try again.');
    } finally { setOrderLoading(false); }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep(0);
      setOrderSuccess(false);
      setOrderData(null);
      setOrderError('');
      setCouponCode('');
      setCouponError('');
      setAppliedCoupon(null);
    }, 300);
  };

  const canProceedToShipping = items.length > 0;
  const canProceedToPayment =
    formData.customerName && formData.customerEmail &&
    formData.customerPhone && formData.addressLine1 &&
    formData.city && formData.state && formData.pincode;

  if (!isOpen) return null;

  const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                {orderSuccess ? 'Order Confirmed!' : 'Checkout'}
              </h2>
              <button
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Close checkout"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stepper */}
            {!orderSuccess && (
              <div className="flex items-center justify-center gap-1 border-b border-gray-50 px-6 py-3">
                {STEPS.map((label, i) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                      i < step ? 'bg-green-500 text-white' : i === step ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {i < step ? (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : i + 1}
                    </div>
                    <span className={`text-xs font-medium ${i <= step ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
                    {i < STEPS.length - 1 && (
                      <div className={`mx-1 h-px w-6 transition-colors ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <AnimatePresence mode="wait">
                {/* Step 0: Review */}
                {!orderSuccess && step === 0 && (
                  <motion.div key="review" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
                    <div className="mb-5 space-y-3">
                      {items.map(item => (
                        <div key={item.key} className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                          {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded-lg object-cover" />}
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-sm font-semibold text-gray-900">{item.name}</h4>
                            {item.weight && <p className="text-xs text-gray-500">{item.weight}</p>}
                            <div className="mt-1.5 flex items-center justify-between">
                              <QuantitySelector quantity={item.quantity} onChange={(q) => updateQuantity(item.key, q)} size="sm" />
                              <div className="text-right">
                                <p className="text-sm font-bold text-primary">₹{item.price * item.quantity}</p>
                                <button onClick={() => removeItem(item.key)} className="text-[11px] text-red-400 hover:text-red-600">Remove</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    <div className="mb-5 space-y-1 rounded-xl bg-primary-50/60 p-4 text-sm">
                      <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{subtotal}</span></div>
                      <div className="flex justify-between text-gray-600">
                        <span>Shipping</span>
                        <span className={shipping === 0 ? 'font-semibold text-green-600' : ''}>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                      </div>
                      <div className="flex justify-between border-t border-primary-100 pt-2 text-base font-bold text-gray-900">
                        <span>Total</span><span>₹{subtotal + shipping}</span>
                      </div>
                    </div>

                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep(1)} disabled={!canProceedToShipping}
                      className="w-full rounded-full bg-primary py-3.5 font-semibold text-white shadow-md hover:bg-primary-800 disabled:opacity-40 transition-colors">
                      Continue to Shipping
                    </motion.button>
                  </motion.div>
                )}

                {/* Step 1: Shipping */}
                {!orderSuccess && step === 1 && (
                  <motion.div key="shipping" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
                    <div className="mb-5 space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-600 uppercase tracking-wide">Full Name *</label>
                          <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} required className={inputCls} placeholder="Your full name" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-600 uppercase tracking-wide">Email *</label>
                          <input type="email" name="customerEmail" value={formData.customerEmail} onChange={handleChange} required className={inputCls} placeholder="email@example.com" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-600 uppercase tracking-wide">Phone *</label>
                          <input type="tel" name="customerPhone" value={formData.customerPhone} onChange={handleChange} required className={inputCls} placeholder="10-digit mobile" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-600 uppercase tracking-wide">Pincode *</label>
                          <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} required className={inputCls} placeholder="6-digit pincode" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-600 uppercase tracking-wide">Address Line 1 *</label>
                        <input type="text" name="addressLine1" value={formData.addressLine1} onChange={handleChange} required className={inputCls} placeholder="House/flat, street" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-600 uppercase tracking-wide">Address Line 2</label>
                        <input type="text" name="addressLine2" value={formData.addressLine2} onChange={handleChange} className={inputCls} placeholder="Landmark (optional)" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-600 uppercase tracking-wide">City *</label>
                          <input type="text" name="city" value={formData.city} onChange={handleChange} required className={inputCls} />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-600 uppercase tracking-wide">State *</label>
                          <input type="text" name="state" value={formData.state} onChange={handleChange} required className={inputCls} />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => setStep(0)} className="flex-1 rounded-full border border-gray-200 py-3 font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                        Back
                      </button>
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep(2)} disabled={!canProceedToPayment}
                        className="flex-1 rounded-full bg-primary py-3 font-semibold text-white shadow-md hover:bg-primary-800 disabled:opacity-40 transition-colors">
                        Review Order
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Payment & Review */}
                {!orderSuccess && step === 2 && (
                  <motion.div key="payment" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
                    {/* Shipping summary */}
                    <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shipping To</h4>
                        <button onClick={() => setStep(1)} className="text-xs font-semibold text-primary hover:underline">Edit</button>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {formData.customerName} &middot; {formData.customerPhone}<br />
                        {formData.addressLine1}{formData.addressLine2 ? `, ${formData.addressLine2}` : ''}<br />
                        {formData.city}, {formData.state} &ndash; {formData.pincode}
                      </p>
                    </div>

                    {/* Order summary */}
                    <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                      <h4 className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Summary</h4>
                      {items.map(item => (
                        <div key={item.key} className="flex justify-between py-1 text-sm">
                          <span className="text-gray-600">{item.name}{item.weight ? ` (${item.weight})` : ''} &times; {item.quantity}</span>
                          <span className="font-medium text-gray-900">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                      <div className="mt-2 space-y-1 border-t border-gray-200 pt-2 text-sm">
                        <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{subtotal}</span></div>
                        <div className="flex justify-between text-gray-600">
                          <span>Shipping</span>
                          <span className={shipping === 0 ? 'font-semibold text-green-600' : ''}>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-green-600"><span>Discount ({appliedCoupon?.code})</span><span>-₹{discount}</span></div>
                        )}
                        <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold">
                          <span>Total</span><span className="text-primary">₹{total}</span>
                        </div>
                      </div>
                    </div>

                    {/* Coupon */}
                    <div className="mb-5 rounded-xl border border-accent-200 bg-accent-50/60 p-4">
                      <p className="mb-2 text-xs font-semibold text-accent-700 uppercase tracking-wide">Have a coupon?</p>
                      <div className="flex gap-2">
                        <input
                          type="text" value={couponCode}
                          onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                          placeholder="Enter code"
                          className="flex-1 rounded-lg border border-accent-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                        />
                        <button onClick={handleApplyCoupon} disabled={couponLoading}
                          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-accent-600 transition-colors">
                          {couponLoading ? '...' : 'Apply'}
                        </button>
                      </div>
                      {appliedCoupon && <p className="mt-2 text-xs font-medium text-green-700">You saved ₹{discount}!</p>}
                      {couponError && <p className="mt-2 text-xs text-red-600">{couponError}</p>}
                    </div>

                    {orderError && (
                      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{orderError}</div>
                    )}

                    <div className="flex gap-3">
                      <button onClick={() => setStep(1)} className="flex-1 rounded-full border border-gray-200 py-3 font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                        Back
                      </button>
                      <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={orderLoading}
                        className="flex-1 rounded-full bg-primary py-3 font-semibold text-white shadow-md hover:bg-primary-800 disabled:opacity-50 transition-colors">
                        {orderLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Placing Order...
                          </span>
                        ) : `Pay ₹${total}`}
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Success */}
                {orderSuccess && orderData && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="py-4 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                      className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100"
                    >
                      <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <motion.path
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.6, delay: 0.4 }}
                          strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">Order Placed!</h3>
                      <p className="text-gray-500 mb-1">
                        Order <span className="font-semibold text-gray-700">{orderData.order?.orderNumber}</span>
                      </p>
                      <p className="text-xl font-bold text-primary mb-6">₹{orderData.order?.totalAmount}</p>

                      {orderData.qrCode && (
                        <div className="mb-6 inline-block rounded-2xl border-2 border-green-200 bg-white p-5 shadow-sm">
                          <p className="mb-3 text-sm font-semibold text-gray-700">Scan to Pay via UPI</p>
                          <img src={orderData.qrCode} alt="Payment QR" className="mx-auto h-48 w-48" />
                          <p className="mt-2 text-xs text-gray-500">Use any UPI app (GPay, PhonePe, Paytm)</p>
                        </div>
                      )}

                      {!orderData.qrCode && (
                        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
                          <p className="text-sm text-blue-700">Payment instructions have been sent to your email.</p>
                        </div>
                      )}

                      <button onClick={handleClose} className="rounded-full bg-primary px-8 py-3 font-semibold text-white shadow-md hover:bg-primary-800 transition-colors">
                        Continue Shopping
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CheckoutModal;
