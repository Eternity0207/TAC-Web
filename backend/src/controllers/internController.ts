import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { UserRole } from "../types";
import * as sheets from "../services/googleSheets";

// Check if user can access intern features
function canAccessIntern(req: AuthRequest): boolean {
    const role = req.user?.role;
    return role === UserRole.INTERN || role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
}

// ============================================================
// ANALYTICS (Graph data only - no numbers)
// ============================================================

export async function getInternAnalytics(
    req: AuthRequest,
    res: Response
): Promise<void> {
    try {
        if (!canAccessIntern(req)) {
            res.status(403).json({ success: false, message: "Insufficient permissions" });
            return;
        }

        // Fetch all orders to compute daily stats
        const orders = await sheets.getAllOrders();
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Build daily data for last 30 days
        const dailyMap: Record<string, { orders: number; revenue: number }> = {};

        // Initialize all 30 days
        for (let i = 0; i < 30; i++) {
            const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
            const key = date.toISOString().split("T")[0]; // YYYY-MM-DD
            dailyMap[key] = { orders: 0, revenue: 0 };
        }

        // Populate with actual order data
        for (const order of orders) {
            const orderDate = new Date(order.createdAt).toISOString().split("T")[0];
            if (dailyMap[orderDate] !== undefined) {
                dailyMap[orderDate].orders += 1;
                dailyMap[orderDate].revenue += order.totalAmount || 0;
            }
        }

        // Convert to sorted arrays for the chart
        const sortedDates = Object.keys(dailyMap).sort();
        const dailyOrders = sortedDates.map((date) => ({
            date,
            label: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
            value: dailyMap[date].orders,
        }));
        const dailyRevenue = sortedDates.map((date) => ({
            date,
            label: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
            value: dailyMap[date].revenue,
        }));

        res.json({
            success: true,
            data: { dailyOrders, dailyRevenue },
        });
    } catch (error: any) {
        console.error("Intern analytics error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}

// ============================================================
// DAILY REPORTS
// ============================================================

export async function submitDailyReport(
    req: AuthRequest,
    res: Response
): Promise<void> {
    try {
        if (!canAccessIntern(req)) {
            res.status(403).json({ success: false, message: "Insufficient permissions" });
            return;
        }

        const { whatDid, whatToDoNext, thingsRequired } = req.body;

        if (!whatDid && !whatToDoNext && !thingsRequired) {
            res.status(400).json({ success: false, message: "At least one field is required" });
            return;
        }

        const report = await sheets.createDailyReport({
            userId: req.user!.id,
            userName: req.user!.name || req.user!.email,
            whatDid: whatDid || "",
            whatToDoNext: whatToDoNext || "",
            thingsRequired: thingsRequired || "",
        });

        res.json({ success: true, data: report });
    } catch (error: any) {
        console.error("Submit daily report error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function getDailyReports(
    req: AuthRequest,
    res: Response
): Promise<void> {
    try {
        if (!canAccessIntern(req)) {
            res.status(403).json({ success: false, message: "Insufficient permissions" });
            return;
        }

        const allReports = await sheets.getAllDailyReports();

        // Interns see only their own reports; admins see all
        const role = req.user?.role;
        const isAdminRole = role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
        const reports = isAdminRole
            ? allReports
            : allReports.filter((r) => r.userId === req.user!.id);

        // Sort newest first
        reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json({ success: true, data: reports });
    } catch (error: any) {
        console.error("Get daily reports error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}

// ============================================================
// SALES ENQUIRIES
// ============================================================

export async function createSalesEnquiry(
    req: AuthRequest,
    res: Response
): Promise<void> {
    try {
        if (!canAccessIntern(req)) {
            res.status(403).json({ success: false, message: "Insufficient permissions" });
            return;
        }

        const { personName, email, address, phone, description, orders, paymentMode, anyCredits, location, time } = req.body;

        if (!personName) {
            res.status(400).json({ success: false, message: "Person Name is required" });
            return;
        }

        const enquiry = await sheets.createSalesEnquiry({
            createdBy: req.user!.id,
            createdByName: req.user!.name || req.user!.email,
            personName,
            email: email || "",
            address: address || "",
            phone: phone || "",
            description: description || "",
            orders: orders || "",
            paymentMode: paymentMode || "",
            anyCredits: anyCredits || "",
            location: location || "",
            time: time || "",
        });

        res.json({ success: true, data: enquiry });
    } catch (error: any) {
        console.error("Create sales enquiry error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function getSalesEnquiries(
    req: AuthRequest,
    res: Response
): Promise<void> {
    try {
        if (!canAccessIntern(req)) {
            res.status(403).json({ success: false, message: "Insufficient permissions" });
            return;
        }

        const allEnquiries = await sheets.getAllSalesEnquiries();

        // Interns see only their own; admins see all
        const role = req.user?.role;
        const isAdminRole = role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
        const enquiries = isAdminRole
            ? allEnquiries
            : allEnquiries.filter((e) => e.createdBy === req.user!.id);

        // Sort newest first
        enquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json({ success: true, data: enquiries });
    } catch (error: any) {
        console.error("Get sales enquiries error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function updateSalesEnquiry(
    req: AuthRequest,
    res: Response
): Promise<void> {
    try {
        if (!canAccessIntern(req)) {
            res.status(403).json({ success: false, message: "Insufficient permissions" });
            return;
        }

        const { id } = req.params;
        const updates = req.body;

        const enquiry = await sheets.updateSalesEnquiry(id, updates);
        if (!enquiry) {
            res.status(404).json({ success: false, message: "Sales enquiry not found" });
            return;
        }

        res.json({ success: true, data: enquiry });
    } catch (error: any) {
        console.error("Update sales enquiry error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}

// Get all interns
export async function getAllInterns(req: AuthRequest, res: Response): Promise<void> {
    try {
        // TODO: Implement getAllInterns method in googleSheets service
        // const interns = await sheets.getAllInterns();
        const interns: any[] = [];

        res.json({
            success: true,
            data: interns || []
        });
    } catch (error: any) {
        console.error("Get all interns error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}
