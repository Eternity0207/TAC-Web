import { Response } from "express";
import googleSheets from "../services/googleSheets";
import { AuthRequest } from "../middleware/auth";
import { UserRole, PaymentStatus, Order } from "../types";

// Check if user is a sales person
function isSalesUser(req: AuthRequest): boolean {
  return req.user?.role === UserRole.SALES;
}

// Check if user is a manager (Head of Distribution)
function isManager(req: AuthRequest): boolean {
  return req.user?.role === UserRole.HEAD_DISTRIBUTION;
}

// Check if user has admin access
function hasAdminAccess(req: AuthRequest): boolean {
  return (
    req.user?.role === UserRole.SUPER_ADMIN || req.user?.role === UserRole.ADMIN
  );
}

/**
 * Get personal referral statistics for sales user
 */
export async function getMyReferralStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const userId = req.user.id;
    const allOrders = await googleSheets.getAllOrders();

    // Filter orders by referral
    const myOrders = allOrders.filter(
      (o) => o.referredBy === userId || o.referredBy === req.user?.name
    );
    const paidOrders = myOrders.filter(
      (o) => o.paymentStatus === PaymentStatus.VERIFIED
    );

    // Calculate stats
    const totalOrders = myOrders.length;
    const totalPaidOrders = paidOrders.length;
    const totalRevenue = paidOrders.reduce(
      (sum, o) => sum + (o.totalAmount || 0),
      0
    );
    const totalShippingAmount = paidOrders.reduce(
      (sum, o) => sum + (o.shippingAmount || 0),
      0
    );
    const productRevenue = totalRevenue - totalShippingAmount;
    const pendingOrders = myOrders.filter(
      (o) => o.paymentStatus !== PaymentStatus.VERIFIED
    ).length;

    // SKU breakdown
    const skuStats = new Map<string, { quantity: number; revenue: number }>();
    paidOrders.forEach((order) => {
      (order.products || []).forEach((product: any) => {
        const existing = skuStats.get(product.name) || {
          quantity: 0,
          revenue: 0,
        };
        skuStats.set(product.name, {
          quantity: existing.quantity + (product.quantity || 0),
          revenue: existing.revenue + (product.totalPrice || 0),
        });
      });
    });

    res.json({
      success: true,
      data: {
        totalOrders,
        totalPaidOrders,
        totalRevenue,
        totalShippingAmount,
        productRevenue,
        pendingOrders,
        conversionRate:
          totalOrders > 0
            ? Math.round((totalPaidOrders / totalOrders) * 100)
            : 0,
        skuBreakdown: Array.from(skuStats.entries()).map(([name, stats]) => ({
          skuName: name,
          ...stats,
        })),
        recentOrders: myOrders.slice(0, 10),
      },
    });
  } catch (error) {
    console.error("Get my referral stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
}

/**
 * Get team statistics for manager
 */
export async function getTeamStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!isManager(req) && !hasAdminAccess(req)) {
      res.status(403).json({
        success: false,
        message: "HEAD_DISTRIBUTION or Admin access required",
      });
      return;
    }

    const managerId = req.user?.id;

    // Get team members
    const allUsers = await googleSheets.getAllAdminUsers();
    const teamMembers = allUsers.filter(
      (u) =>
        u.managerId === managerId ||
        (hasAdminAccess(req) && u.role === UserRole.SALES)
    );

    // Get all orders
    const allOrders = await googleSheets.getAllOrders();

    // Calculate stats for each team member
    const teamStats = teamMembers.map((member) => {
      const memberOrders = allOrders.filter(
        (o) => o.referredBy === member.id || o.referredBy === member.name
      );
      const paidOrders = memberOrders.filter(
        (o) => o.paymentStatus === PaymentStatus.VERIFIED
      );

      return {
        userId: member.id,
        name: member.name,
        email: member.email,
        totalOrders: memberOrders.length,
        paidOrders: paidOrders.length,
        revenue: paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        targets: member.salesTargets || [],
      };
    });

    // Overall team stats
    const totalTeamOrders = teamStats.reduce(
      (sum, m) => sum + m.totalOrders,
      0
    );
    const totalTeamRevenue = teamStats.reduce((sum, m) => sum + m.revenue, 0);

    res.json({
      success: true,
      data: {
        teamSize: teamMembers.length,
        totalOrders: totalTeamOrders,
        totalRevenue: totalTeamRevenue,
        members: teamStats,
      },
    });
  } catch (error) {
    console.error("Get team stats error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch team stats" });
  }
}

