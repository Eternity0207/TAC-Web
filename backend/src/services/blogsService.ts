async function callBlogAction(action: string, payload: any = {}) {
  const { callPostgresAction } = await import("../repos/googleSheetsRepo");
  return await callPostgresAction(action, payload);
}

export type BlogStatus = "DRAFT" | "PUBLISHED";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl?: string;
  authorName?: string;
  tags: string[];
  status: BlogStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((tag) => normalizeText(tag)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => normalizeText(tag))
      .filter(Boolean);
  }
  return [];
}

function buildExcerpt(content: string, maxLen = 160): string {
  const normalized = normalizeText(content).replace(/\s+/g, " ");
  if (!normalized) return "";
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen).trim()}...`;
}

function normalizeBlog(blog: any): BlogPost {
  return {
    id: normalizeText(blog?.id),
    title: normalizeText(blog?.title),
    slug: normalizeText(blog?.slug),
    excerpt: normalizeText(blog?.excerpt),
    content: normalizeText(blog?.content),
    coverImageUrl: normalizeText(blog?.coverImageUrl || blog?.cover_image_url) || undefined,
    authorName: normalizeText(blog?.authorName || blog?.author_name) || undefined,
    tags: parseTags(blog?.tags),
    status: (normalizeText(blog?.status || "DRAFT").toUpperCase() as BlogStatus) || "DRAFT",
    publishedAt: blog?.publishedAt ?? blog?.published_at ?? null,
    createdAt: normalizeText(blog?.createdAt),
    updatedAt: normalizeText(blog?.updatedAt),
  };
}

function sortByNewest(a: BlogPost, b: BlogPost): number {
  const aTime = Date.parse(String(a.publishedAt || a.createdAt || "")) || 0;
  const bTime = Date.parse(String(b.publishedAt || b.createdAt || "")) || 0;
  return bTime - aTime;
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  const fallback = baseSlug || `blog-${Date.now()}`;
  const result = await callBlogAction("getAllBlogs");
  const blogs = Array.isArray(result.data) ? result.data.map(normalizeBlog) : [];
  const taken = new Set(
    blogs.filter((b) => (excludeId ? b.id !== excludeId : true)).map((b) => b.slug)
  );

  if (!taken.has(fallback)) return fallback;

  let counter = 2;
  let next = `${fallback}-${counter}`;
  while (taken.has(next)) {
    counter += 1;
    next = `${fallback}-${counter}`;
  }
  return next;
}

export async function getAllBlogs(): Promise<BlogPost[]> {
  const result = await callBlogAction("getAllBlogs");
  if (!result.success) throw new Error(result.message || "Failed to load blogs");
  const rows = Array.isArray(result.data) ? result.data : [];
  return rows.map(normalizeBlog).sort(sortByNewest);
}

export async function getPublicBlogs(): Promise<BlogPost[]> {
  const result = await callBlogAction("getPublicBlogs");
  if (!result.success) throw new Error(result.message || "Failed to load blogs");
  const rows = Array.isArray(result.data) ? result.data : [];
  return rows.map(normalizeBlog).sort(sortByNewest);
}

export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  const result = await callBlogAction("getBlogBySlug", { slug });
  if (!result.success) return null;
  if (!result.data) return null;
  return normalizeBlog(result.data);
}

export async function createBlog(data: Partial<BlogPost>): Promise<BlogPost> {
  const title = normalizeText(data.title);
  const content = normalizeText(data.content);
  if (!title) throw new Error("Blog title is required");

  const status = (normalizeText(data.status || "DRAFT").toUpperCase() as BlogStatus) || "DRAFT";
  const baseSlug = slugify(normalizeText(data.slug || title));
  const slug = await ensureUniqueSlug(baseSlug);
  const excerpt = normalizeText(data.excerpt) || buildExcerpt(content);
  const tags = parseTags(data.tags);
  const publishedAt = status === "PUBLISHED"
    ? (data.publishedAt || new Date().toISOString())
    : null;

  const payload = {
    ...data,
    title,
    slug,
    excerpt,
    content,
    tags,
    status,
    publishedAt,
  };

  const result = await callBlogAction("createBlog", payload);
  if (!result.success) throw new Error(result.message || "Failed to create blog");
  return normalizeBlog(result.data);
}

export async function updateBlog(id: string, updates: Partial<BlogPost>): Promise<BlogPost | null> {
  if (!id) return null;

  const payload: any = { ...updates };

  if (typeof updates.title !== "undefined" && typeof updates.slug === "undefined") {
    payload.slug = slugify(normalizeText(updates.title));
  }

  if (typeof updates.slug !== "undefined") {
    payload.slug = slugify(normalizeText(updates.slug));
  }

  if (payload.slug) {
    payload.slug = await ensureUniqueSlug(payload.slug, id);
  }

  if (typeof updates.content !== "undefined" && typeof updates.excerpt === "undefined") {
    payload.excerpt = buildExcerpt(normalizeText(updates.content));
  }

  if (typeof updates.tags !== "undefined") {
    payload.tags = parseTags(updates.tags);
  }

  if (typeof updates.status !== "undefined") {
    const status = normalizeText(updates.status).toUpperCase() as BlogStatus;
    payload.status = status;
    if (status === "PUBLISHED" && !updates.publishedAt) {
      payload.publishedAt = new Date().toISOString();
    }
    if (status === "DRAFT") {
      payload.publishedAt = null;
    }
  }

  const result = await callBlogAction("updateBlog", { id, updates: payload });
  if (!result.success) return null;
  return normalizeBlog(result.data);
}

export async function deleteBlog(id: string): Promise<boolean> {
  const result = await callBlogAction("deleteBlog", { id });
  return !!result.success;
}

export default {
  getAllBlogs,
  getPublicBlogs,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
};
