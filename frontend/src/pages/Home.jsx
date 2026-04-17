import { Helmet } from 'react-helmet-async';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { apiService } from '../services/api';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';

/* ── Helpers ── */
const normalizeProduct = (product) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const primaryVariant = variants[0] || {};
  return {
    id: product?.id || product?.slug,
    slug: product?.slug,
    name: product?.name || 'Product',
    price: Number(primaryVariant?.price || 0),
    mrp: Number(primaryVariant?.mrp || primaryVariant?.price || 0),
    variants,
    imageUrl: product?.imageUrl || '',
    description: product?.shortDescription || product?.description || '',
    shortDescription: product?.shortDescription || product?.description || '',
    weight: primaryVariant?.weight || '',
    avgRating: Number(product?.avgRating || 0),
    reviewCount: Number(product?.reviewCount || 0),
    displayOrder: Number(product?.displayOrder || 999),
    isFeatured: product?.isFeatured,
  };
};

/* ── Section wrapper with scroll reveal ── */
const RevealSection = ({ children, className = '', delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.section>
  );
};

/* ── Stagger container ── */
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

/* ── Trust items ── */
const TRUST_ITEMS = [
  { icon: 'fas fa-leaf', label: '100% Natural' },
  { icon: 'fas fa-flask', label: 'No Additives' },
  { icon: 'fas fa-box-open', label: 'Farm to Pack' },
  { icon: 'fas fa-shield-alt', label: 'Ayurvedic Wellness' },
];

/* ── Benefits ── */
const BENEFITS = [
  { icon: 'fas fa-leaf', color: 'primary', title: '100% Natural', desc: 'Pure, sun-dried Amla with no preservatives or artificial colors.' },
  { icon: 'fas fa-bolt', color: 'accent', title: 'Same-Day Processing', desc: 'Processed within a day of harvest for maximum freshness and aroma.' },
  { icon: 'fas fa-heart', color: 'primary', title: 'Health Benefits', desc: 'Improves gut health, relieves bloating, and boosts immunity naturally.' },
];