/**
 * Get all users' sales statistics (Admin and HEAD_DISTRIBUTION)
 */
export async function getAllUserStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // Allow Admin and HEAD_DISTRIBUTION to access all user stats
    if (!hasAdminAccess(req) && !isManager(req)) {
      res.status(403).json({
        success: false,
        message: "Admin or HEAD_DISTRIBUTION access required",
      });
      return;
    }

    const allUsers = await googleSheets.getAllAdminUsers();
    const regularOrders = await googleSheets.getAllOrders();
    const bulkOrdersData = await googleSheets.getAllBulkOrders();

    // Mark regular orders as retail and bulk orders as bulk, then combine
    const allOrders = [
      ...regularOrders.map((o) => ({ ...o, isBulkOrder: false })),
      ...bulkOrdersData.map((o: any) => ({ ...o, isBulkOrder: true })),
    ];

    const userStats = allUsers.map((user) => {
      const userOrders = allOrders.filter(
        (o) => o.referredBy === user.id || o.referredBy === user.name
      );
      const paidOrders = userOrders.filter(
        (o: any) =>
          o.paymentStatus === PaymentStatus.VERIFIED ||
          o.paymentStatus === "PAID"
      );

      // Separate bulk and retail orders
      const bulkOrders = paidOrders.filter((o: any) => o.isBulkOrder === true);
      const retailOrders = paidOrders.filter(
        (o: any) => o.isBulkOrder !== true
      );

      // Calculate total amounts
      const totalRevenue = paidOrders.reduce(
        (sum, o) => sum + (o.totalAmount || 0),
        0
      );
      const totalShippingAmount = paidOrders.reduce(
        (sum, o) => sum + (o.shippingAmount || 0),
        0
      );
      const productRevenue = totalRevenue - totalShippingAmount;

      // Helper function to calculate SKU stats for a set of orders
      const calculateSkuStats = (orders: any[]) => {
        const skuStats = new Map<
          string,
          { quantity: number; revenue: number }
        >();
        let totalQty = 0;
        let totalRev = 0;
        orders.forEach((order) => {
          (order.products || []).forEach((product: any) => {
            const productKey = (product.name || "").toLowerCase().trim();
            const qty = product.quantity || 0;
            const rev = product.totalPrice || 0;
            totalQty += qty;
            totalRev += rev;
            const existing = skuStats.get(productKey) || {
              quantity: 0,
              revenue: 0,
            };
            skuStats.set(productKey, {
              quantity: existing.quantity + qty,
              revenue: existing.revenue + rev,
            });
          });
        });
        return { skuStats, totalQuantity: totalQty, totalRevenue: totalRev };
      };

      // Calculate stats for all orders, bulk only, and retail only
      const allStats = calculateSkuStats(paidOrders);
      const bulkStats = calculateSkuStats(bulkOrders);
      const retailStats = calculateSkuStats(retailOrders);

      // Store original names for display
      const skuDisplayNames = new Map<string, string>();
      paidOrders.forEach((order) => {
        (order.products || []).forEach((product: any) => {
          const productKey = (product.name || "").toLowerCase().trim();
          if (!skuDisplayNames.has(productKey)) {
            skuDisplayNames.set(productKey, product.name || "");
          }
        });
      });

      // Calculate achieved amounts for targets based on order type
      const targetsWithProgress = (user.salesTargets || []).map(
        (target: any) => {
          const targetKey = (target.skuName || "").toLowerCase().trim();
          const isAllProducts = targetKey === "all products";
          const orderType = target.orderType || "ALL";

          // Select the right stats based on order type
          let stats: ReturnType<typeof calculateSkuStats>;
          if (orderType === "BULK") {
            stats = bulkStats;
          } else if (orderType === "RETAIL") {
            stats = retailStats;
          } else {
            stats = allStats;
          }

          const matchedStats = stats.skuStats.get(targetKey);
          return {
            ...target,
            achievedQuantity: isAllProducts
              ? stats.totalQuantity
              : matchedStats?.quantity || 0,
            achievedAmount: isAllProducts
              ? stats.totalRevenue
              : matchedStats?.revenue || 0,
          };
        }
      );

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        managerId: user.managerId || "", // Include managerId for team grouping
        totalOrders: userOrders.length,
        paidOrders: paidOrders.length,
        bulkOrders: bulkOrders.length,
        retailOrders: retailOrders.length,
        revenue: totalRevenue,
        productRevenue: productRevenue,
        shippingAmount: totalShippingAmount,
        targets: targetsWithProgress,
        skuBreakdown: Array.from(allStats.skuStats.entries()).map(
          ([key, stats]) => ({
            skuName: skuDisplayNames.get(key) || key,
            ...stats,
          })
        ),
      };
    });

    // Filter to show only users with sales or with orders (exclude SUPER_ADMIN as they are not part of the team)
    const usersWithActivity = userStats.filter(
      (u) =>
        u.role !== UserRole.SUPER_ADMIN &&
        (u.role === UserRole.SALES ||
          u.role === UserRole.HEAD_DISTRIBUTION ||
          u.totalOrders > 0)
    );

    // Calculate team totals (sum of all team members' orders, not all orders)
    const teamTotalOrders = usersWithActivity.reduce(
      (sum, u) => sum + u.totalOrders,
      0
    );
    const teamTotalRevenue = usersWithActivity.reduce(
      (sum, u) => sum + u.revenue,
      0
    );

    res.json({
      success: true,
      data: {
        totalUsers: usersWithActivity.length,
        totalOrders: teamTotalOrders,
        totalRevenue: teamTotalRevenue,
        users: usersWithActivity,
      },
    });
  } catch (error) {
    console.error("Get all user stats error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch user stats" });
  }
}

