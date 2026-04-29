import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import { useCart } from '../context/CartContext';
import DiscountBadge from '../components/DiscountBadge';
import PriceDisplay, { getDiscountMeta } from '../components/PriceDisplay';
import ReviewSection from '../components/ReviewSection';
import QuantitySelector from '../components/QuantitySelector';
import ReviewSubmissionForm from '../components/ReviewSubmissionForm';
import { mergeUniqueReviews } from '../lib/reviewUtils';
import { getProductStockInfo } from '../lib/productStockUtils';

const ProductDetailSkeleton = () => (
  <div className="section-padding bg-cream">
    <div className="container-custom animate-pulse">
      <div className="h-4 w-32 rounded bg-gray-200 mb-8" />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="h-[420px] rounded-2xl bg-gray-200" />
        <div className="space-y-5">
          <div className="h-8 w-2/3 rounded bg-gray-200" />
          <div className="h-6 w-1/3 rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-12 w-40 rounded-full bg-gray-200" />
          <div className="h-48 rounded-2xl bg-gray-100" />
        </div>
      </div>
    </div>
  </div>
);

const ProductDetail = () => {
  const { slug } = useParams();
  const { addItem, lastAdded } = useCart();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewsError, setReviewsError] = useState('');

  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsError('');
    try {
      const [reviewRes, videoRes] = await Promise.all([
        apiService.reviews.getAll(),
        apiService.reviews.getVideos().catch(() => ({ data: { data: [] } })),
      ]);

      const writtenReviews = Array.isArray(reviewRes?.data?.data) ? reviewRes.data.data : [];
      const videoReviews = Array.isArray(videoRes?.data?.data) ? videoRes.data.data : [];
      setReviews(mergeUniqueReviews(writtenReviews, videoReviews));
    } catch {
      setReviewsError('Unable to load reviews.');
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiService.products.getBySlug(slug);
        const data = res?.data?.data || null;
        if (!data) { setError('Product not found'); return; }
        setProduct(data);
      } catch {
        setError('Unable to load product details.');
      } finally { setLoading(false); }
    };
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const selectedVariant = variants[selectedVariantIdx] || {};
  const price = Number(selectedVariant?.price || product?.price || 0);
  const mrp = Number(selectedVariant?.mrp || product?.mrp || price);
  const stockInfo = getProductStockInfo(product, selectedVariant);
  const maxSelectableQty =
    stockInfo.quantityLeft !== null && stockInfo.quantityLeft > 0
      ? stockInfo.quantityLeft
      : 10;
  const discount = getDiscountMeta({ mrp, price, variants: [selectedVariant] });

  const cartKey = `${product?.id || product?.slug}-${selectedVariant?.weight || 'default'}`;
  const isLastAdded = lastAdded === cartKey;

  const reviewStats = useMemo(() => {
    if (product?.avgRating && product?.reviewCount) {
      return { avgRating: Number(product.avgRating), reviewCount: Number(product.reviewCount) };
    }
    const name = String(product?.name || '').toLowerCase().trim();
    const matched = reviews.filter(r => {
      const rn = String(r?.productName || '').toLowerCase().trim();
      return rn === name || rn === 'both products' || rn.includes(name) || name.includes(rn);
    });
    if (!matched.length) return { avgRating: 0, reviewCount: 0 };
    const avg = matched.reduce((s, r) => s + Number(r?.rating || 0), 0) / matched.length;
    return { avgRating: avg, reviewCount: matched.length };
  }, [product, reviews]);

  const handleAddToCart = () => {
    if (!product || stockInfo.isOutOfStock) return;
    addItem(product, selectedVariant, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
    setQuantity(1);
  };

  useEffect(() => {
    if (stockInfo.isOutOfStock) return;
    if (stockInfo.quantityLeft !== null && quantity > stockInfo.quantityLeft) {
      setQuantity(stockInfo.quantityLeft);
    }
  }, [quantity, stockInfo.isOutOfStock, stockInfo.quantityLeft]);

  if (loading) return <ProductDetailSkeleton />;

  if (error || !product) {
    return (
      <section className="section-padding bg-cream">
        <div className="container-custom">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error || 'Product not found'}</div>
          <Link to="/products" className="mt-4 inline-flex text-sm font-semibold text-primary hover:text-primary-600">
            &larr; Back to products
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${product.name} | The Awla Company`}</title>
        <meta name="description" content={product.shortDescription || product.description || 'Natural Awla product'} />
      </Helmet>

      <section className="section-padding bg-cream">
        <div className="container-custom">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 flex items-center gap-2 text-sm text-gray-500"
          >
            <Link to="/products" className="font-medium text-primary hover:text-primary-600 transition-colors">Products</Link>
            <span>/</span>
            <span className="text-gray-700">{product.name}</span>
          </motion.div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
            {/* Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft"
            >
              <DiscountBadge text={discount.label} className="absolute left-4 top-4 z-10" />
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover aspect-square"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center text-gray-300">
                  <svg className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </motion.div>

            {/* Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h1 className="mb-3 text-3xl font-bold text-gray-900 leading-tight">{product.name}</h1>

              {/* Rating */}
              {reviewStats.reviewCount > 0 && (
                <div className="mb-4 flex items-center gap-2 text-sm">
                  <div className="flex text-amber-400">
                    {Array.from({ length: Math.round(reviewStats.avgRating) }).map((_, i) => (
                      <span key={i}>&#9733;</span>
                    ))}
                  </div>
                  <span className="font-semibold text-gray-700">{reviewStats.avgRating.toFixed(1)}</span>
                  <span className="text-gray-400">({reviewStats.reviewCount} reviews)</span>
                </div>
              )}

              {/* Price */}
              <PriceDisplay price={price} mrp={mrp} variants={[selectedVariant]} className="mb-5" />

              {stockInfo.shouldShow ? (
                <div
                  className={`mb-5 inline-flex rounded-full px-4 py-1.5 text-sm font-semibold ${
                    stockInfo.isOutOfStock
                      ? 'bg-red-50 text-red-700 ring-1 ring-red-100'
                      : 'bg-amber-50 text-amber-800 ring-1 ring-amber-100'
                  }`}
                >
                  {stockInfo.label}
                </div>
              ) : null}

              {/* Variant selector */}
              {variants.length > 1 && (
                <div className="mb-5">
                  <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Select Size</p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v, i) => {
                      const variantStock = getProductStockInfo(product, v);
                      return (
                        <button
                          key={v.weight || i}
                          onClick={() => { setSelectedVariantIdx(i); setQuantity(1); }}
                          disabled={variantStock.isOutOfStock}
                          className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
                            variantStock.isOutOfStock
                              ? 'cursor-not-allowed border border-red-100 bg-red-50 text-red-500'
                              : i === selectedVariantIdx
                              ? 'bg-primary text-white shadow-md shadow-primary/20'
                              : 'border border-gray-200 bg-white text-gray-700 hover:border-primary hover:text-primary'
                          }`}
                        >
                          {v.weight || `Option ${i + 1}`}
                          <span className="ml-1.5 text-xs opacity-70">₹{Number(v.price || 0)}</span>
                          {variantStock.isOutOfStock ? <span className="ml-1.5 text-xs opacity-100">• Out</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity + Add to Cart */}
              <div className="mb-6 flex flex-wrap items-center gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Quantity</p>
                  <QuantitySelector
                    quantity={quantity}
                    onChange={setQuantity}
                    max={maxSelectableQty}
                    disabled={stockInfo.isOutOfStock}
                  />
                </div>

                <div className="flex-1 min-w-[160px]">
                  <p className="mb-2 text-xs text-transparent select-none">.</p>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddToCart}
                    disabled={stockInfo.isOutOfStock}
                    className={`w-full rounded-full py-3 px-6 font-semibold text-white transition-all duration-300 ${
                      stockInfo.isOutOfStock
                        ? 'cursor-not-allowed bg-gray-300 text-gray-600 shadow-none'
                        : justAdded || isLastAdded
                        ? 'bg-green-500 shadow-md'
                        : 'bg-primary shadow-soft hover:bg-primary-800 hover:shadow-soft-lg'
                    }`}
                  >
                    {stockInfo.isOutOfStock ? (
                      <span className="flex items-center justify-center gap-2">Out of Stock</span>
                    ) : justAdded || isLastAdded ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Added to Cart!
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Add to Cart &mdash; ₹{price * quantity}
                      </span>
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Product details */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft mb-6">
                <h2 className="mb-2 text-lg font-bold text-gray-900">Product Details</h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {product.description || product.shortDescription || 'Pure and natural Awla goodness for daily wellness.'}
                </p>
              </div>

              {/* Delivery info */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="flex items-center gap-2.5 rounded-xl bg-primary-50/60 p-3">
                  <i className="fas fa-truck text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Free Delivery</p>
                    <p className="text-[11px] text-gray-500">Orders above ₹299</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl bg-accent-50/60 p-3">
                  <i className="fas fa-shield-alt text-accent" />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">100% Natural</p>
                    <p className="text-[11px] text-gray-500">Zero preservatives</p>
                  </div>
                </div>
              </div>

              {/* Reviews */}
              <ReviewSection
                productName={product.name}
                reviews={reviews}
                loading={reviewsLoading}
                error={reviewsError}
                title={`Customer Reviews (${reviewStats.reviewCount})`}
                maxItems={5}
              />

              <div className="mt-6">
                <ReviewSubmissionForm
                  productName={product.name}
                  onSubmitted={fetchReviews}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ProductDetail;
