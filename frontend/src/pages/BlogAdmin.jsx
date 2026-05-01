import { Helmet } from 'react-helmet-async';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/api';

const emptyForm = {
  id: '',
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImageUrl: '',
  tags: '',
  status: 'DRAFT',
};

const BlogAdmin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(localStorage.getItem('token')));
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const formatDate = useCallback((value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const loadBlogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.blogs.getAll();
      const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
      setBlogs(rows);
    } catch (err) {
      console.error('Admin blogs fetch error:', err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      } else {
        setError('Unable to load blogs. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadBlogs();
    }
  }, [isAuthenticated, loadBlogs]);

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
    setAuthError('');
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const response = await apiService.auth.login({
        email: authForm.email.trim(),
        password: authForm.password,
      });
      const token = response?.data?.data?.token;
      if (!token) {
        setAuthError('Login failed. Please check your credentials.');
        return;
      }
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
      setAuthForm({ email: '', password: '' });
    } catch (err) {
      console.error('Login error:', err);
      setAuthError(err?.response?.data?.message || 'Login failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setBlogs([]);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (blog) => {
    setFormData({
      id: blog.id || '',
      title: blog.title || '',
      slug: blog.slug || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      coverImageUrl: blog.coverImageUrl || '',
      tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : '',
      status: blog.status || 'DRAFT',
    });
  };

  const resetForm = () => {
    setFormData(emptyForm);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        excerpt: formData.excerpt.trim(),
        content: formData.content.trim(),
        coverImageUrl: formData.coverImageUrl.trim(),
        tags: formData.tags,
        status: formData.status,
      };

      if (formData.id) {
        await apiService.blogs.update(formData.id, payload);
      } else {
        await apiService.blogs.create(payload);
      }

      resetForm();
      await loadBlogs();
    } catch (err) {
      console.error('Blog save error:', err);
      setError(err?.response?.data?.message || 'Failed to save blog.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (blogId) => {
    const confirmed = window.confirm('Delete this blog post? This cannot be undone.');
    if (!confirmed) return;

    setSaving(true);
    setError('');
    try {
      await apiService.blogs.delete(blogId);
      await loadBlogs();
    } catch (err) {
      console.error('Blog delete error:', err);
      setError(err?.response?.data?.message || 'Failed to delete blog.');
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = useMemo(() => ({
    PUBLISHED: 'bg-green-100 text-green-700',
    DRAFT: 'bg-yellow-100 text-yellow-700',
  }), []);

  return (
    <>
      <Helmet>
        <title>Blog Admin | The Awla Company</title>
        <meta name="description" content="Manage and publish blog posts." />
      </Helmet>

      <section className="section-padding bg-gradient-to-b from-primary-50 via-white to-cream-100">
        <div className="container-custom max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="heading-secondary">Blog Admin</h1>
              <p className="text-gray-600">Create, edit, and publish blog posts.</p>
            </div>
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="btn-outline"
              >
                Log Out
              </button>
            )}
          </div>

          {!isAuthenticated && (
            <div className="max-w-xl bg-white border border-gray-100 rounded-3xl shadow-soft p-8">
              {authError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                  {authError}
                </div>
              )}
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="email">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={authForm.email}
                    onChange={handleAuthChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="password">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    value={authForm.password}
                    onChange={handleAuthChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={authLoading}
                >
                  {authLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </div>
          )}

          {isAuthenticated && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 bg-white border border-gray-100 rounded-3xl shadow-soft p-8">
                <h2 className="font-display text-2xl text-gray-900 mb-6">
                  {formData.id ? 'Edit Blog Post' : 'New Blog Post'}
                </h2>

                {error && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSave} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="title">
                      Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      required
                      value={formData.title}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="slug">
                      Slug (optional)
                    </label>
                    <input
                      type="text"
                      id="slug"
                      name="slug"
                      value={formData.slug}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="coverImageUrl">
                      Cover Image URL (optional)
                    </label>
                    <input
                      type="url"
                      id="coverImageUrl"
                      name="coverImageUrl"
                      value={formData.coverImageUrl}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="excerpt">
                      Excerpt (optional)
                    </label>
                    <textarea
                      id="excerpt"
                      name="excerpt"
                      rows="3"
                      value={formData.excerpt}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="content">
                      Content
                    </label>
                    <textarea
                      id="content"
                      name="content"
                      rows="10"
                      required
                      value={formData.content}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="tags">
                        Tags (comma separated)
                      </label>
                      <input
                        type="text"
                        id="tags"
                        name="tags"
                        value={formData.tags}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="status">
                        Status
                      </label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : formData.id ? 'Update Post' : 'Create Post'}
                    </button>
                    {formData.id && (
                      <button type="button" className="btn-outline" onClick={resetForm}>
                        Cancel Editing
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white border border-gray-100 rounded-3xl shadow-soft p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-xl text-gray-900">All Posts</h2>
                    <button type="button" className="btn-outline" onClick={resetForm}>
                      New Post
                    </button>
                  </div>

                  {loading && (
                    <p className="text-sm text-gray-500">Loading posts...</p>
                  )}
                  {!loading && blogs.length === 0 && (
                    <p className="text-sm text-gray-500">No posts created yet.</p>
                  )}

                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
                    {blogs.map((blog) => (
                      <div key={blog.id} className="border border-gray-100 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {blog.title || 'Untitled'}
                          </h3>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadge[String(blog.status || 'DRAFT').toUpperCase()] || 'bg-gray-100 text-gray-600'}`}
                          >
                            {String(blog.status || 'DRAFT').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                          {formatDate(blog.publishedAt || blog.createdAt)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="btn-outline px-3 py-1 text-xs" onClick={() => handleEdit(blog)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-outline px-3 py-1 text-xs border-red-200 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(blog.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-3xl shadow-soft p-6">
                  <h3 className="font-display text-xl text-gray-900 mb-3">Publishing Tips</h3>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>Keep titles under 60 characters for best display.</li>
                    <li>Use the excerpt to summarize the story in 1-2 lines.</li>
                    <li>Separate paragraphs with a blank line in the content.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default BlogAdmin;