/**
 * Get SKU sales data breakdown for a specific user
 */
export async function getSKUSalesData(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!hasAdminAccess(req) && !isManager(req)) {
      // Sales users can only see their own data
      if (!isSalesUser(req) || req.params.userId !== req.user?.id) {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }
    }

    const { userId } = req.params;
    const { period } = req.query; // e.g., "2026-01" for monthly

    const allOrders = await googleSheets.getAllOrders();
    const user = await googleSheets.getAdminById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Filter orders by user and optional period
    let userOrders = allOrders.filter(
      (o) => o.referredBy === user.id || o.referredBy === user.name
    );

    if (period) {
      const periodStr = period as string;
      userOrders = userOrders.filter((o) => {
        const orderDate = new Date(o.createdAt);
        const orderPeriod = `${orderDate.getFullYear()}-${String(
          orderDate.getMonth() + 1
        ).padStart(2, "0")}`;
        return orderPeriod === periodStr;
      });
    }

    const paidOrders = userOrders.filter(
      (o) => o.paymentStatus === PaymentStatus.VERIFIED
    );

    // Calculate SKU breakdown
    const skuStats = new Map<
      string,
      {
        quantity: number;
        revenue: number;
        orders: number;
        avgOrderValue: number;
      }
    >();

    paidOrders.forEach((order) => {
      (order.products || []).forEach((product: any) => {
        const existing = skuStats.get(product.name) || {
          quantity: 0,
          revenue: 0,
          orders: 0,
          avgOrderValue: 0,
        };
        skuStats.set(product.name, {
          quantity: existing.quantity + (product.quantity || 0),
          revenue: existing.revenue + (product.totalPrice || 0),
          orders: existing.orders + 1,
          avgOrderValue: 0, // Calculated below
        });
      });
    });

    // Calculate averages
    skuStats.forEach((stats, name) => {
      stats.avgOrderValue =
        stats.orders > 0 ? Math.round(stats.revenue / stats.orders) : 0;
    });

    res.json({
      success: true,
      data: {
        userId: user.id,
        userName: user.name,
        period: period || "all-time",
        totalOrders: userOrders.length,
        paidOrders: paidOrders.length,
        totalRevenue: paidOrders.reduce(
          (sum, o) => sum + (o.totalAmount || 0),
          0
        ),
        skuBreakdown: Array.from(skuStats.entries()).map(([name, stats]) => ({
          skuName: name,
          ...stats,
        })),
        targets: user.salesTargets || [],
      },
    });
  } catch (error) {
    console.error("Get SKU sales data error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch SKU data" });
  }
}

