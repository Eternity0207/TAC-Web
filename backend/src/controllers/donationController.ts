import { Request, Response } from 'express';
import supabase from "../services/supabase";
import fs from "fs";
import path from "path";
import { AuthRequest } from '../middleware/auth';

type DonationConfig = {
    amountPerOrder?: number;
    headline?: string;
    subheadline?: string;
    lastDonationDate?: string;
    lastDonationNote?: string;
    lastDonationAmount?: number;
    lastDonationOrdersCovered?: number;
    eligibleOrderStatuses?: string[];
    photos?: DonationPhoto[];
    videos?: DonationVideo[];
};

type DonationPhoto = {
    id: string;
    url: string;
    caption?: string;
    uploadedAt: string;
};

type DonationVideo = {
    id: string;
    url: string;
    caption?: string;
    uploadedAt: string;
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
    photos: DonationPhoto[];
    videos: DonationVideo[];
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
        photos: Array.isArray(cfg.photos) ? cfg.photos : [],
        videos: Array.isArray(cfg.videos) ? cfg.videos : [],
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
            photos: Array.isArray(donationConfig.photos) ? donationConfig.photos : [],
            videos: Array.isArray(donationConfig.videos) ? donationConfig.videos : [],
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

function ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Protected: Upload donation photo
export async function uploadDonationPhoto(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { base64Image, mimeType, caption } = req.body;

        if (!base64Image) {
            res.status(400).json({ success: false, message: 'Image data is required' });
            return;
        }

        // Size check (~10MB)
        const maxBase64Size = 13.3 * 1024 * 1024;
        if (base64Image.length > maxBase64Size) {
            res.status(400).json({ success: false, message: 'Image must be less than 10MB' });
            return;
        }

        // Create donation photos directory
        const uploadsDir = path.join(__dirname, '../../uploads/donation-photos');
        ensureDir(uploadsDir);

        // Save file
        const ext = mimeType?.includes('jpeg') || mimeType?.includes('jpg') ? 'jpg' : 'png';
        const photoId = `dp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const filename = `${photoId}.${ext}`;
        const filepath = path.join(uploadsDir, filename);
        const buffer = Buffer.from(base64Image, 'base64');
        fs.writeFileSync(filepath, buffer);

        // Build photo URL
        const { config } = await import('../config');
        const photoUrl = `${config.uploadsUrl}/donation-photos/${filename}`;

        // Load current config, append photo, save
        const donationConfigRaw = await supabase.getConfig('donation_campaign');
        const donationConfig = normalizeConfig(donationConfigRaw);
        const photos: DonationPhoto[] = Array.isArray(donationConfig.photos) ? donationConfig.photos : [];

        const newPhoto: DonationPhoto = {
            id: photoId,
            url: photoUrl,
            caption: String(caption || '').trim(),
            uploadedAt: new Date().toISOString(),
        };
        photos.push(newPhoto);

        // Save updated config
        await supabase.setConfig('donation_campaign', {
            ...(donationConfigRaw && typeof donationConfigRaw === 'object' ? donationConfigRaw : {}),
            photos,
        });

        res.json({
            success: true,
            message: 'Donation photo uploaded',
            data: newPhoto,
        });
    } catch (error) {
        console.error('Upload donation photo error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload donation photo' });
    }
}

// Protected: Upload donation video
export async function uploadDonationVideo(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { base64Video, mimeType, caption } = req.body;

        if (!base64Video) {
            res.status(400).json({ success: false, message: 'Video data is required' });
            return;
        }

        // Size check (~50MB)
        const maxBase64Size = 66.7 * 1024 * 1024;
        if (base64Video.length > maxBase64Size) {
            res.status(400).json({ success: false, message: 'Video must be less than 50MB' });
            return;
        }

        const uploadsDir = path.join(__dirname, '../../uploads/donation-videos');
        ensureDir(uploadsDir);

        const normalizedMime = String(mimeType || '').toLowerCase();
        const ext = normalizedMime.includes('quicktime')
            ? 'mov'
            : normalizedMime.includes('webm')
                ? 'webm'
                : 'mp4';
        const videoId = `dv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const filename = `${videoId}.${ext}`;
        const filepath = path.join(uploadsDir, filename);
        const buffer = Buffer.from(base64Video, 'base64');
        fs.writeFileSync(filepath, buffer);

        const { config } = await import('../config');
        const videoUrl = `${config.uploadsUrl}/donation-videos/${filename}`;

        const donationConfigRaw = await supabase.getConfig('donation_campaign');
        const donationConfig = normalizeConfig(donationConfigRaw);
        const videos: DonationVideo[] = Array.isArray(donationConfig.videos) ? donationConfig.videos : [];

        const newVideo: DonationVideo = {
            id: videoId,
            url: videoUrl,
            caption: String(caption || '').trim(),
            uploadedAt: new Date().toISOString(),
        };
        videos.push(newVideo);

        await supabase.setConfig('donation_campaign', {
            ...(donationConfigRaw && typeof donationConfigRaw === 'object' ? donationConfigRaw : {}),
            videos,
        });

        res.json({
            success: true,
            message: 'Donation video uploaded',
            data: newVideo,
        });
    } catch (error) {
        console.error('Upload donation video error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload donation video' });
    }
}

