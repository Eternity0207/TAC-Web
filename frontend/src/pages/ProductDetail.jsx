import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/api';
import DiscountBadge from '../components/DiscountBadge';
import PriceDisplay, { getDiscountMeta } from '../components/PriceDisplay';
import ReviewSection from '../components/ReviewSection';

const ProductDetailSkeleton = () => (
  <div className="section-padding">
    <div className="container-custom animate-pulse">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="h-96 rounded-2xl bg-gray-200" />
        <div className="space-y-4">
          <div className="h-8 w-2/3 rounded bg-gray-200" />
          <div className="h-5 w-1/3 rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-48 rounded-2xl bg-gray-100" />
        </div>
      </div>
    </div>
  </div>
);

const ProductDetail = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewsError, setReviewsError] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiService.products.getBySlug(slug);
        const data = response?.data?.data || null;
        if (!data) {
          setError('Product not found');
          return;
        }
        setProduct(data);
      } catch (fetchError) {
        console.error('Failed to fetch product detail:', fetchError);
        setError('Unable to load product details right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  useEffect(() => {
    const fetchReviews = async () => {
      setReviewsLoading(true);
      setReviewsError('');
      try {
        const response = await apiService.reviews.getAll();
        const data = Array.isArray(response?.data?.data) ? response.data.data : [];
        setReviews(data);
      } catch (fetchError) {
        console.error('Failed to fetch reviews:', fetchError);
        setReviewsError('Unable to load reviews.');
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const primaryVariant = variants[0] || {};
  const price = Number(primaryVariant?.price || product?.price || 0);
  const mrp = Number(primaryVariant?.mrp || product?.mrp || price);
  const discount = getDiscountMeta({ mrp, price, variants });

  const reviewStats = useMemo(() => {
    if (product?.avgRating && product?.reviewCount) {
      return {
        avgRating: Number(product.avgRating || 0),
        reviewCount: Number(product.reviewCount || 0),
      };
    }

    const productName = String(product?.name || '').toLowerCase().trim();
    const matched = reviews.filter((review) => {
      const reviewName = String(review?.productName || '').toLowerCase().trim();
      if (!reviewName || !productName) return false;
      return reviewName === productName || reviewName === 'both products' || reviewName.includes(productName) || productName.includes(reviewName);
    });

    if (!matched.length) {
      return { avgRating: 0, reviewCount: 0 };
    }

    const avgRating = matched.reduce((sum, review) => sum + Number(review?.rating || 0), 0) / matched.length;
    return { avgRating, reviewCount: matched.length };
  }, [product, reviews]);

  if (loading) return <ProductDetailSkeleton />;

  if (error || !product) {
    return (
      <section className="section-padding">
        <div className="container-custom">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error || 'Product not found'}
          </div>
          <Link to="/products" className="mt-4 inline-flex text-primary font-semibold hover:text-primary-600">
            ← Back to products
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

      <section className="section-padding bg-white">
        <div className="container-custom">
          <Link to="/products" className="mb-6 inline-flex text-sm font-semibold text-primary hover:text-primary-600">
            ← Back to products
          </Link>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
              <DiscountBadge text={discount.label} className="absolute left-4 top-4 z-10" />
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-96 items-center justify-center text-gray-400">No image available</div>
              )}
            </div>

            <div>
              <h1 className="mb-3 text-3xl font-bold text-gray-900">{product.name}</h1>
              <PriceDisplay price={price} mrp={mrp} variants={variants} className="mb-5" />

              <ReviewSection
                productName={product.name}
                reviews={reviews}
                loading={reviewsLoading}
                error={reviewsError}
                title={`Customer Reviews (${reviewStats.reviewCount})`}
                maxItems={5}
              />

              <div className="mt-6 rounded-2xl bg-primary-50 p-5">
                <h2 className="mb-2 text-lg font-bold text-gray-900">Product Details</h2>
                <p className="text-gray-700 leading-relaxed">
                  {product.description || product.shortDescription || 'Pure and natural Awla goodness for daily wellness.'}
                </p>
                {reviewStats.reviewCount > 0 ? (
                  <p className="mt-3 text-sm font-medium text-primary-700">
                    Average rating: {Number(reviewStats.avgRating || 0).toFixed(1)} / 5 from {reviewStats.reviewCount} reviews.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ProductDetail;