/**
 * Set sales targets for a user (Admin/Manager only)
 */
export async function setUserTargets(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!hasAdminAccess(req) && !isManager(req)) {
      res.status(403).json({
        success: false,
        message: "Admin or HEAD_DISTRIBUTION access required",
      });
      return;
    }

    const { userId } = req.params;
    const { targets } = req.body;

    if (!targets || !Array.isArray(targets)) {
      res
        .status(400)
        .json({ success: false, message: "Targets array required" });
      return;
    }

    // If manager, verify they can only set targets for their team
    if (isManager(req) && !hasAdminAccess(req)) {
      const targetUser = await googleSheets.getAdminById(userId);
      if (!targetUser || targetUser.managerId !== req.user?.id) {
        res.status(403).json({
          success: false,
          message: "Can only set targets for your team members",
        });
        return;
      }
    }

    const updated = await googleSheets.updateAdminUser(userId, {
      salesTargets: targets,
    });

    if (!updated) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.json({
      success: true,
      message: "Targets updated",
      data: { userId, targets },
    });
  } catch (error) {
    console.error("Set user targets error:", error);
    res.status(500).json({ success: false, message: "Failed to set targets" });
  }
}

/**
 * Get orders for a sales user (only their referrals)
 */
export async function getMyOrders(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const userId = req.user.id;
    const allOrders = await googleSheets.getAllOrders();

    // Sales users only see their referrals
    const myOrders = allOrders.filter(
      (o) => o.referredBy === userId || o.referredBy === req.user?.name
    );

    res.json({
      success: true,
      data: { orders: myOrders, total: myOrders.length },
    });
  } catch (error) {
    console.error("Get my orders error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
}

export async function getAllSales(
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
        sales: [],
        total: 0,
        revenue: 0,
      },
    });
  } catch (error) {
    console.error("Get all sales error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getSalesPerformance(
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
        performance: [],
        metrics: {},
        trends: [],
      },
    });
  } catch (error) {
    console.error("Get sales performance error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getSalesTargets(
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
        targets: [],
        achieved: {},
        pending: {},
      },
    });
  } catch (error) {
    console.error("Get sales targets error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function updateSalesTargets(
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
      message: "Sales targets updated successfully",
    });
  } catch (error) {
    console.error("Update sales targets error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getSalesEnquiries(
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
        enquiries: [],
        total: 0,
      },
    });
  } catch (error) {
    console.error("Get sales enquiries error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function createSalesEnquiry(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    // Placeholder implementation
    res.status(201).json({
      success: true,
      message: "Sales enquiry created successfully",
      data: { id: "temp-id" },
    });
  } catch (error) {
    console.error("Create sales enquiry error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function updateSalesEnquiry(
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
      message: "Sales enquiry updated successfully",
    });
  } catch (error) {
    console.error("Update sales enquiry error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function deleteSalesEnquiry(
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
      message: "Sales enquiry deleted successfully",
    });
  } catch (error) {
    console.error("Delete sales enquiry error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getMonthlyTargets(
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
        targets: [],
        achievements: {},
      },
    });
  } catch (error) {
    console.error("Get monthly targets error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function updateMonthlyTargets(
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
      message: "Monthly targets updated successfully",
    });
  } catch (error) {
    console.error("Update monthly targets error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export default {
  getMyReferralStats,
  getTeamStats,
  getAllUserStats,
  getSKUSalesData,
  setUserTargets,
  getMyOrders,
  getAllSales,
  getSalesPerformance,
  getSalesTargets,
  updateSalesTargets,
  getSalesEnquiries,
  createSalesEnquiry,
  updateSalesEnquiry,
  deleteSalesEnquiry,
  getMonthlyTargets,
  updateMonthlyTargets,
};
