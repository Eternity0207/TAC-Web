import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/api';

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadPost = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiService.blogs.getBySlug(slug);
        const data = response?.data?.data || null;
        if (active) setPost(data);
      } catch (err) {
        console.error('Blog post fetch error:', err);
        if (!active) return;
        if (err?.response?.status === 404) {
          setPost(null);
          setError('');
          return;
        }
        setError('Unable to load this post. Please try again later.');
      } finally {
        if (active) setLoading(false);
      }
    };

    if (slug) {
      loadPost();
    }

    return () => {
      active = false;
    };
  }, [slug]);

  const formattedDate = useMemo(() => {
    if (!post?.publishedAt && !post?.createdAt) return '';
    const value = post?.publishedAt || post?.createdAt;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [post]);

  const paragraphs = useMemo(() => {
    const content = String(post?.content || '').trim();
    if (!content) return [];
    return content.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  }, [post]);

  const pageTitle = post?.title ? `${post.title} | The Awla Company` : 'Blog | The Awla Company';
  const description = post?.excerpt || 'Read the latest wellness insights from The Awla Company.';

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
      </Helmet>

      <section className="section-padding bg-gradient-to-b from-primary-50 via-white to-cream-100">
        <div className="container-custom max-w-5xl">
          <Link to="/blog" className="text-sm font-semibold text-primary hover:text-primary-700">
            Back to Blog
          </Link>

          {loading && (
            <div className="mt-8 rounded-3xl bg-white border border-gray-100 p-10 shadow-soft">
              <div className="skeleton-shimmer h-52 rounded-2xl bg-gray-100"></div>
              <div className="mt-6 h-6 w-2/3 rounded bg-gray-100 skeleton-shimmer"></div>
              <div className="mt-4 h-4 w-full rounded bg-gray-100 skeleton-shimmer"></div>
              <div className="mt-3 h-4 w-5/6 rounded bg-gray-100 skeleton-shimmer"></div>
            </div>
          )}

          {!loading && error && (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-red-700 text-center">
              {error}
            </div>
          )}

          {!loading && !error && !post && (
            <div className="mt-8 rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-soft">
              <h2 className="font-display text-2xl text-gray-900 mb-3">Post not found</h2>
              <p className="text-gray-600">The blog you are looking for is not available.</p>
            </div>
          )}

          {!loading && !error && post && (
            <article className="mt-8 rounded-3xl bg-white border border-gray-100 shadow-soft-lg overflow-hidden">
              {post.coverImageUrl ? (
                <img
                  src={post.coverImageUrl}
                  alt={post.title}
                  className="h-72 w-full object-cover"
                />
              ) : (
                <div className="h-72 bg-gradient-to-br from-primary-100 via-cream-100 to-accent-100"></div>
              )}

              <div className="p-8 md:p-10">
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                  {formattedDate && <span>{formattedDate}</span>}
                  {post.authorName && <span>By {post.authorName}</span>}
                </div>

                <h1 className="font-display text-3xl md:text-4xl text-gray-900 mb-6">
                  {post.title}
                </h1>

                {post.excerpt && (
                  <p className="text-lg text-gray-600 leading-relaxed mb-8">
                    {post.excerpt}
                  </p>
                )}

                <div className="space-y-6 text-gray-700 leading-relaxed">
                  {paragraphs.length > 0 ? (
                    paragraphs.map((paragraph, index) => (
                      <p key={`para-${index}`}>{paragraph}</p>
                    ))
                  ) : (
                    <p>Content coming soon.</p>
                  )}
                </div>

                {Array.isArray(post.tags) && post.tags.length > 0 && (
                  <div className="mt-8 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
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
            </article>
          )}
        </div>
      </section>
    </>
  );
 };
 
 export default BlogPost;
