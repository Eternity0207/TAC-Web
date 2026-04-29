import { Response } from "express";
import axios from "axios";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import supabase from "../services/supabase";
import { AuthRequest } from "../middleware/auth";
import { UserRole, UserStatus } from "../types";
import { config } from "../config";

// Helper functions for role checks
function isSuperAdmin(req: AuthRequest): boolean {
  return req.user?.role === UserRole.SUPER_ADMIN;
}

function isManager(req: AuthRequest): boolean {
  return req.user?.role === UserRole.HEAD_DISTRIBUTION;
}

function hasAdminAccess(req: AuthRequest): boolean {
  return (
    isSuperAdmin(req) ||
    req.user?.role === UserRole.ADMIN
  );
}

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

export async function getAllUsers(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // Super Admin and Admin can see all users
    // Manager can only see their team
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const users = await supabase.getAllAdminUsers();

    let filteredUsers = users;

    // If manager, only show their team
    if (isManager(req) && !hasAdminAccess(req)) {
      filteredUsers = users.filter((u) => u.managerId === req.user?.id);
    } else if (!hasAdminAccess(req) && !isSuperAdmin(req)) {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    res.json({
      success: true,
      data: filteredUsers.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        profileImageUrl: u.profileImageUrl,
        role: u.role,
        status: u.status,
        designation: u.designation,
        phone: u.phone,
        managerId: u.managerId,
        salesTargets: u.salesTargets,
        regions: u.regions,
        location: u.location,
        createdBy: u.createdBy,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
      })),
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function createUser(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const {
      email,
      name,
      role,
      password,
      designation,
      profileImageUrl,
      phone,
      managerId,
      regions,
      location,
      createdBy,
    } = req.body;

    if (!email || !password || !role) {
      res.status(400).json({
        success: false,
        message: "Email, password, and role are required",
      });
      return;
    }

    // Role-based permission check
    // Super Admin can create any role
    // Manager can only create SALES users under themselves
    if (isSuperAdmin(req)) {
      // Super Admin can create any role
    } else if (isManager(req)) {
      // Manager can only create SALES users
      if (role !== UserRole.SALES && role !== "SALES") {
        res.status(403).json({
          success: false,
          message: "Managers can only create Sales users",
        });
        return;
      }
    } else if (hasAdminAccess(req)) {
      // Admin can create Manager and Sales
      if (role === UserRole.SUPER_ADMIN || role === "SUPER_ADMIN") {
        res
          .status(403)
          .json({ success: false, message: "Cannot create Super Admin users" });
        return;
      }
    } else {
      res.status(403).json({ success: false, message: "Permission denied" });
      return;
    }

    const existing = await supabase.getAdminByEmail(email);
    if (existing) {
      res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // If manager is creating user, set managerId to themselves
    const userManagerId =
      isManager(req) && !hasAdminAccess(req)
        ? req.user.id
        : managerId || undefined;

    const user = await supabase.createAdminUser({
      email,
      passwordHash,
      name: name || email.split("@")[0],
      role: role as UserRole,
      status: UserStatus.ACTIVE,
      profileImageUrl,
      designation,
      phone,
      managerId: userManagerId,
      regions: regions || [],
      location: location || "",
      createdBy: createdBy || req.user?.name || req.user?.email || "Admin",
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        status: user.status,
        designation: user.designation,
        phone: user.phone,
        managerId: user.managerId,
        regions: user.regions,
        location: user.location,
        createdBy: user.createdBy,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function updateUser(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const { id } = req.params;
    const {
      email,
      name,
      role,
      password,
      designation,
      profileImageUrl,
      phone,
      status,
      managerId,
      regions,
      location,
    } = req.body;

    // Check permissions
    const targetUser = await supabase.getAdminById(id);
    if (!targetUser) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Manager can only update their team members
    if (isManager(req) && !hasAdminAccess(req) && !isSuperAdmin(req)) {
      if (targetUser.managerId !== req.user.id) {
        res.status(403).json({
          success: false,
          message: "Can only update your team members",
        });
        return;
      }
    } else if (!hasAdminAccess(req) && !isSuperAdmin(req)) {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    const updates: any = {};
    if (email) updates.email = email;
    if (name) updates.name = name;
    if (role && (isSuperAdmin(req) || hasAdminAccess(req))) updates.role = role;
    if (designation !== undefined) updates.designation = designation;
    if (profileImageUrl !== undefined) updates.profileImageUrl = profileImageUrl;
    if (phone !== undefined) updates.phone = phone;
    if (status !== undefined && (isSuperAdmin(req) || hasAdminAccess(req)))
      updates.status = status;
    if (managerId !== undefined && isSuperAdmin(req))
      updates.managerId = managerId;
    if (regions !== undefined) updates.regions = regions;
    if (location !== undefined) updates.location = location;
    if (password) updates.passwordHash = await bcrypt.hash(password, 12);

    const user = await supabase.updateAdminUser(id, updates);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        status: user.status,
        designation: user.designation,
        phone: user.phone,
        managerId: user.managerId,
        regions: user.regions,
        location: user.location,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function deleteUser(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!isSuperAdmin(req)) {
      res
        .status(403)
        .json({ success: false, message: "Super Admin access required" });
      return;
    }

    const { id } = req.params;

    // Prevent self-deletion
    if (req.user?.id === id) {
      res
        .status(400)
        .json({ success: false, message: "Cannot delete your own account" });
      return;
    }

    const deleted = await supabase.deleteAdminUser(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * Deactivate a user (Super Admin only)
 */
export async function deactivateUser(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!isSuperAdmin(req)) {
      res
        .status(403)
        .json({ success: false, message: "Super Admin access required" });
      return;
    }

    const { id } = req.params;

    // Prevent self-deactivation
    if (req.user?.id === id) {
      res.status(400).json({
        success: false,
        message: "Cannot deactivate your own account",
      });
      return;
    }

    const user = await supabase.updateAdminUser(id, {
      status: UserStatus.INACTIVE,
    });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.json({
      success: true,
      message: "User deactivated",
      data: { id: user.id, status: user.status },
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * Activate a user (Super Admin only)
 */
export async function activateUser(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!isSuperAdmin(req)) {
      res
        .status(403)
        .json({ success: false, message: "Super Admin access required" });
      return;
    }

    const { id } = req.params;

    const user = await supabase.updateAdminUser(id, {
      status: UserStatus.ACTIVE,
    });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.json({
      success: true,
      message: "User activated",
      data: { id: user.id, status: user.status },
    });
  } catch (error) {
    console.error("Activate user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * Get team members (for Manager)
 */
export async function getTeamMembers(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    if (!isManager(req) && !hasAdminAccess(req) && !isSuperAdmin(req)) {
      res
        .status(403)
        .json({ success: false, message: "HEAD_DISTRIBUTION or Admin access required" });
      return;
    }

    const managerId = req.params.managerId || req.user.id;
    const users = await supabase.getAllAdminUsers();
    const teamMembers = users.filter((u) => u.managerId === managerId);

    res.json({
      success: true,
      data: teamMembers.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        profileImageUrl: u.profileImageUrl,
        role: u.role,
        status: u.status,
        phone: u.phone,
        salesTargets: u.salesTargets,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
      })),
    });
  } catch (error) {
    console.error("Get team members error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// Public endpoint for landing page referral dropdown
export async function getStaffList(req: any, res: Response): Promise<void> {
  try {
    const users = await supabase.getAllAdminUsers();
    // Filter to show only SALES and HEAD_DISTRIBUTION, and only active users
    const staffList = users
      .filter((u) => {
        const roleStr = String(u.role);
        const statusStr = String(u.status || "ACTIVE");
        return (
          (roleStr === "SUPER_ADMIN" || roleStr === "SALES" || roleStr === "HEAD_DISTRIBUTION" || roleStr === "TECHNICAL_ANALYST" || roleStr === "INTERN") &&
          statusStr === "ACTIVE"
        );
      })
      .map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name || u.email.split("@")[0],
        profileImageUrl: u.profileImageUrl || "",
        designation: u.designation || "",
        bio: u.bio || "",
        role: u.role,
      }));

    // Keep both shapes for backward compatibility:
    // - data.staff for legacy admin bundle
    // - root-level staff for clients that read response.data.staff
    res.json({
      success: true,
      data: {
        staff: staffList,
        items: staffList,
      },
      staff: staffList,
    });
  } catch (error) {
    console.error("Get staff list error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// Get current user profile
export async function getProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const user = await supabase.getAdminById(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        status: user.status,
        designation: user.designation,
        phone: user.phone,
        managerId: user.managerId,
        salesTargets: user.salesTargets,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function uploadProfilePhoto(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const file = (req as any).file as
      | { mimetype: string; buffer: Buffer }
      | undefined;

    if (!file) {
      res.status(400).json({ success: false, message: "Photo file is required" });
      return;
    }

    if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
      res.status(500).json({
        success: false,
        message: "Supabase is not configured on server",
      });
      return;
    }

    const ext = extFromMime(file.mimetype);
    const filePath = `${req.user.id}/${Date.now()}-${randomUUID()}.${ext}`;
    const encodedFilePath = filePath
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");

    try {
      await axios.post(
        `${config.supabaseUrl}/storage/v1/object/${config.supabaseProfilePhotosBucket}/${encodedFilePath}`,
        file.buffer,
        {
          headers: {
            Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
            apikey: config.supabaseServiceRoleKey,
            "Content-Type": file.mimetype,
            "x-upsert": "true",
          },
        }
      );
    } catch (uploadError: any) {
      res.status(500).json({
        success: false,
        message: `Failed to upload photo: ${uploadError?.response?.data?.message || uploadError.message}`,
      });
      return;
    }

    const profileImageUrl = `${config.supabaseUrl}/storage/v1/object/public/${config.supabaseProfilePhotosBucket}/${encodedFilePath}`;
    const user = await supabase.updateAdminUser(req.user.id, {
      profileImageUrl,
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.json({
      success: true,
      message: "Profile photo uploaded successfully",
      data: {
        profileImageUrl,
      },
    });
  } catch (error) {
    console.error("Upload profile photo error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// Update current user profile (users can edit their own profile)
export async function updateProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const { name, designation, phone, profileImageUrl } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (designation !== undefined) updates.designation = designation;
    if (phone !== undefined) updates.phone = phone;
    if (profileImageUrl !== undefined) updates.profileImageUrl = profileImageUrl;

    const user = await supabase.updateAdminUser(req.user.id, updates);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        status: user.status,
        designation: user.designation,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getUserById(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const { id } = req.params;
    const user = await supabase.getAdminById(id);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Check permissions
    if (!hasAdminAccess(req) && !isSuperAdmin(req) && req.user.id !== id) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        status: user.status,
        designation: user.designation,
        phone: user.phone,
        managerId: user.managerId,
        salesTargets: user.salesTargets,
        regions: user.regions,
        location: user.location,
        createdBy: user.createdBy,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("Get user by id error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getStaffPerformance(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    if (!hasAdminAccess(req) && !isManager(req) && !isSuperAdmin(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    // For now, return empty performance data - can be implemented later
    res.json({
      success: true,
      data: {
        totalStaff: 0,
        activeStaff: 0,
        performanceMetrics: [],
        topPerformers: [],
      },
    });
  } catch (error) {
    console.error("Get staff performance error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// Change password for current user
export async function changePassword(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
      return;
    }

    // Fetch user to verify current password
    const users = await supabase.getAllAdminUsers();
    const user = users.find((u) => u.id === req.user?.id);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!isValidPassword) {
      res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
      return;
    }

    // Hash and update new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await supabase.updateAdminUser(req.user.id, {
      passwordHash: newPasswordHash,
    });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
