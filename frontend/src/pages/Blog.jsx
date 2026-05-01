import { Helmet } from 'react-helmet-async';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';

const Blog = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadBlogs = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiService.blogs.getPublic();
        const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
        if (active) setBlogs(rows);
      } catch (err) {
        console.error('Blog fetch error:', err);
        if (active) {
          setError('Unable to load blogs right now. Please try again later.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadBlogs();
    return () => {
      active = false;
    };
  }, []);

  const featured = blogs[0];
  const rest = blogs.slice(1);

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getReadTime = (content) => {
    const words = String(content || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  };

  const skeletonCards = useMemo(
    () => Array.from({ length: 3 }, (_, index) => index),
    []
  );

  return (
    <>
      <Helmet>
        <title>Blog | The Awla Company</title>
        <meta name="description" content="Learn about the health benefits of Amla and natural wellness tips." />
      </Helmet>

      <section className="section-padding bg-gradient-to-b from-primary-50 via-white to-cream-100 relative overflow-hidden">
        <div className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl"></div>
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl"></div>
        <div className="container-custom relative">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-2 text-sm font-semibold text-primary mb-5">
              Awla Journal
            </span>
            <h1 className="heading-primary mb-6">Blog</h1>
            <p className="text-gray-600 text-lg">
              Discover health tips, ingredient science, and the benefits of Amla.
            </p>
          </div>

          {loading && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {skeletonCards.map((card) => (
                <div key={card} className="skeleton-shimmer rounded-2xl bg-white border border-gray-100 p-6 shadow-soft">
                  <div className="h-40 rounded-xl bg-gray-100"></div>
                  <div className="mt-5 h-4 w-24 rounded bg-gray-100"></div>
                  <div className="mt-3 h-5 w-3/4 rounded bg-gray-100"></div>
                  <div className="mt-3 h-4 w-full rounded bg-gray-100"></div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-red-700 text-center">
              {error}
            </div>
          )}

          {!loading && !error && blogs.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-soft">
              <h2 className="font-display text-2xl text-gray-900 mb-3">No posts yet</h2>
              <p className="text-gray-600">We are preparing the first set of articles. Check back soon.</p>
            </div>
          )}
        </div>
      </section>

      {!loading && !error && blogs.length > 0 && (
        <section className="section-padding">
          <div className="container-custom">
            {featured && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                <Link
                  to={`/blog/${featured.slug}`}
                  className="lg:col-span-7 rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-soft-lg group"
                >
                  {featured.coverImageUrl ? (
                    <img
                      src={featured.coverImageUrl}
                      alt={featured.title}
                      className="h-64 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-64 bg-gradient-to-br from-primary-100 via-cream-100 to-accent-100"></div>
                  )}
                </Link>

                <div className="lg:col-span-5 flex flex-col justify-center">
                  <p className="text-sm font-semibold text-primary mb-3">
                    Featured
                  </p>
                  <h2 className="font-display text-3xl text-gray-900 mb-4">
                    <Link to={`/blog/${featured.slug}`} className="hover:text-primary transition-colors">
                      {featured.title}
                    </Link>
                  </h2>
                  <p className="text-gray-600 leading-relaxed mb-5">
                    {featured.excerpt || 'Fresh insights on the power of Amla and natural wellness.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span>{formatDate(featured.publishedAt || featured.createdAt)}</span>
                    <span>{getReadTime(featured.content)} min read</span>
                    {featured.authorName && <span>By {featured.authorName}</span>}
                  </div>
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {rest.map((post) => (
                  <Link
                    key={post.id || post.slug}
                    to={`/blog/${post.slug}`}
                    className="group rounded-2xl bg-white border border-gray-100 shadow-soft card-lift overflow-hidden"
                  >
                    {post.coverImageUrl ? (
                      <img
                        src={post.coverImageUrl}
                        alt={post.title}
                        className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-44 bg-gradient-to-br from-primary-100 via-cream-100 to-accent-100"></div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-3 text-xs font-semibold text-primary mb-3">
                        <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                        <span>{getReadTime(post.content)} min read</span>
                      </div>
                      <h3 className="font-display text-xl text-gray-900 mb-3 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {post.excerpt || 'Read the latest on Amla benefits and healthy routines.'}
                      </p>
                      {Array.isArray(post.tags) && post.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span
                              key={`${post.slug}-${tag}`}
                              className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
};

export default Blog;
