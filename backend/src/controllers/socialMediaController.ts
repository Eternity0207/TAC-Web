import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import socialMediaService from "../services/socialMediaService";
import supabase from "../services/supabase";

// Get all social media stats (from cache in Sheets)
export async function getStats(
    req: AuthRequest,
    res: Response
): Promise<void> {
    try {
        const stats = await supabase.getSocialMediaStats();
        res.json({ success: true, data: stats });
    } catch (error: any) {
        console.error("Get social media stats error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch stats" });
    }
}

// Manually trigger refresh (for testing or manual update)
export async function refreshStats(
    req: AuthRequest,
    res: Response
): Promise<void> {
    try {
        const stats = await socialMediaService.fetchAllSocialMediaStats();

        if (stats.length === 0) {
            res.status(400).json({
                success: false,
                message: "No stats fetched. Check Meta API credentials.",
            });
            return;
        }

        // Save to Google Sheets
        for (const stat of stats) {
            await supabase.saveSocialMediaStat(stat);
        }

        res.json({
            success: true,
            message: `Refreshed ${stats.length} platform(s)`,
            data: stats,
        });
    } catch (error: any) {
        console.error("Refresh social media stats error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// Get stats summary for dashboard
export async function getSummary(
    req: AuthRequest,
    res: Response
): Promise<void> {
    try {
        const stats = await supabase.getSocialMediaStats();

        // Get latest stats per platform
        const latestByPlatform: { [key: string]: any } = {};
        stats.forEach((stat: any) => {
            const platform = stat.platform;
            if (!latestByPlatform[platform] || stat.date > latestByPlatform[platform].date) {
                latestByPlatform[platform] = stat;
            }
        });

        // Calculate totals
        const summary = {
            totalFollowers: Object.values(latestByPlatform).reduce(
                (sum: number, s: any) => sum + (s.followers || 0), 0
            ),
            totalReach: Object.values(latestByPlatform).reduce(
                (sum: number, s: any) => sum + (s.reach || 0), 0
            ),
            totalImpressions: Object.values(latestByPlatform).reduce(
                (sum: number, s: any) => sum + (s.impressions || 0), 0
            ),
            totalEngagement: Object.values(latestByPlatform).reduce(
                (sum: number, s: any) => sum + (s.engagement || 0), 0
            ),
            platforms: latestByPlatform,
            lastUpdated: Object.values(latestByPlatform)[0]?.date || null,
        };

        res.json({ success: true, data: summary });
    } catch (error: any) {
        console.error("Get social summary error:", error);
        res.status(500).json({ success: false, message: "Failed to get summary" });
    }
}

// Get historical data for charts
export async function getHistory(
    req: AuthRequest,
    res: Response
): Promise<void> {
    try {
        const { platform, days = 30 } = req.query;
        let stats = await supabase.getSocialMediaStats();

        // Filter by platform if specified
        if (platform) {
            stats = stats.filter((s: any) => s.platform === platform);
        }

        // Sort by date descending and limit
        stats.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        stats = stats.slice(0, parseInt(days as string, 10));

        res.json({ success: true, data: stats });
    } catch (error: any) {
        console.error("Get social history error:", error);
        res.status(500).json({ success: false, message: "Failed to get history" });
    }
}

// Get social media analytics (alias for getStats)
export async function getSocialMediaAnalytics(req: AuthRequest, res: Response): Promise<void> {
    return getStats(req, res);
}

export default {
    getStats,
    refreshStats,
    getSummary,
    getHistory,
    getSocialMediaAnalytics,
};
