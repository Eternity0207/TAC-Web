import { Helmet } from 'react-helmet-async';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';

const normalizeProduct = (product) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const primaryVariant = variants[0] || {};
  return {
    ...product,
    id: product?.id || product?.slug,
    slug: product?.slug,
    variants,
    price: Number(primaryVariant?.price || product?.price || 0),
    mrp: Number(primaryVariant?.mrp || product?.mrp || primaryVariant?.price || product?.price || 0),
    shortDescription: product?.shortDescription || product?.description || '',
    displayOrder: Number(product?.displayOrder || 999),
    avgRating: Number(product?.avgRating || 0),
    reviewCount: Number(product?.reviewCount || 0),
  };
};

const doesReviewMatchProduct = (reviewProductName, productName) => {
  const r = String(reviewProductName || '').trim().toLowerCase();
  const p = String(productName || '').trim().toLowerCase();
  if (!r || !p) return false;
  if (r === p || r === 'both products') return true;
  return r.includes(p) || p.includes(r);
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');
      try {
        const [productRes, reviewRes] = await Promise.all([
          apiService.products.getPublic(),
          apiService.reviews.getAll(),
        ]);
        const data = Array.isArray(productRes?.data?.data) ? productRes.data.data : [];
        const reviewData = Array.isArray(reviewRes?.data?.data) ? reviewRes.data.data : [];
        setProducts(
          data.map(normalizeProduct).filter(p => p.id && p.name).sort((a, b) => a.displayOrder - b.displayOrder)
        );
        setReviews(reviewData);
      } catch {
        setError('Unable to load products right now. Please try again soon.');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const ratingMap = useMemo(() => {
    const map = new Map();
    products.forEach(product => {
      if (product.reviewCount > 0) {
        map.set(product.id, { avgRating: product.avgRating, reviewCount: product.reviewCount });
        return;
      }
      const matched = reviews.filter(r => doesReviewMatchProduct(r?.productName, product?.name));
      if (!matched.length) { map.set(product.id, { avgRating: 0, reviewCount: 0 }); return; }
      const avg = matched.reduce((s, r) => s + Number(r?.rating || 0), 0) / matched.length;
      map.set(product.id, { avgRating: avg, reviewCount: matched.length });
    });
    return map;
  }, [products, reviews]);

  return (
    <>
      <Helmet>
        <title>Our Products | The Awla Company</title>
        <meta name="description" content="Browse our premium range of natural Amla products including sun-dried powder and delicious candy." />
      </Helmet>

      <div className="section-padding bg-cream">
        <div className="container-custom">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto mb-14"
          >
            <span className="text-accent font-semibold text-xs uppercase tracking-widest">Shop</span>
            <h1 className="heading-primary mt-2 mb-4">Our Products</h1>
            <p className="text-gray-500 text-base leading-relaxed">
              Explore our premium range of natural Amla products — freshly picked and processed within a day.
            </p>
          </motion.div>

          {error && (
            <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-red-600">{error}</div>
          )}

          {/* Product grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : products.map((product, index) => {
                const stats = ratingMap.get(product.id) || { avgRating: 0, reviewCount: 0 };
                return (
                  <ProductCard
                    key={product.id}
                    index={index}
                    product={product}
                    avgRating={stats.avgRating}
                    reviewCount={stats.reviewCount}
                    showDetailLink
                  />
                );
              })
            }
            {!loading && !products.length && !error && (
              <div className="col-span-full rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-500">
                No products available right now.
              </div>
            )}
          </div>

          {/* Free delivery */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-14 text-center"
          >
            <div className="inline-flex items-center gap-2.5 rounded-full bg-accent-50 border border-accent-200 px-5 py-2.5 text-sm font-semibold text-accent-700">
              <i className="fas fa-truck" /> Free Delivery on Orders Above ₹299 &middot; Ships All India
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Products;