/* ── Main Component ── */
const Home = () => {
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setProductsLoading(true);
      try {
        const [productRes, reviewRes] = await Promise.all([
          apiService.products.getPublic(),
          apiService.reviews.getAll(),
        ]);
        const items = Array.isArray(productRes?.data?.data) ? productRes.data.data : [];
        const reviewData = Array.isArray(reviewRes?.data?.data) ? reviewRes.data.data : [];
        setProducts(
          items.map(normalizeProduct).filter(p => p.id && p.name).sort((a, b) => a.displayOrder - b.displayOrder)
        );
        setReviews(reviewData);
      } catch {
        setProductsError('Unable to load products right now.');
      } finally {
        setProductsLoading(false);
        setReviewsLoading(false);
      }
    };
    fetchData();
  }, []);

  const featuredProducts = useMemo(() => products.slice(0, 4), [products]);

  const highlightedReviews = useMemo(() => {
    return reviews
      .filter(r => Number(r?.rating || 0) >= 4)
      .sort((a, b) => Number(b?.rating || 0) - Number(a?.rating || 0))
      .slice(0, 6);
  }, [reviews]);

  const heroImage = products[0]?.imageUrl || '';

  return (
    <>
      <Helmet>
        <title>Natural Amla Powder & Candy Jaipur | The Awla Company - 100% Pure Indian Gooseberry</title>
        <meta name="description" content="The Awla Company – freshly picked Amla processed within a day for maximum freshness & aroma. Premium natural Amla powder & candy. 100% natural, sun-dried, farm-to-pack in Jaipur." />
      </Helmet>

      {/* ═════════════ HERO ═════════════ */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-primary via-primary-700 to-primary-600">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[30rem] w-[30rem] rounded-full bg-white/5 blur-3xl" />

        {heroImage && (
          <div className="absolute inset-0 opacity-[0.07] bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }} />
        )}

        <div className="container-custom relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center py-16 lg:py-24">
            {/* Left content */}
            <motion.div
              initial="hidden" animate="visible" variants={stagger}
              className="text-white space-y-6"
            >
              {/* Badges */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-2.5">
                {['Freshly Picked', 'Same-Day Processed', '100% Natural'].map(label => (
                  <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3.5 py-1.5 text-xs font-medium tracking-wide">
                    <i className="fas fa-check text-accent-300 text-[10px]" />
                    {label}
                  </span>
                ))}
              </motion.div>

              {/* Offer banner */}
              <motion.div variants={fadeUp} className="inline-flex items-center gap-3 rounded-2xl bg-accent/90 backdrop-blur-sm px-5 py-3 shadow-glow-accent">
                <span className="text-xs uppercase tracking-widest font-bold text-white/80">Limited Offer</span>
                <span className="text-lg font-extrabold">15% OFF</span>
                <span className="text-sm font-medium opacity-90">Use FIRST50</span>
              </motion.div>

              <motion.h1 variants={fadeUp} className="font-display text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-[1.12] tracking-tight">
                The Awla Company
                <br />
                <span className="text-accent-300">Royal Way to Stay Healthy</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-base md:text-lg text-white/80 leading-relaxed max-w-lg">
                India's purest Amla products processed <strong className="text-white">within a day</strong> of harvest.
                Boost your gut health, beat bloating, and start healthier mornings.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-3 pt-2">
                <Link to="/products" className="btn-secondary text-base px-8 shadow-glow-accent">
                  Shop Now
                </Link>
                <a href="#products" className="inline-flex items-center justify-center rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-sm px-7 py-3 font-semibold text-white transition-all duration-200 hover:bg-white hover:text-primary active:scale-[0.97]">
                  Explore Products
                </a>
              </motion.div>

              {/* Stats */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-6 pt-4 text-sm text-white/70">
                <span className="flex items-center gap-2"><i className="fas fa-truck text-accent-300" /> Free Delivery Above ₹299</span>
                <span className="flex items-center gap-2"><i className="fas fa-star text-accent-300" /> 4.8+ Rating</span>
                <span className="flex items-center gap-2"><i className="fas fa-map-marker-alt text-accent-300" /> Ships All India</span>
              </motion.div>
            </motion.div>

            {/* Right: Hero image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative hidden lg:block"
            >
              {heroImage ? (
                <div className="relative">
                  <motion.img
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    src={heroImage}
                    alt="Premium Awla Product"
                    className="w-full max-w-md mx-auto rounded-3xl shadow-2xl"
                  />
                  <div className="absolute -bottom-3 -right-3 flex h-24 w-24 flex-col items-center justify-center rounded-2xl bg-white text-primary shadow-soft-lg">
                    <span className="text-2xl font-extrabold leading-none">100%</span>
                    <span className="text-[11px] font-semibold text-gray-500">Natural</span>
                  </div>
                </div>
              ) : (
                <div className="mx-auto h-[400px] max-w-md rounded-3xl bg-white/10" />
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═════════════ TRUST BAR ═════════════ */}
      <RevealSection className="py-8 bg-white border-b border-gray-100">
        <div className="container-custom">
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {TRUST_ITEMS.map(({ icon, label }) => (
              <motion.div key={label} variants={fadeUp}
                className="flex items-center justify-center gap-2.5 rounded-xl bg-primary-50/60 p-3.5 text-center transition-shadow hover:shadow-soft"
              >
                <i className={`${icon} text-primary text-lg`} aria-hidden="true" />
                <span className="text-sm font-semibold text-gray-800">{label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </RevealSection>

      {/* ═════════════ PRODUCTS ═════════════ */}
      <RevealSection className="section-padding bg-cream" id="products">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-accent font-semibold text-xs uppercase tracking-widest">Our Products</span>
            <h2 className="heading-secondary mt-3 mb-4">
              Premium <span className="text-gradient">Awla Products</span>
            </h2>
            <p className="text-gray-500 text-base leading-relaxed">
              Freshly picked and processed within a day — products that improve gut health,
              relieve bloating, and give you healthier mornings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {productsLoading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : featuredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  index={index}
                  product={product}
                  avgRating={product.avgRating}
                  reviewCount={product.reviewCount}
                  showDetailLink
                />
              ))
            }
            {!productsLoading && !featuredProducts.length && (
              <div className="col-span-full rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-500">
                No products available right now.
              </div>
            )}
          </div>

          {productsError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-600">{productsError}</div>
          )}

          {/* Free delivery badge */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2.5 rounded-full bg-accent-50 border border-accent-200 px-5 py-2.5 text-sm font-semibold text-accent-700">
              <i className="fas fa-truck" /> Free Delivery on Orders Above ₹299
            </div>
          </div>

          {products.length > 4 && (
            <div className="mt-8 text-center">
              <Link to="/products" className="btn-outline">
                View All Products
              </Link>
            </div>
          )}
        </div>
      </RevealSection>

      {/* ═════════════ BENEFITS ═════════════ */}
      <RevealSection className="section-padding bg-white">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="heading-secondary mb-4">
              Why Choose <span className="text-gradient">The Awla Company</span>?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {BENEFITS.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                whileHover={{ y: -4 }}
                className="text-center rounded-2xl border border-gray-100 bg-gradient-to-b from-gray-50/50 to-white p-8 shadow-soft transition-shadow hover:shadow-soft-lg"
              >
                <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${b.color === 'accent' ? 'bg-accent-50 text-accent' : 'bg-primary-50 text-primary'}`}>
                  <i className={`${b.icon} text-xl`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{b.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ═════════════ TESTIMONIALS ═════════════ */}
      <RevealSection className="section-padding bg-primary-50/50">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-accent font-semibold text-xs uppercase tracking-widest">Testimonials</span>
            <h2 className="heading-secondary mt-3 mb-4">Loved By Health-Conscious Families</h2>
            <p className="text-gray-500 text-base">Real feedback from verified buyers.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {reviewsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-white p-6 shadow-soft">
                  <div className="h-4 w-28 rounded bg-gray-200 mb-4" />
                  <div className="h-3 w-full rounded bg-gray-200 mb-2" />
                  <div className="h-3 w-5/6 rounded bg-gray-200" />
                </div>
              ))
              : highlightedReviews.map((review, i) => (
                <motion.article
                  key={review.id || i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  whileHover={{ y: -3 }}
                  className="rounded-2xl bg-white p-6 shadow-soft transition-shadow hover:shadow-soft-lg"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary">
                        {(review.customerName || 'V')[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{review.customerName || 'Verified Buyer'}</span>
                    </div>
                    <div className="flex text-amber-400 text-xs gap-0.5">
                      {Array.from({ length: Math.min(5, Math.max(1, Number(review.rating || 0))) }).map((_, j) => (
                        <span key={j}>&#9733;</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{review.reviewText || 'Great quality and taste.'}</p>
                </motion.article>
              ))
            }
            {!reviewsLoading && !highlightedReviews.length && (
              <div className="col-span-full rounded-2xl bg-white p-6 text-center text-gray-500 shadow-soft">No reviews yet.</div>
            )}
          </div>
        </div>
      </RevealSection>

      {/* ═════════════ BULK CTA ═════════════ */}
      <RevealSection className="section-padding bg-gradient-to-br from-primary-50/80 to-accent-50/50">
        <div className="container-custom text-center">
          <span className="text-accent font-semibold text-xs uppercase tracking-widest">B2B & Wholesale</span>
          <h2 className="heading-secondary mt-3 mb-5">
            Looking for <span className="text-gradient">Bulk Orders</span>?
          </h2>
          <p className="text-gray-500 text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            Get special wholesale pricing for retailers, distributors, and businesses. Custom packaging available.
          </p>
          <Link to="/bulk-enquiry" className="btn-primary text-base px-10">
            Send Bulk Enquiry
          </Link>
        </div>
      </RevealSection>
    </>
  );
};

export default Home;
