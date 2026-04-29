import { Request, Response } from 'express';
import supabase from "../services/supabase";

type DonationConfig = {
    amountPerOrder?: number;
    headline?: string;
    subheadline?: string;
    lastDonationDate?: string;
    lastDonationNote?: string;
    lastDonationAmount?: number;
    lastDonationOrdersCovered?: number;
    eligibleOrderStatuses?: string[];
};

type DonationSummary = {
    amountPerOrder: number;
    headline: string;
    subheadline: string;
    totalEligibleOrders: number;
    estimatedTotalContribution: number;
    recentOrderNumbers: string[];
    lastDonationDate: string;
    lastDonationNote: string;
    lastDonationAmount: number | null;
    lastDonationOrdersCovered: number | null;
    generatedAt: string;
};

const DEFAULT_DONATION_PER_ORDER = 5;
const DEFAULT_ELIGIBLE_ORDER_STATUSES = new Set([
    'PAID',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
]);
const MAX_RECENT_ORDERS = 12;

function normalizeStatus(value: unknown): string {
    return String(value || '').trim().toUpperCase();
}

function toPositiveNumber(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
}

function toDateMillis(value: unknown): number {
    const ts = Date.parse(String(value || ''));
    return Number.isNaN(ts) ? 0 : ts;
}

function normalizeConfig(raw: unknown): DonationConfig {
    if (!raw || typeof raw !== 'object') return {};
    const cfg = raw as Record<string, unknown>;

    return {
        amountPerOrder: toPositiveNumber(cfg.amountPerOrder),
        headline: String(cfg.headline || '').trim(),
        subheadline: String(cfg.subheadline || '').trim(),
        lastDonationDate: String(cfg.lastDonationDate || '').trim(),
        lastDonationNote: String(cfg.lastDonationNote || '').trim(),
        lastDonationAmount: toPositiveNumber(cfg.lastDonationAmount),
        lastDonationOrdersCovered: toPositiveNumber(cfg.lastDonationOrdersCovered),
        eligibleOrderStatuses: Array.isArray(cfg.eligibleOrderStatuses)
            ? cfg.eligibleOrderStatuses.map((status) => normalizeStatus(status)).filter(Boolean)
            : undefined,
    };
}

function sortNewestFirst(a: any, b: any): number {
    return toDateMillis(b?.createdAt || b?.updatedAt) - toDateMillis(a?.createdAt || a?.updatedAt);
}

// Public: Donation summary for website
export async function getDonationSummary(_req: Request, res: Response): Promise<void> {
    try {
        const [orders, donationConfigRaw] = await Promise.all([
            supabase.getAllOrders(),
            supabase.getConfig('donation_campaign'),
        ]);

        const donationConfig = normalizeConfig(donationConfigRaw);
        const amountPerOrder = donationConfig.amountPerOrder || DEFAULT_DONATION_PER_ORDER;
        const eligibleStatuses = new Set(
            donationConfig.eligibleOrderStatuses?.length
                ? donationConfig.eligibleOrderStatuses
                : Array.from(DEFAULT_ELIGIBLE_ORDER_STATUSES)
        );

        const orderList = Array.isArray(orders) ? orders : [];
        const eligibleOrders = orderList
            .filter((order: any) => eligibleStatuses.has(normalizeStatus(order?.orderStatus)))
            .sort(sortNewestFirst);

        const totalEligibleOrders = eligibleOrders.length;
        const estimatedTotalContribution = Math.round(totalEligibleOrders * amountPerOrder);
        const recentOrderNumbers = eligibleOrders
            .map((order: any) => String(order?.orderNumber || '').trim())
            .filter(Boolean)
            .slice(0, MAX_RECENT_ORDERS);

        const payload: DonationSummary = {
            amountPerOrder,
            headline: donationConfig.headline || 'Cow fodder support from every order',
            subheadline:
                donationConfig.subheadline ||
                `Every successful order contributes Rs ${amountPerOrder} towards fodder and animal welfare support.`,
            totalEligibleOrders,
            estimatedTotalContribution,
            recentOrderNumbers,
            lastDonationDate: donationConfig.lastDonationDate || '',
            lastDonationNote: donationConfig.lastDonationNote || '',
            lastDonationAmount: donationConfig.lastDonationAmount || null,
            lastDonationOrdersCovered: donationConfig.lastDonationOrdersCovered || null,
            generatedAt: new Date().toISOString(),
        };

        res.json({
            success: true,
            data: payload,
        });
    } catch (error) {
        console.error('Get donation summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to load donation summary right now',
        });
    }
}

export default {
    getDonationSummary,
};
