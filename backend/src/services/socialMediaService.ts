import axios from "axios";
import { config } from "../config";

const META_GRAPH_URL = "https://graph.facebook.com/v18.0";

interface SocialMediaStats {
    date: string;
    platform: "instagram" | "facebook";
    followers: number;
    reach: number;
    impressions: number;
    engagement: number;
}

interface MetaInsightsResponse {
    data: Array<{
        name: string;
        period: string;
        values: Array<{ value: number; end_time?: string }>;
    }>;
}

// Get Instagram Business Account ID from Facebook Page
async function getInstagramBusinessAccountId(
    pageId: string,
    accessToken: string
): Promise<string | null> {
    try {
        const response = await axios.get(
            `${META_GRAPH_URL}/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
        );
        return response.data.instagram_business_account?.id || null;
    } catch (error) {
        console.error("Error getting Instagram Business Account ID:", error);
        return null;
    }
}

// Fetch Instagram Insights
async function fetchInstagramInsights(
    igAccountId: string,
    accessToken: string
): Promise<SocialMediaStats | null> {
    try {
        // Get follower count
        const accountResponse = await axios.get(
            `${META_GRAPH_URL}/${igAccountId}?fields=followers_count&access_token=${accessToken}`
        );
        const followers = accountResponse.data.followers_count || 0;

        // Get insights (reach, impressions)
        const insightsResponse = await axios.get<MetaInsightsResponse>(
            `${META_GRAPH_URL}/${igAccountId}/insights?metric=reach,impressions,accounts_engaged&period=day&access_token=${accessToken}`
        );

        let reach = 0;
        let impressions = 0;
        let engagement = 0;

        insightsResponse.data.data.forEach((metric) => {
            const value = metric.values[0]?.value || 0;
            if (metric.name === "reach") reach = value;
            if (metric.name === "impressions") impressions = value;
            if (metric.name === "accounts_engaged") engagement = value;
        });

        return {
            date: new Date().toISOString().split("T")[0],
            platform: "instagram",
            followers,
            reach,
            impressions,
            engagement,
        };
    } catch (error: any) {
        console.error("Error fetching Instagram insights:", error.response?.data || error.message);
        return null;
    }
}

// Fetch Facebook Page Insights
async function fetchFacebookInsights(
    pageId: string,
    accessToken: string
): Promise<SocialMediaStats | null> {
    try {
        // Get page info
        const pageResponse = await axios.get(
            `${META_GRAPH_URL}/${pageId}?fields=followers_count,fan_count&access_token=${accessToken}`
        );
        const followers = pageResponse.data.followers_count || pageResponse.data.fan_count || 0;

        // Get insights
        const insightsResponse = await axios.get<MetaInsightsResponse>(
            `${META_GRAPH_URL}/${pageId}/insights?metric=page_impressions,page_post_engagements,page_fans&period=day&access_token=${accessToken}`
        );

        let reach = 0;
        let impressions = 0;
        let engagement = 0;

        insightsResponse.data.data.forEach((metric) => {
            const value = metric.values[0]?.value || 0;
            if (metric.name === "page_impressions") {
                impressions = value;
                reach = value; // Using impressions as reach approximation
            }
            if (metric.name === "page_post_engagements") engagement = value;
        });

        return {
            date: new Date().toISOString().split("T")[0],
            platform: "facebook",
            followers,
            reach,
            impressions,
            engagement,
        };
    } catch (error: any) {
        console.error("Error fetching Facebook insights:", error.response?.data || error.message);
        return null;
    }
}

// Main function to fetch all social media stats
export async function fetchAllSocialMediaStats(): Promise<SocialMediaStats[]> {
    const stats: SocialMediaStats[] = [];

    const accessToken = process.env.META_ACCESS_TOKEN;
    const fbPageId = process.env.META_FB_PAGE_ID;

    if (!accessToken || !fbPageId) {
        console.warn("Meta API credentials not configured");
        return stats;
    }

    // Fetch Facebook stats
    const fbStats = await fetchFacebookInsights(fbPageId, accessToken);
    if (fbStats) stats.push(fbStats);

    // Fetch Instagram stats
    const igAccountId = await getInstagramBusinessAccountId(fbPageId, accessToken);
    if (igAccountId) {
        const igStats = await fetchInstagramInsights(igAccountId, accessToken);
        if (igStats) stats.push(igStats);
    }

    return stats;
}

export default {
    fetchAllSocialMediaStats,
    fetchInstagramInsights,
    fetchFacebookInsights,
    getInstagramBusinessAccountId,
};
