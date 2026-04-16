import { Response } from "express";
import inventoryService from "../services/inventoryService";
import googleSheets from "../services/googleSheets";
import { AuthRequest } from "../middleware/auth";
import { OrderStatus, PaymentStatus, UserRole } from "../types";

function parseOrderDateValue(value: unknown): number {
  if (value == null) return Number.NaN;

  if (value instanceof Date) {
    const ts = value.getTime();
    return Number.isFinite(ts) ? ts : Number.NaN;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return Number.NaN;
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }

  const raw = String(value).trim();
  if (!raw) return Number.NaN;

  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
    }
  }

  const isoTs = Date.parse(raw);
  if (!Number.isNaN(isoTs)) return isoTs;

  const match = raw.match(
    /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (!match) return Number.NaN;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  let year = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4] || "0", 10);
  const minute = Number.parseInt(match[5] || "0", 10);
  const second = Number.parseInt(match[6] || "0", 10);

  if (year < 100) year += 2000;
  const parsed = new Date(year, month - 1, day, hour, minute, second).getTime();
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

function getOrderTimestamp(order: { createdAt?: unknown; updatedAt?: unknown }) {
  const createdTs = parseOrderDateValue(order.createdAt);
  if (!Number.isNaN(createdTs) && createdTs > 0) return createdTs;

  const updatedTs = parseOrderDateValue(order.updatedAt);
  if (!Number.isNaN(updatedTs) && updatedTs > 0) return updatedTs;

  return 0;
}

// Check if user has admin access (for commission settings)
function hasAdminAccess(req: AuthRequest): boolean {
  return (
    req.user?.role === UserRole.SUPER_ADMIN || req.user?.role === UserRole.ADMIN
  );
}

// Check if user is Super Admin (for Unit Economics)
function isSuperAdmin(req: AuthRequest): boolean {
  return req.user?.role === UserRole.SUPER_ADMIN;
}

// Check if user can access Competitor Analysis (Super Admin or Technical Analyst)
function canAccessCompetitors(req: AuthRequest): boolean {
  return (
    req.user?.role === UserRole.SUPER_ADMIN ||
    req.user?.role === UserRole.TECHNICAL_ANALYST
  );
}

// Check if user is a manager (HEAD_DISTRIBUTION)
function isManager(req: AuthRequest): boolean {
  return req.user?.role === UserRole.HEAD_DISTRIBUTION;
}

// ============================================================
// UNIT ECONOMICS
// ============================================================

export async function getUnitEconomics(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // Allow SUPER_ADMIN and HEAD_DISTRIBUTION to view unit economics
    // HEAD_DISTRIBUTION needs this for gross profit calculations in Team Distribution
    if (!isSuperAdmin(req) && !isManager(req)) {
      res
        .status(403)
        .json({ success: false, message: "Admin or Manager access required" });
      return;
    }

    const data = await inventoryService.getUnitEconomics();

    if (!data) {
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch unit economics" });
      return;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error("Get unit economics error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch unit economics" });
  }
}

export async function updateUnitEconomics(
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

    const updates = req.body;
    const success = await inventoryService.updateUnitEconomics(updates);

    if (!success) {
      res
        .status(500)
        .json({ success: false, message: "Failed to update unit economics" });
      return;
    }

    res.json({ success: true, message: "Unit economics updated successfully" });
  } catch (error) {
    console.error("Update unit economics error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update unit economics" });
  }
}

// ============================================================
// COMPETITOR ANALYSIS
// ============================================================

export async function getAllCompetitors(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!canAccessCompetitors(req)) {
      res.status(403).json({
        success: false,
        message: "Access denied. Super Admin or Technical Analyst required",
      });
      return;
    }

    const competitors = await inventoryService.getAllCompetitors();
    res.json({ success: true, data: competitors });
  } catch (error) {
    console.error("Get competitors error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch competitors" });
  }
}

export async function createCompetitor(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!canAccessCompetitors(req)) {
      res.status(403).json({
        success: false,
        message: "Access denied. Super Admin or Technical Analyst required",
      });
      return;
    }

    const data = req.body;

    if (!data.name) {
      res
        .status(400)
        .json({ success: false, message: "Competitor name is required" });
      return;
    }

    const competitor = await inventoryService.createCompetitor(data);

    if (!competitor) {
      res
        .status(500)
        .json({ success: false, message: "Failed to create competitor" });
      return;
    }

    res.json({ success: true, data: competitor });
  } catch (error) {
    console.error("Create competitor error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create competitor" });
  }
}

