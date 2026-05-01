import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import * as blogsService from "../services/blogsService";

function normalizeText(value: unknown): string {
  return String(value || "").trim();
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
    const title = normalizeText(req.body?.title);
    const content = normalizeText(req.body?.content);
    if (!title) {
      res.status(400).json({ success: false, message: "Title is required" });
      return;
    }
    if (!content) {
      res.status(400).json({ success: false, message: "Content is required" });
      return;
    }

    const payload = {
      ...req.body,
      title,
      content,
      authorName: req.body?.authorName || req.user?.name || req.user?.email || "",
    };

    const blog = await blogsService.createBlog(payload);
    res.json({ success: true, data: blog });
  } catch (error) {
    console.error("Create blog error:", error);
    res.status(500).json({ success: false, message: "Failed to create blog" });
  }
}

export async function updateBlog(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const blog = await blogsService.updateBlog(id, req.body || {});
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
    const result = await blogsService.deleteBlog(id);
    if (!result) {
      res.status(404).json({ success: false, message: "Blog not found" });
      return;
    }
    res.json({ success: true, message: "Blog deleted" });
  } catch (error) {
    console.error("Delete blog error:", error);
    res.status(500).json({ success: false, message: "Failed to delete blog" });
  }
}
