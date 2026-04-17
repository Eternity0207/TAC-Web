import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import QuantitySelector from './QuantitySelector';
import { useState } from 'react';
import CheckoutModal from './CheckoutModal';

const CartDrawer = () => {
  const {
    items, itemCount, subtotal, shipping,
    isDrawerOpen, setIsDrawerOpen,
    removeItem, updateQuantity,
  } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);

  const total = subtotal + shipping;

  return (
    <>
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-gray-900">Your Order</h2>
                  {itemCount > 0 && (
                    <motion.span
                      key={itemCount}
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white"
                    >
                      {itemCount}
                    </motion.span>
                  )}
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Close cart"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
                      <svg className="h-10 w-10 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <p className="text-base font-semibold text-gray-900">Your cart is empty</p>
                    <p className="mt-1 text-sm text-gray-500">Browse our products and add items</p>
                    <button
                      onClick={() => setIsDrawerOpen(false)}
                      className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-800"
                    >
                      Browse Products
                    </button>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.div
                        key={item.key}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 80, transition: { duration: 0.2 } }}
                        className="mb-3 flex gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3"
                      >
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-[72px] w-[72px] flex-shrink-0 rounded-lg object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-semibold text-gray-900">{item.name}</h4>
                          {item.weight && <p className="text-xs text-gray-500">{item.weight}</p>}
                          <p className="mt-0.5 text-sm font-bold text-primary">
                            ₹{item.price * item.quantity}
                            {item.quantity > 1 && (
                              <span className="ml-1 text-xs font-normal text-gray-400">(₹{item.price} ea)</span>
                            )}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <QuantitySelector
                              quantity={item.quantity}
                              onChange={(q) => updateQuantity(item.key, q)}
                              size="sm"
                            />
                            <button
                              onClick={() => removeItem(item.key)}
                              className="text-xs font-medium text-red-400 transition-colors hover:text-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="border-t border-gray-100 bg-white px-6 py-4">
                  <div className="mb-3 space-y-1 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>₹{subtotal}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Shipping</span>
                      <span className={shipping === 0 ? 'font-semibold text-green-600' : ''}>
                        {shipping === 0 ? 'FREE' : `₹${shipping}`}
                      </span>
                    </div>
                    {shipping > 0 && subtotal > 0 && (
                      <p className="text-xs text-accent-600">
                        Add ₹{299 - subtotal} more for free shipping!
                      </p>
                    )}
                    <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                      <span>Total</span>
                      <span>₹{total}</span>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setIsDrawerOpen(false); setShowCheckout(true); }}
                    className="w-full rounded-full bg-primary py-3.5 text-center font-semibold text-white shadow-lg transition-colors hover:bg-primary-800"
                  >
                    Proceed to Checkout
                  </motion.button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <CheckoutModal isOpen={showCheckout} onClose={() => setShowCheckout(false)} />
    </>
  );
};

export default CartDrawer;
