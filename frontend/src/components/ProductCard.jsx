import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import DiscountBadge from './DiscountBadge';
import PriceTag from './PriceTag';
import { getDiscountMeta } from './PriceDisplay';
import { ReviewPreview } from './ReviewSection';
import Badge from './Badge';
import SkeletonCard from './SkeletonCard';
import { getProductStockInfo } from '../lib/productStockUtils';

const ProductCard = ({
  product,
  avgRating = 0,
  reviewCount = 0,
  index = 0,
  showDetailLink = true,
}) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const selectedVariant = variants[selectedVariantIdx] || {};
  const price = Number(selectedVariant?.price || product?.price || 0);
  const mrp = Number(selectedVariant?.mrp || product?.mrp || price);
  const stockInfo = getProductStockInfo(product, selectedVariant);
  const discount = getDiscountMeta({ mrp, price, variants: [selectedVariant] });
  const isPopular = Boolean(product?.isFeatured || product?.isPopular);
  const { addItem, lastAdded } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const cartKey = `${product?.id || product?.slug}-${selectedVariant?.weight || 'default'}`;
  const isLastAdded = lastAdded === cartKey;

  const handleAddToCart = () => {
    if (!product || stockInfo.isOutOfStock) return;
    addItem(product, selectedVariant);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft transition-shadow duration-300 hover:shadow-soft-lg"
    >
      {/* Image */}
      <div className="relative h-64 overflow-hidden bg-gray-100">
        <DiscountBadge text={discount.label} className="absolute left-3 top-3 z-10" />
        {isPopular && <Badge tone="success" className="absolute right-3 top-3 z-10">Best Seller</Badge>}
        {product?.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product?.name || 'Product'}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {/* Quick-view overlay */}
        {showDetailLink && product?.slug && (
          <Link
            to={`/products/${product.slug}`}
            className="absolute inset-0 z-10 flex items-end justify-center bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          >
            <span className="mb-4 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-gray-900 backdrop-blur-sm shadow-soft">
              View Details
            </span>
          </Link>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <div>
          <h3 className="mb-1 text-xl font-bold text-gray-900 leading-tight">{product?.name || 'Product'}</h3>
          <p className="line-clamp-2 text-sm text-gray-500 leading-relaxed">
            {product?.shortDescription || product?.description || 'Natural Awla goodness for daily wellness.'}
          </p>
        </div>

        <ReviewPreview avgRating={avgRating} reviewCount={reviewCount} />

        {stockInfo.shouldShow ? (
          <p
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              stockInfo.isOutOfStock
                ? 'bg-red-50 text-red-700 ring-1 ring-red-100'
                : 'bg-amber-50 text-amber-800 ring-1 ring-amber-100'
            }`}
          >
            {stockInfo.label}
          </p>
        ) : null}

        {/* Variant Selector */}
        {variants.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {variants.map((v, i) => {
              const variantStock = getProductStockInfo(product, v);
              const variantOut = variantStock.isOutOfStock;
              return (
              <button
                key={v.weight || i}
                onClick={() => setSelectedVariantIdx(i)}
                disabled={variantOut}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  variantOut
                    ? 'cursor-not-allowed border border-red-100 bg-red-50 text-red-500'
                    : i === selectedVariantIdx
                    ? 'bg-primary text-white shadow-sm'
                    : 'border border-gray-200 bg-gray-50 text-gray-600 hover:border-primary hover:text-primary'
                }`}
              >
                {v.weight || `Option ${i + 1}`}
                {variantOut ? ' • Out' : ''}
              </button>
              );
            })}
          </div>
        )}

        {/* Price + Add to Cart */}
        <div className="flex items-end justify-between gap-3 pt-1">
          <PriceTag price={price} mrp={mrp} variants={[selectedVariant]} />
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleAddToCart}
            disabled={stockInfo.isOutOfStock}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
              stockInfo.isOutOfStock
                ? 'cursor-not-allowed bg-gray-300 text-gray-600'
                : justAdded || isLastAdded
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-primary text-white shadow-soft hover:bg-primary-800 hover:shadow-soft-lg'
            }`}
          >
            {stockInfo.isOutOfStock ? (
              'Out of Stock'
            ) : justAdded || isLastAdded ? (
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Added
              </span>
            ) : (
              'Add to Cart'
            )}
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
};

export const ProductCardSkeleton = () => (
  <SkeletonCard rows={4} />
);

export default ProductCard;