// Protected: Delete donation photo
export async function deleteDonationPhoto(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { photoId } = req.params;
        if (!photoId) {
            res.status(400).json({ success: false, message: 'Photo ID is required' });
            return;
        }

        // Load config
        const donationConfigRaw = await supabase.getConfig('donation_campaign');
        const donationConfig = normalizeConfig(donationConfigRaw);
        const photos: DonationPhoto[] = Array.isArray(donationConfig.photos) ? donationConfig.photos : [];

        const photoIndex = photos.findIndex((p) => p.id === photoId);
        if (photoIndex === -1) {
            res.status(404).json({ success: false, message: 'Photo not found' });
            return;
        }

        // Try to delete file from disk
        const photo = photos[photoIndex];
        try {
            const urlParts = photo.url.split('/donation-photos/');
            if (urlParts.length > 1) {
                const filename = urlParts[1];
                const filepath = path.join(__dirname, '../../uploads/donation-photos', filename);
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath);
                }
            }
        } catch (e) {
            console.error('Failed to delete photo file:', e);
        }

        // Remove from config
        photos.splice(photoIndex, 1);
        await supabase.setConfig('donation_campaign', {
            ...(donationConfigRaw && typeof donationConfigRaw === 'object' ? donationConfigRaw : {}),
            photos,
        });

        res.json({ success: true, message: 'Donation photo deleted' });
    } catch (error) {
        console.error('Delete donation photo error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete donation photo' });
    }
}

// Protected: Delete donation video
export async function deleteDonationVideo(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { videoId } = req.params;
        if (!videoId) {
            res.status(400).json({ success: false, message: 'Video ID is required' });
            return;
        }

        const donationConfigRaw = await supabase.getConfig('donation_campaign');
        const donationConfig = normalizeConfig(donationConfigRaw);
        const videos: DonationVideo[] = Array.isArray(donationConfig.videos) ? donationConfig.videos : [];

        const videoIndex = videos.findIndex((v) => v.id === videoId);
        if (videoIndex === -1) {
            res.status(404).json({ success: false, message: 'Video not found' });
            return;
        }

        const video = videos[videoIndex];
        try {
            const urlParts = video.url.split('/donation-videos/');
            if (urlParts.length > 1) {
                const filename = urlParts[1];
                const filepath = path.join(__dirname, '../../uploads/donation-videos', filename);
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath);
                }
            }
        } catch (e) {
            console.error('Failed to delete video file:', e);
        }

        videos.splice(videoIndex, 1);
        await supabase.setConfig('donation_campaign', {
            ...(donationConfigRaw && typeof donationConfigRaw === 'object' ? donationConfigRaw : {}),
            videos,
        });

        res.json({ success: true, message: 'Donation video deleted' });
    } catch (error) {
        console.error('Delete donation video error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete donation video' });
    }
}

// Protected: Get all donation photos (admin)
export async function getDonationPhotos(req: AuthRequest, res: Response): Promise<void> {
    try {
        const donationConfigRaw = await supabase.getConfig('donation_campaign');
        const donationConfig = normalizeConfig(donationConfigRaw);
        const photos: DonationPhoto[] = Array.isArray(donationConfig.photos) ? donationConfig.photos : [];

        res.json({ success: true, data: photos });
    } catch (error) {
        console.error('Get donation photos error:', error);
        res.status(500).json({ success: false, message: 'Failed to get donation photos' });
    }
}

// Protected: Get all donation videos (admin)
export async function getDonationVideos(req: AuthRequest, res: Response): Promise<void> {
    try {
        const donationConfigRaw = await supabase.getConfig('donation_campaign');
        const donationConfig = normalizeConfig(donationConfigRaw);
        const videos: DonationVideo[] = Array.isArray(donationConfig.videos) ? donationConfig.videos : [];

        res.json({ success: true, data: videos });
    } catch (error) {
        console.error('Get donation videos error:', error);
        res.status(500).json({ success: false, message: 'Failed to get donation videos' });
    }
}

export default {
    getDonationSummary,
    uploadDonationPhoto,
    uploadDonationVideo,
    deleteDonationPhoto,
    deleteDonationVideo,
    getDonationPhotos,
    getDonationVideos,
};
