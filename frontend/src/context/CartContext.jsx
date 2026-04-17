import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const CartContext = createContext(null);
const CART_KEY = 'awla-cart';

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

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

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal >= 299 ? 0 : (items.length > 0 ? 40 : 0);

    return {
      items, itemCount, subtotal, shipping,
      addItem, removeItem, updateQuantity, clearCart,
      isDrawerOpen, setIsDrawerOpen, lastAdded,
    };
  }, [items, isDrawerOpen, lastAdded, addItem, removeItem, updateQuantity, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