export async function updateCompetitor(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!canAccessCompetitors(req)) {
      res.status(403).json({
        success: false,
        message: "Access denied. Super Admin or Technical Analyst required",
      });
      return;
    }

    const { id } = req.params;
    const updates = req.body;

    const success = await inventoryService.updateCompetitor(id, updates);

    if (!success) {
      res
        .status(500)
        .json({ success: false, message: "Failed to update competitor" });
      return;
    }

    res.json({ success: true, message: "Competitor updated successfully" });
  } catch (error) {
    console.error("Update competitor error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update competitor" });
  }
}

export async function deleteCompetitor(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!canAccessCompetitors(req)) {
      res.status(403).json({
        success: false,
        message: "Access denied. Super Admin or Technical Analyst required",
      });
      return;
    }

    const { id } = req.params;
    const success = await inventoryService.deleteCompetitor(id);

    if (!success) {
      res
        .status(500)
        .json({ success: false, message: "Failed to delete competitor" });
      return;
    }

    res.json({ success: true, message: "Competitor deleted successfully" });
  } catch (error) {
    console.error("Delete competitor error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete competitor" });
  }
}

// ============================================================
// COMPETITOR HISTORY
// ============================================================

export async function getCompetitorHistory(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!canAccessCompetitors(req)) {
      res.status(403).json({
        success: false,
        message: "Access denied. Super Admin or Technical Analyst required",
      });
      return;
    }

    const { id } = req.params;
    const history = await inventoryService.getCompetitorHistory(id);
    res.json({ success: true, data: history });
  } catch (error) {
    console.error("Get competitor history error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch competitor history" });
  }
}

export async function getCompetitorVersion(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!canAccessCompetitors(req)) {
      res.status(403).json({
        success: false,
        message: "Access denied. Super Admin or Technical Analyst required",
      });
      return;
    }

    const { id, version } = req.params;
    const data = await inventoryService.getCompetitorVersion(
      id,
      parseInt(version)
    );

    if (!data) {
      res.status(404).json({ success: false, message: "Version not found" });
      return;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error("Get competitor version error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch competitor version" });
  }
}

export async function revertCompetitor(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!canAccessCompetitors(req)) {
      res.status(403).json({
        success: false,
        message: "Access denied. Super Admin or Technical Analyst required",
      });
      return;
    }

    const { id } = req.params;
    const { version } = req.body;

    if (!version) {
      res.status(400).json({ success: false, message: "Version is required" });
      return;
    }

    const data = await inventoryService.revertCompetitor(id, parseInt(version));

    if (!data) {
      res
        .status(500)
        .json({ success: false, message: "Failed to revert competitor" });
      return;
    }

    res.json({
      success: true,
      message: `Competitor reverted to version ${version}`,
      data,
    });
  } catch (error) {
    console.error("Revert competitor error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to revert competitor" });
  }
}

// ============================================================
// COMMISSION SETTINGS
// ============================================================

export async function getAllCommissionSettings(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const user = req.user;

    // Allow admin access OR HEAD_DISTRIBUTION (filtered to their team)
    if (!hasAdminAccess(req) && user?.role !== UserRole.HEAD_DISTRIBUTION) {
      res.status(403).json({
        success: false,
        message: "Admin or HEAD_DISTRIBUTION access required",
      });
      return;
    }

    let settings = await inventoryService.getAllCommissionSettings();

    // If HEAD_DISTRIBUTION, filter to only show their own settings and their team members
    if (user?.role === UserRole.HEAD_DISTRIBUTION) {
      settings = settings.filter(
        (s: any) => s.userId === user.id || s.managerId === user.id
      );
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error("Get commission settings error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch commission settings" });
  }
}

export async function getCommissionSettingsByUserId(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { userId } = req.params;
    const user = req.user;

    // Allow admin access OR user accessing their own settings
    if (
      !hasAdminAccess(req) &&
      user?.id !== userId &&
      user?.role !== UserRole.HEAD_DISTRIBUTION
    ) {
      res.status(403).json({
        success: false,
        message: "Admin access required or must be accessing own settings",
      });
      return;
    }

    // HEAD_DISTRIBUTION can only access their own settings
    if (user?.role === UserRole.HEAD_DISTRIBUTION && user?.id !== userId) {
      res.status(403).json({
        success: false,
        message: "Can only access your own commission settings",
      });
      return;
    }

    const setting = await inventoryService.getCommissionSettingsByUserId(
      userId
    );

    if (!setting) {
      // Return empty/default settings instead of 404
      res.json({
        success: true,
        data: {
          userId,
          commissionPercent: 0,
          managerDistributionPercent: 0,
          isActive: true,
        },
      });
      return;
    }

    res.json({ success: true, data: setting });
  } catch (error) {
    console.error("Get commission settings error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch commission settings" });
  }
}

