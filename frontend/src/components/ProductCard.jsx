import { Link } from 'react-router-dom';
import DiscountBadge from './DiscountBadge';
import PriceTag from './PriceTag';
import { getDiscountMeta } from './PriceDisplay';
import { ReviewPreview } from './ReviewSection';
import Badge from './Badge';
import SkeletonCard from './SkeletonCard';

const ProductCard = ({
  product,
  avgRating = 0,
  reviewCount = 0,
  index = 0,
  ctaLabel = 'View Product',
  onPrimaryAction,
  showDetailLink = true,
}) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const primaryVariant = variants[0] || {};
  const price = Number(product?.price || primaryVariant?.price || 0);
  const mrp = Number(product?.mrp || primaryVariant?.mrp || price);
  const discount = getDiscountMeta({ mrp, price, variants });
  const isPopular = Boolean(product?.isFeatured || product?.isPopular);

  return (
    <article
      className="group card-lift fade-in-up relative overflow-hidden rounded-2xl border border-gray-100 bg-white hover:scale-105 hover:shadow-xl"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="relative h-72 overflow-hidden bg-gray-100">
        <DiscountBadge text={discount.label} className="absolute left-3 top-3 z-10" />
        {isPopular ? <Badge tone="success" className="absolute right-3 top-3 z-10">Best Seller</Badge> : null}
        {product?.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product?.name || 'Product'}
            loading="lazy"
            className="h-full w-full object-cover transition-all duration-200 ease-in-out group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">No image</div>
        )}
      </div>

      <div className="space-y-4 p-6 md:p-7">
        <div>
          <h3 className="mb-2 text-2xl font-semibold text-gray-900">{product?.name || 'Product'}</h3>
          <p className="line-clamp-2 text-sm text-gray-600">
            {product?.shortDescription || product?.description || 'Natural Awla goodness for daily wellness.'}
          </p>
        </div>

        <ReviewPreview avgRating={avgRating} reviewCount={reviewCount} />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <PriceTag price={price} mrp={mrp} variants={variants} />
          {onPrimaryAction ? (
            <button className="btn-primary" onClick={() => onPrimaryAction(product)}>
              {ctaLabel}
            </button>
          ) : null}
        </div>

        {showDetailLink && product?.slug ? (
          <Link
            to={`/products/${product.slug}`}
            className="inline-flex items-center text-sm font-semibold text-primary transition-colors hover:text-primary-600"
          >
            View details and reviews
            <span className="ml-2">→</span>
          </Link>
        ) : null}
      </div>
    </article>
  );
};

export const ProductCardSkeleton = () => (
  <SkeletonCard rows={4} />
);

export default ProductCard;
