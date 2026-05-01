import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import * as blogsService from "../services/blogsService";

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function validateBlogInput(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const title = normalizeText(data?.title);
  if (!title) errors.push("Title is required and cannot be empty");
  if (title.length > 200) errors.push("Title must be under 200 characters");
  
  const content = normalizeText(data?.content);
  if (!content) errors.push("Content is required and cannot be empty");
  if (content.length < 10) errors.push("Content must be at least 10 characters");
  
  if (data?.excerpt) {
    const excerpt = normalizeText(data.excerpt);
    if (excerpt.length > 300) errors.push("Excerpt must be under 300 characters");
  }
  
  if (data?.coverImageUrl) {
    const url = normalizeText(data.coverImageUrl);
    if (url && !url.match(/^https?:\/\//i)) {
      errors.push("Cover image URL must be a valid HTTP/HTTPS URL");
    }
  }
  
  if (data?.status && !["DRAFT", "PUBLISHED"].includes(data.status)) {
    errors.push("Status must be DRAFT or PUBLISHED");
  }
  
  return { valid: errors.length === 0, errors };
}

export async function getPublicBlogs(_req: Request, res: Response): Promise<void> {
  try {
    const blogs = await blogsService.getPublicBlogs();
    res.json({ success: true, data: blogs });
  } catch (error) {
    console.error("Get public blogs error:", error);
    res.status(500).json({ success: false, message: "Failed to get blogs" });
  }
}

export async function getPublicBlogBySlug(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    if (!slug || slug.trim().length === 0) {
      res.status(400).json({ success: false, message: "Invalid slug" });
      return;
    }
    const blog = await blogsService.getBlogBySlug(slug);
    if (!blog || blog.status !== "PUBLISHED") {
      res.status(404).json({ success: false, message: "Blog not found" });
      return;
    }
    res.json({ success: true, data: blog });
  } catch (error) {
    console.error("Get public blog error:", error);
    res.status(500).json({ success: false, message: "Failed to get blog" });
  }
}

export async function getAllBlogs(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const blogs = await blogsService.getAllBlogs();
    res.json({ success: true, data: blogs });
  } catch (error) {
    console.error("Get all blogs error:", error);
    res.status(500).json({ success: false, message: "Failed to get blogs" });
  }
}

export async function createBlog(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = validateBlogInput(req.body);
    if (!validation.valid) {
      res.status(400).json({ success: false, message: validation.errors.join("; ") });
      return;
    }

    const payload = {
      ...req.body,
      title: normalizeText(req.body.title),
      content: normalizeText(req.body.content),
      excerpt: req.body?.excerpt ? normalizeText(req.body.excerpt) : "",
      slug: req.body?.slug ? normalizeText(req.body.slug) : "",
      coverImageUrl: req.body?.coverImageUrl ? normalizeText(req.body.coverImageUrl) : "",
      tags: req.body?.tags || [],
      status: req.body?.status || "DRAFT",
      authorName: req.body?.authorName || req.user?.name || req.user?.email || "Admin",
    };

    const blog = await blogsService.createBlog(payload);
    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    console.error("Create blog error:", error);
    res.status(500).json({ success: false, message: "Failed to create blog" });
  }
}

export async function updateBlog(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id || id.trim().length === 0) {
      res.status(400).json({ success: false, message: "Invalid blog ID" });
      return;
    }

    if (Object.keys(req.body || {}).length === 0) {
      res.status(400).json({ success: false, message: "No fields to update" });
      return;
    }

    const updates: any = {};
    if (req.body?.title !== undefined) updates.title = normalizeText(req.body.title);
    if (req.body?.content !== undefined) updates.content = normalizeText(req.body.content);
    if (req.body?.excerpt !== undefined) updates.excerpt = normalizeText(req.body.excerpt);
    if (req.body?.slug !== undefined) updates.slug = normalizeText(req.body.slug);
    if (req.body?.coverImageUrl !== undefined) updates.coverImageUrl = normalizeText(req.body.coverImageUrl);
    if (req.body?.tags !== undefined) updates.tags = req.body.tags;
    if (req.body?.status !== undefined) updates.status = req.body.status;

    const validation = { valid: true, errors: [] };
    if (updates.title && updates.title.length > 200) validation.errors.push("Title must be under 200 characters");
    if (updates.content && updates.content.length < 10) validation.errors.push("Content must be at least 10 characters");
    if (updates.status && !["DRAFT", "PUBLISHED"].includes(updates.status)) validation.errors.push("Status must be DRAFT or PUBLISHED");
    
    if (!validation.valid || validation.errors.length > 0) {
      res.status(400).json({ success: false, message: validation.errors.join("; ") });
      return;
    }

    const blog = await blogsService.updateBlog(id, updates);
    if (!blog) {
      res.status(404).json({ success: false, message: "Blog not found" });
      return;
    }
    res.json({ success: true, data: blog });
  } catch (error) {
    console.error("Update blog error:", error);
    res.status(500).json({ success: false, message: "Failed to update blog" });
  }
}

export async function deleteBlog(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id || id.trim().length === 0) {
      res.status(400).json({ success: false, message: "Invalid blog ID" });
      return;
    }
    const result = await blogsService.deleteBlog(id);
    if (!result) {
      res.status(404).json({ success: false, message: "Blog not found" });
      return;
    }
    res.json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Delete blog error:", error);
    res.status(500).json({ success: false, message: "Failed to delete blog" });
  }
}