export async function upsertCommissionSettings(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const isAdmin = hasAdminAccess(req);
    const isHeadDistribution = req.user?.role === "HEAD_DISTRIBUTION";

    // Allow Admin and HEAD_DISTRIBUTION
    if (!isAdmin && !isHeadDistribution) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const data = req.body;

    if (!data.userId) {
      res.status(400).json({ success: false, message: "User ID is required" });
      return;
    }

    // HEAD_DISTRIBUTION can only update their own team members
    if (isHeadDistribution && !isAdmin) {
      // They can update their own settings or their team members
      if (!req.user?.id || (data.userId !== req.user.id && data.managerId !== req.user.id)) {
        res.status(403).json({
          success: false,
          message: "You can only update your own team members",
        });
        return;
      }
    }

    const setting = await inventoryService.upsertCommissionSettings(data);

    if (!setting) {
      res.status(500).json({
        success: false,
        message: "Failed to save commission settings",
      });
      return;
    }

    res.json({ success: true, data: setting });
  } catch (error) {
    console.error("Upsert commission settings error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to save commission settings" });
  }
}

export async function bulkUpdateCommissionSettings(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const isAdmin = hasAdminAccess(req);
    const isHeadDistribution = req.user?.role === "HEAD_DISTRIBUTION";

    // Allow Admin and HEAD_DISTRIBUTION
    if (!isAdmin && !isHeadDistribution) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      res
        .status(400)
        .json({ success: false, message: "Settings array is required" });
      return;
    }

    // HEAD_DISTRIBUTION can only update their own team members
    let filteredSettings = settings;
    if (isHeadDistribution && !isAdmin && req.user?.id) {
      filteredSettings = settings.filter(
        (s: any) => s.userId === req.user.id || s.managerId === req.user.id
      );
    }

    const success = await inventoryService.bulkUpdateCommissionSettings(
      filteredSettings
    );

    if (!success) {
      res.status(500).json({
        success: false,
        message: "Failed to update commission settings",
      });
      return;
    }

    res.json({
      success: true,
      message: "Commission settings updated successfully",
    });
  } catch (error) {
    console.error("Bulk update commission settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update commission settings",
    });
  }
}

export async function deleteCommissionSettings(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!hasAdminAccess(req)) {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    const { userId } = req.params;
    const success = await inventoryService.deleteCommissionSettings(userId);

    if (!success) {
      res.status(500).json({
        success: false,
        message: "Failed to delete commission settings",
      });
      return;
    }

    res.json({
      success: true,
      message: "Commission settings deleted successfully",
    });
  } catch (error) {
    console.error("Delete commission settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete commission settings",
    });
  }
}

export async function getManagerDistributions(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!hasAdminAccess(req)) {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    const distributions = await inventoryService.getManagerDistributions();
    res.json({ success: true, data: distributions });
  } catch (error) {
    console.error("Get manager distributions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch manager distributions",
    });
  }
}

/**
 * Get team members from AdminUsers for commission distribution
 * This fetches team members based on managerId from the main AdminUsers data
 */
