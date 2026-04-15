import { Helmet } from 'react-helmet-async';
import { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/api';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';
import AnimatedSection from '../components/AnimatedSection';

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
  const reviewName = String(reviewProductName || '').trim().toLowerCase();
  const currentProduct = String(productName || '').trim().toLowerCase();
  if (!reviewName || !currentProduct) return false;
  if (reviewName === currentProduct || reviewName === 'both products') return true;
  return reviewName.includes(currentProduct) || currentProduct.includes(reviewName);
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
        const [productResponse, reviewResponse] = await Promise.all([
          apiService.products.getPublic(),
          apiService.reviews.getAll(),
        ]);

        const data = Array.isArray(productResponse?.data?.data) ? productResponse.data.data : [];
        const reviewData = Array.isArray(reviewResponse?.data?.data) ? reviewResponse.data.data : [];
        const normalized = data
          .map(normalizeProduct)
          .filter((product) => product.id && product.name)
          .sort((a, b) => a.displayOrder - b.displayOrder);

        setProducts(normalized);
        setReviews(reviewData);
      } catch (error) {
        console.error('Failed to load products:', error);
        setError('Unable to load products right now. Please try again soon.');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const ratingMap = useMemo(() => {
    const map = new Map();

    products.forEach((product) => {
      const fromProduct = {
        avgRating: Number(product?.avgRating || 0),
        reviewCount: Number(product?.reviewCount || 0),
      };

      if (fromProduct.reviewCount > 0) {
        map.set(product.id, fromProduct);
        return;
      }

      const matched = reviews.filter((review) => doesReviewMatchProduct(review?.productName, product?.name));
      if (!matched.length) {
        map.set(product.id, { avgRating: 0, reviewCount: 0 });
        return;
      }

      const avgRating = matched.reduce((sum, review) => sum + Number(review?.rating || 0), 0) / matched.length;
      map.set(product.id, { avgRating, reviewCount: matched.length });
    });

    return map;
  }, [products, reviews]);

  return (
    <>
      <Helmet>
        <title>Our Products | The Awla Company</title>
        <meta name="description" content="Browse our premium range of natural Amla products including sun-dried powder and delicious candy." />
      </Helmet>

      <div className="section-padding bg-gray-50">
        <div className="container-custom">
          <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="heading-primary mb-6">Our Products</h1>
            <p className="text-gray-600 text-lg">
              Explore our premium range of natural Amla products
            </p>
          </AnimatedSection>

          {error ? (
            <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-red-600">
              {error}
            </div>
          ) : null}

          <AnimatedSection delay={80} className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-6xl mx-auto">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => <ProductCardSkeleton key={idx} />)
            ) : null}

            {!loading && !products.length && !error ? (
              <div className="col-span-full rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-gray-600">
                No products available right now.
              </div>
            ) : null}

            {!loading
              ? products.map((product, index) => {
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
              : null}
          </AnimatedSection>
        </div>
      </div>
    </>
  );
};

export default Products;
