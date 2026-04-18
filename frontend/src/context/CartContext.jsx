import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '../services/api';

const CartContext = createContext(null);
const CART_KEY = 'awla-cart';
const CART_ID_KEY = 'awla-cart-id';

const toServerItems = (items) => (Array.isArray(items) ? items.map(item => ({
  productId: item.productId,
  slug: item.slug,
  weight: item.weight,
  quantity: Number(item.quantity || 0),
})) : []);

const toLocalItem = (item) => ({
  key: item?.key || `${item?.productId || item?.slug || 'item'}-${item?.weight || item?.variant || 'default'}`,
  productId: item?.productId || item?.slug,
  slug: item?.slug || '',
  name: item?.name || 'Product',
  imageUrl: item?.imageUrl || '',
  price: Number(item?.unitPrice || item?.price || 0),
  mrp: Number(item?.mrp || item?.unitPrice || item?.price || 0),
  weight: item?.weight || item?.variant || '',
  quantity: Number(item?.quantity || 1),
});

const serializeItems = (items) => JSON.stringify(
  (Array.isArray(items) ? items : [])
    .map(item => ({
      key: item.key,
      quantity: Number(item.quantity || 0),
      price: Number(item.price || item.unitPrice || 0),
      weight: item.weight || '',
    }))
    .sort((a, b) => String(a.key).localeCompare(String(b.key)))
);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [cartId, setCartId] = useState(() => localStorage.getItem(CART_ID_KEY) || '');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (cartId) {
      localStorage.setItem(CART_ID_KEY, cartId);
    }
  }, [cartId]);

  useEffect(() => {
    let cancelled = false;

    const hydrateCart = async () => {
      if (!cartId) return;

      try {
        const response = await apiService.cart.getById(cartId);
        const serverCart = response?.data?.data;
        if (!serverCart || cancelled) return;

        if (Array.isArray(serverCart.items)) {
          const normalized = serverCart.items.map(toLocalItem);
          if (!cancelled && serializeItems(normalized) !== serializeItems(items)) {
            setItems(normalized);
          }
        }
      } catch {
        // Keep local cart as fallback when backend cart is unavailable.
      }
    };

    hydrateCart();

    return () => {
      cancelled = true;
    };
  }, [cartId]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (!Array.isArray(items)) return;

      if (items.length === 0) {
        if (!cartId) {
          setSyncError('');
          return;
        }

        try {
          await apiService.cart.clear(cartId);
          setSyncError('');
        } catch {
          // Ignore clear failures; local cart remains empty.
        }
        return;
      }

      try {
        const payload = {
          cartId: cartId || undefined,
          items: toServerItems(items),
        };

        const response = await apiService.cart.upsert(payload);
        const serverCart = response?.data?.data;
        if (!serverCart || cancelled) return;

        if (serverCart.id && serverCart.id !== cartId) {
          setCartId(serverCart.id);
        }

        if (Array.isArray(serverCart.items)) {
          const normalized = serverCart.items.map(toLocalItem);
          if (!cancelled && serializeItems(normalized) !== serializeItems(items)) {
            setItems(normalized);
          }
        }

        setSyncError('');
      } catch (err) {
        setSyncError(err?.response?.data?.message || 'Cart sync failed');
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [items, cartId]);

  const addItem = useCallback((product, variant, quantity = 1) => {
    const variantKey = variant?.weight || 'default';
    const key = `${product.id || product.slug}-${variantKey}`;

    setItems(prev => {
      const existing = prev.find(item => item.key === key);
      if (existing) {
        return prev.map(item =>
          item.key === key ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, {
        key,
        productId: product.id || product.slug,
        slug: product.slug,
        name: product.name,
        imageUrl: product.imageUrl,
        price: Number(variant?.price || product.price || 0),
        mrp: Number(variant?.mrp || product.mrp || 0),
        weight: variant?.weight || '',
        quantity,
      }];
    });

    setLastAdded(key);
    setTimeout(() => setLastAdded(null), 2000);
    setIsDrawerOpen(true);
  }, []);

  const removeItem = useCallback((key) => {
    setItems(prev => prev.filter(item => item.key !== key));
  }, []);

  const updateQuantity = useCallback((key, quantity) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.key !== key));
      return;
    }
    setItems(prev => prev.map(item => item.key === key ? { ...item, quantity } : item));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    if (cartId) {
      apiService.cart.clear(cartId).catch(() => {});
    }
  }, [cartId]);

  const value = useMemo(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal >= 299 ? 0 : (items.length > 0 ? 40 : 0);

    return {
      items, itemCount, subtotal, shipping,
      addItem, removeItem, updateQuantity, clearCart,
      isDrawerOpen, setIsDrawerOpen, lastAdded,
      cartId, syncError,
    };
  }, [items, isDrawerOpen, lastAdded, addItem, removeItem, updateQuantity, clearCart, cartId, syncError]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