export async function getTeamMembersForCommission(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    // Get managerId from query or use current user's ID if they are HEAD_DISTRIBUTION
    let managerId = req.query.managerId as string;

    // If no managerId provided and user is HEAD_DISTRIBUTION, use their own ID
    if (!managerId && user.role === UserRole.HEAD_DISTRIBUTION) {
      managerId = user.id;
    }

    // Super Admin can see any manager's team, HEAD_DISTRIBUTION can only see their own
    if (user.role === UserRole.HEAD_DISTRIBUTION && managerId !== user.id) {
      res
        .status(403)
        .json({ success: false, message: "Can only view your own team" });
      return;
    }

    if (!hasAdminAccess(req) && user.role !== UserRole.HEAD_DISTRIBUTION) {
      res.status(403).json({
        success: false,
        message: "Admin or HEAD_DISTRIBUTION access required",
      });
      return;
    }

    // Import googleSheets to fetch AdminUsers
    const googleSheets = (await import("../services/googleSheets")).default;
    const allUsers = await googleSheets.getAllAdminUsers();

    // Filter users by managerId
    const teamMembers = allUsers.filter((u: any) => u.managerId === managerId);

    // Also get manager info
    const manager = allUsers.find((u: any) => u.id === managerId);

    // Format team members for commission distribution
    const formattedMembers = teamMembers.map((member: any) => ({
      userId: member.id,
      userName: member.name,
      userEmail: member.email,
      role: member.role,
      managerId: managerId,
      managerName: manager?.name || "",
      status: member.status,
      isActive: member.status === "ACTIVE",
    }));

    res.json({
      success: true,
      data: {
        managerId,
        managerName: manager?.name || "",
        teamMembers: formattedMembers,
      },
    });
  } catch (error) {
    console.error("Get team members for commission error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch team members",
    });
  }
}

// ============================================================
// MONTHLY TARGETS & TEAM EARNINGS
// ============================================================

// Helper to check if user is a HEAD_DISTRIBUTION (manager role)
function isHeadDistribution(req: AuthRequest): boolean {
  return (
    req.user?.role === UserRole.HEAD_DISTRIBUTION ||
    req.user?.role === UserRole.SUPER_ADMIN
  );
}

// Helper to check if user can access earnings data
function canAccessEarnings(
  req: AuthRequest,
  targetUserId?: string,
  targetManagerId?: string
): boolean {
  const user = req.user;
  if (!user) return false;

  // Super Admin can access all
  if (user.role === UserRole.SUPER_ADMIN) return true;

  // HEAD_DISTRIBUTION can access their own team data
  if (user.role === UserRole.HEAD_DISTRIBUTION) {
    // Accessing own data
    if (targetUserId && targetUserId === user.id) return true;
    // Accessing their team's data (they are the manager)
    if (targetManagerId && targetManagerId === user.id) return true;
    return false;
  }

  // Normal users can only access their own data (but not commission percentages)
  if (targetUserId && targetUserId === user.id) return true;

  return false;
}

export async function getAllMonthlyTargets(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const isAdmin = hasAdminAccess(req);
    const isHeadDistribution = req.user?.role === "HEAD_DISTRIBUTION";

    // Allow Admin and HEAD_DISTRIBUTION
    if (!isAdmin && !isHeadDistribution) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const filters: any = {};
    if (req.query.month) filters.month = req.query.month as string;
    if (req.query.managerId) filters.managerId = req.query.managerId as string;

    // HEAD_DISTRIBUTION can only see their own targets
    if (isHeadDistribution && !isAdmin && req.user?.id) {
      filters.managerId = req.user.id;
    }

    const targets = await inventoryService.getAllMonthlyTargets(filters);
    res.json({ success: true, data: targets });
  } catch (error) {
    console.error("Get monthly targets error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch monthly targets" });
  }
}

export async function upsertMonthlyTarget(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const data = req.body;
    if (!data.month || !data.managerId) {
      res
        .status(400)
        .json({ success: false, message: "Month and Manager ID are required" });
      return;
    }

    // Check permissions:
    // - Admin can set teamTargetAmount
    // - HEAD_DISTRIBUTION can only set teamDistributionPool for their own team
    const isAdmin = hasAdminAccess(req);
    const isHeadDistribution = req.user?.role === "HEAD_DISTRIBUTION";

    if (!isAdmin && !isHeadDistribution) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    // HEAD_DISTRIBUTION can only update their own team's distribution pool
    if (isHeadDistribution) {
      if (!req.user?.id || data.managerId !== req.user.id) {
        res.status(403).json({
          success: false,
          message: "You can only update your own team's settings",
        });
        return;
      }
      // HEAD_DISTRIBUTION cannot set teamTargetAmount - that's admin only
      if (data.teamTargetAmount !== undefined) {
        delete data.teamTargetAmount;
      }
    }

    const target = await inventoryService.upsertMonthlyTarget(data);
    if (!target) {
      res
        .status(500)
        .json({ success: false, message: "Failed to save monthly target" });
      return;
    }

    res.json({ success: true, data: target });
  } catch (error) {
    console.error("Upsert monthly target error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to save monthly target" });
  }
}

export async function getTeamEarnings(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // Only Super Admin can see all team earnings
    if (!hasAdminAccess(req)) {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    const filters: any = {};
    if (req.query.month) filters.month = req.query.month as string;
    if (req.query.managerId) filters.managerId = req.query.managerId as string;
    if (req.query.userId) filters.userId = req.query.userId as string;

    const earnings = await inventoryService.getTeamEarnings(filters);
    res.json({ success: true, data: earnings });
  } catch (error) {
    console.error("Get team earnings error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch team earnings" });
  }
}

export async function getUserEarnings(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { userId } = req.params;
    const user = req.user;

    // Only HEAD_DISTRIBUTION and Super Admin can see earnings data
    if (
      !user ||
      (user.role !== UserRole.SUPER_ADMIN &&
        user.role !== UserRole.HEAD_DISTRIBUTION)
    ) {
      res.status(403).json({
        success: false,
        message: "Access denied. HEAD_DISTRIBUTION or Super Admin required.",
      });
      return;
    }

    // Check access - manager can see team, admin sees all
    if (!canAccessEarnings(req, userId)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const earnings = await inventoryService.getUserEarnings(userId);
    res.json({ success: true, data: earnings });
  } catch (error) {
    console.error("Get user earnings error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch user earnings" });
  }
}

export async function getMyEarnings(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
      return;
    }

    // Only HEAD_DISTRIBUTION and Super Admin can see earnings data
    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.HEAD_DISTRIBUTION
    ) {
      res.status(403).json({
        success: false,
        message: "Access denied. HEAD_DISTRIBUTION or Super Admin required.",
      });
      return;
    }

    const earnings = await inventoryService.getUserEarnings(user.id);
    res.json({ success: true, data: earnings });
  } catch (error) {
    console.error("Get my earnings error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch earnings" });
  }
}

export async function getManagerTeamEarnings(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { managerId } = req.params;
    const month = req.query.month as string;

    // Check access - manager can see own team, admin sees all
    if (!canAccessEarnings(req, undefined, managerId)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    if (!month) {
      res.status(400).json({ success: false, message: "Month is required" });
      return;
    }

    const data = await inventoryService.getManagerTeamEarnings(
      managerId,
      month
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error("Get manager team earnings error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch team earnings" });
  }
}

export async function getMyTeamEarnings(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
      return;
    }

    // Only HEAD_DISTRIBUTION can access this (their own team) or Super Admin
    if (
      user.role !== UserRole.HEAD_DISTRIBUTION &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      res.status(403).json({
        success: false,
        message: "HEAD_DISTRIBUTION or Super Admin access required",
      });
      return;
    }

    const month = req.query.month as string;
    if (!month) {
      res.status(400).json({ success: false, message: "Month is required" });
      return;
    }

    const data = await inventoryService.getManagerTeamEarnings(user.id, month);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Get my team earnings error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch team earnings" });
  }
}

export async function upsertTeamEarning(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
      return;
    }

    // Only HEAD_DISTRIBUTION (for own team) or Super Admin can set earnings
    const data = req.body;

    if (user.role === UserRole.HEAD_DISTRIBUTION) {
      // HEAD_DISTRIBUTION can only set for their own team
      if (data.managerId !== user.id) {
        res.status(403).json({
          success: false,
          message: "Can only set earnings for your own team",
        });
        return;
      }
    } else if (user.role !== UserRole.SUPER_ADMIN) {
      res.status(403).json({
        success: false,
        message: "HEAD_DISTRIBUTION or Super Admin access required",
      });
      return;
    }

    if (!data.userId || !data.month) {
      res
        .status(400)
        .json({ success: false, message: "User ID and Month are required" });
      return;
    }

    const earning = await inventoryService.upsertTeamEarning(data);
    if (!earning) {
      res
        .status(500)
        .json({ success: false, message: "Failed to save team earning" });
      return;
    }

    res.json({ success: true, data: earning });
  } catch (error) {
    console.error("Upsert team earning error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to save team earning" });
  }
}

export async function calculateAndReleaseEarnings(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
      return;
    }

    const { managerId, month } = req.body;

    // Only HEAD_DISTRIBUTION (for own team) or Super Admin can release earnings
    if (user.role === UserRole.HEAD_DISTRIBUTION) {
      if (managerId !== user.id) {
        res.status(403).json({
          success: false,
          message: "Can only release earnings for your own team",
        });
        return;
      }
    } else if (user.role !== UserRole.SUPER_ADMIN) {
      res.status(403).json({
        success: false,
        message: "HEAD_DISTRIBUTION or Super Admin access required",
      });
      return;
    }

    if (!managerId || !month) {
      res
        .status(400)
        .json({ success: false, message: "Manager ID and Month are required" });
      return;
    }

    const result = await inventoryService.calculateAndReleaseEarnings(
      managerId,
      month
    );

    if (!result) {
      res.status(400).json({
        success: false,
        message: "Failed to release earnings. Team target may not be met.",
      });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Calculate and release earnings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate and release earnings",
    });
  }
}

export async function getDashboardStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const orders = await googleSheets.getAllOrders();
    const regularOrders = orders || [];
    const recentOrders = [...regularOrders].sort(
      (a: any, b: any) => getOrderTimestamp(b) - getOrderTimestamp(a)
    );

    const totalRevenue = regularOrders
      .filter((o: any) => o.paymentStatus === PaymentStatus.VERIFIED)
      .reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0);

    const totalProductsSold = regularOrders
      .filter((o: any) => o.paymentStatus === PaymentStatus.VERIFIED)
      .reduce((sum: number, o: any) => {
        const products = o.products || o.skuBreakdown || [];
        return (
          sum +
          products.reduce(
            (pSum: number, p: any) => pSum + Number(p.quantity || 0),
            0
          )
        );
      }, 0);

    res.json({
      success: true,
      data: {
        totalOrders: regularOrders.length,
        pendingPayment: regularOrders.filter(
          (o: any) =>
            o.paymentStatus === PaymentStatus.PENDING ||
            o.paymentStatus === PaymentStatus.QR_SHARED
        ).length,
        paidOrders: regularOrders.filter(
          (o: any) => o.paymentStatus === PaymentStatus.VERIFIED
        ).length,
        inTransit: regularOrders.filter(
          (o: any) => o.orderStatus === OrderStatus.SHIPPED
        ).length,
        delivered: regularOrders.filter(
          (o: any) => o.orderStatus === OrderStatus.DELIVERED
        ).length,
        totalRevenue,
        totalProductsSold,
        recentOrders: recentOrders.slice(0, 10),
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getOrderAnalytics(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    // Placeholder implementation
    res.json({
      success: true,
      data: {
        orderTrends: [],
        ordersByStatus: {},
        ordersByRegion: {},
      },
    });
  } catch (error) {
    console.error("Get order analytics error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getSalesAnalytics(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    // Placeholder implementation
    res.json({
      success: true,
      data: {
        salesTrends: [],
        topProducts: [],
        salesByRegion: {},
      },
    });
  } catch (error) {
    console.error("Get sales analytics error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getRevenueAnalytics(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    // Placeholder implementation
    res.json({
      success: true,
      data: {
        revenueTrends: [],
        revenueByProduct: {},
        profitMargins: {},
      },
    });
  } catch (error) {
    console.error("Get revenue analytics error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getTeamDistribution(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    // Placeholder implementation
    res.json({
      success: true,
      data: {
        teamMembers: [],
        regions: {},
        hierarchy: {},
      },
    });
  } catch (error) {
    console.error("Get team distribution error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getTeamPerformance(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    // Placeholder implementation
    res.json({
      success: true,
      data: {
        performanceMetrics: [],
        teamTargets: {},
        achievements: {},
      },
    });
  } catch (error) {
    console.error("Get team performance error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export default {
  getUnitEconomics,
  updateUnitEconomics,
  getAllCompetitors,
  createCompetitor,
  updateCompetitor,
  deleteCompetitor,
  getCompetitorHistory,
  getCompetitorVersion,
  revertCompetitor,
  getAllCommissionSettings,
  getCommissionSettingsByUserId,
  upsertCommissionSettings,
  bulkUpdateCommissionSettings,
  deleteCommissionSettings,
  getManagerDistributions,
  getTeamMembersForCommission,
  // Monthly Targets & Team Earnings
  getAllMonthlyTargets,
  upsertMonthlyTarget,
  getTeamEarnings,
  getUserEarnings,
  getMyEarnings,
  getManagerTeamEarnings,
  getMyTeamEarnings,
  upsertTeamEarning,
  calculateAndReleaseEarnings,
  // Dashboard & Analytics
  getDashboardStats,
  getOrderAnalytics,
  getSalesAnalytics,
  getRevenueAnalytics,
  getTeamDistribution,
  getTeamPerformance,
};
