import { Request, Response } from 'express';
import * as reviewsService from '../services/reviewsService';
import googleSheets from '../services/googleSheets';
import googlePlacesReviewsService, { type GoogleReviewsPayload } from '../services/googlePlacesReviewsService';
import { AuthRequest } from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';

const REVIEW_PHOTOS_DIR = path.join(__dirname, '../../uploads/review-photos');
const MAX_REVIEW_PHOTOS = 3;
const MAX_TEXT_LENGTH = 1500;

// Ensure directory exists
if (!fs.existsSync(REVIEW_PHOTOS_DIR)) {
    fs.mkdirSync(REVIEW_PHOTOS_DIR, { recursive: true });
}

function getExtension(mimeType: string): string {
    const map: { [key: string]: string } = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp'
    };
    return map[mimeType] || '.jpg';
}

function normalizeText(value: unknown): string {
    return String(value || '').trim();
}

function normalizeOrderNumber(value: unknown): string {
    return normalizeText(value).toUpperCase().replace(/\s+/g, '');
}

function normalizePhoneDigits(value: unknown): string {
    return normalizeText(value).replace(/\D/g, '');
}

function normalizeEmail(value: unknown): string {
    return normalizeText(value).toLowerCase();
}

function normalizeDateValue(value: unknown): number {
    const ts = Date.parse(String(value || ''));
    return Number.isNaN(ts) ? 0 : ts;
}

function getOrderProductNames(order: any): string[] {
    if (!Array.isArray(order?.products)) return [];
    return order.products
        .map((item: any) => normalizeText(item?.name || item?.productName || item?.skuName))
        .filter(Boolean);
}

function productMatchesOrder(reviewProductName: string, orderProductNames: string[]): boolean {
    const rn = normalizeText(reviewProductName).toLowerCase();
    if (!rn || rn === 'both products') return true;

    return orderProductNames.some((name) => {
        const pn = normalizeText(name).toLowerCase();
        if (!pn) return false;
        return pn === rn || pn.includes(rn) || rn.includes(pn);
    });
}

type ReviewPurchaseVerificationInput = {
    orderNumber: string;
    customerPhone?: string;
    customerEmail?: string;
    productName?: string;
};

async function verifyReviewPurchase(input: ReviewPurchaseVerificationInput): Promise<{
    verified: boolean;
    reason?: string;
    order?: any;
    orderProductNames: string[];
}> {
    const orderNumber = normalizeOrderNumber(input.orderNumber);
    if (!orderNumber) {
        return { verified: false, reason: 'Order number is required', orderProductNames: [] };
    }

    const order = await googleSheets.getOrderByNumber(orderNumber);
    if (!order) {
        return { verified: false, reason: 'Order not found', orderProductNames: [] };
    }

    if (String(order?.orderStatus || '').toUpperCase() === 'CANCELLED') {
        return { verified: false, reason: 'Cancelled orders cannot be used for review verification', orderProductNames: [] };
    }

    const orderProductNames = getOrderProductNames(order);

    const inputPhone = normalizePhoneDigits(input.customerPhone);
    const orderPhone = normalizePhoneDigits(order?.customerPhone);
    if (inputPhone && orderPhone) {
        const lhs = inputPhone.slice(-10);
        const rhs = orderPhone.slice(-10);
        if (lhs !== rhs) {
            return { verified: false, reason: 'Phone number does not match the order', orderProductNames };
        }
    }

    const inputEmail = normalizeEmail(input.customerEmail);
    const orderEmail = normalizeEmail(order?.customerEmail);
    if (inputEmail && orderEmail && inputEmail !== orderEmail) {
        return { verified: false, reason: 'Email does not match the order', orderProductNames };
    }

    if (!productMatchesOrder(input.productName || '', orderProductNames)) {
        return { verified: false, reason: 'This order does not include the selected product', orderProductNames };
    }

    return {
        verified: true,
        order,
        orderProductNames,
    };
}

function isValidHttpUrl(value: string): boolean {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function normalizeVideoUrl(value: unknown): string {
    const raw = normalizeText(value);
    if (!raw) return '';

    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    if (!isValidHttpUrl(withProtocol)) return '';

    return withProtocol;
}

// Public: Submit a review
export async function submitReview(req: Request, res: Response): Promise<void> {
    try {
        const customerName = normalizeText(req.body?.customerName);
        const customerEmail = normalizeText(req.body?.customerEmail);
        const customerPhone = normalizeText(req.body?.customerPhone);
        const city = normalizeText(req.body?.city);
        const reviewText = normalizeText(req.body?.reviewText);
        const productName = normalizeText(req.body?.productName) || 'Both Products';
        const photos = Array.isArray(req.body?.photos) ? req.body.photos : [];
        const ratingValue = Number(req.body?.rating);
        const videoUrl = normalizeVideoUrl(req.body?.videoUrl);
        const orderNumber = normalizeOrderNumber(req.body?.orderNumber);

        if (!customerName || !reviewText || !Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
            res.status(400).json({ success: false, message: 'Name, rating, and review text are required' });
            return;
        }

        const rating = Math.max(1, Math.min(5, Math.round(ratingValue)));

        if (normalizeText(req.body?.videoUrl) && !videoUrl) {
            res.status(400).json({ success: false, message: 'Invalid video review URL' });
            return;
        }

        if (reviewText.length > MAX_TEXT_LENGTH) {
            res.status(400).json({ success: false, message: `Review text should be under ${MAX_TEXT_LENGTH} characters` });
            return;
        }

        let purchaseVerified = false;
        let verifiedOrder: any = null;

        if (orderNumber) {
            const verification = await verifyReviewPurchase({
                orderNumber,
                customerPhone,
                customerEmail,
                productName,
            });

            if (!verification.verified) {
                res.status(400).json({
                    success: false,
                    message: verification.reason || 'Unable to verify purchase for the provided order number',
                });
                return;
            }

            purchaseVerified = true;
            verifiedOrder = verification.order;
        }

        const resolvedCustomerPhone = customerPhone || normalizeText(verifiedOrder?.customerPhone);
        const resolvedCustomerEmail = customerEmail || normalizeText(verifiedOrder?.customerEmail);
        const resolvedCity = city || normalizeText(verifiedOrder?.city);

        let photoUrls: string[] = [];

        // Save photos locally if provided (max 3)
        if (photos.length) {
            const photosToSave = photos.slice(0, MAX_REVIEW_PHOTOS);

            for (const photo of photosToSave) {
                if (photo.base64 && photo.mimeType) {
                    try {
                        const filename = `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${getExtension(photo.mimeType)}`;
                        const filepath = path.join(REVIEW_PHOTOS_DIR, filename);
                        const buffer = Buffer.from(photo.base64, 'base64');
                        fs.writeFileSync(filepath, buffer);
                        // Generate URL for the photo
                        photoUrls.push(`${config.backendUrl}/reviews/photo/${filename}`);
                    } catch (photoError) {
                        console.error('Photo save error:', photoError);
                    }
                }
            }
        }

        const result = await reviewsService.submitReview({
            customerName,
            customerEmail: resolvedCustomerEmail,
            customerPhone: resolvedCustomerPhone,
            city: resolvedCity,
            rating,
            reviewText,
            productName,
            photoUrl: photoUrls.join(','), // Store as comma-separated URLs
            videoUrl,
            orderNumber: orderNumber || undefined,
            verifiedOrderNumber: purchaseVerified ? normalizeOrderNumber(verifiedOrder?.orderNumber || orderNumber) : undefined,
            purchaseVerified,
        });

        res.json(result);
    } catch (error) {
        console.error('Submit review error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit review' });
    }
}

// Public: Verify purchase before review submission
export async function verifyPurchaseForReview(req: Request, res: Response): Promise<void> {
    try {
        const orderNumber = normalizeOrderNumber(req.body?.orderNumber);
        const customerPhone = normalizeText(req.body?.customerPhone);
        const customerEmail = normalizeText(req.body?.customerEmail);
        const productName = normalizeText(req.body?.productName);

        if (!orderNumber) {
            res.status(400).json({ success: false, message: 'Order number is required' });
            return;
        }

        const verification = await verifyReviewPurchase({
            orderNumber,
            customerPhone,
            customerEmail,
            productName,
        });

        if (!verification.verified) {
            res.json({
                success: true,
                data: {
                    verified: false,
                    reason: verification.reason || 'Unable to verify purchase',
                },
            });
            return;
        }

        const order = verification.order || {};
        res.json({
            success: true,
            data: {
                verified: true,
                orderNumber: normalizeOrderNumber(order?.orderNumber || orderNumber),
                customerName: normalizeText(order?.customerName),
                customerEmail: normalizeText(order?.customerEmail),
                customerPhone: normalizeText(order?.customerPhone),
                city: normalizeText(order?.city),
                purchasedProducts: verification.orderProductNames,
            },
        });
    } catch (error) {
        console.error('Verify purchase for review error:', error);
        res.status(500).json({ success: false, message: 'Failed to verify purchase' });
    }
}

// Public: Get approved video reviews
export async function getVideoReviews(req: Request, res: Response): Promise<void> {
    try {
        const [reviews, curatedVideoReviews] = await Promise.all([
            reviewsService.getApprovedReviews(),
            googleSheets.getVideoReviews().catch(() => []),
        ]);

        const fromApprovedReviews = reviews
            .map((review) => {
                const normalizedUrl = normalizeVideoUrl(review?.videoUrl || review?.driveLink || '');
                if (!normalizedUrl) return null;
                return {
                    ...review,
                    videoUrl: normalizedUrl,
                    source: 'review',
                };
            })
            .filter(Boolean) as any[];

        const fromCuratedReviews = (Array.isArray(curatedVideoReviews) ? curatedVideoReviews : [])
            .filter((item: any) => {
                const status = normalizeText(item?.status).toLowerCase();
                return !status || status === 'published' || status === 'active';
            })
            .map((item: any) => {
                const normalizedUrl = normalizeVideoUrl(item?.videoUrl || item?.driveLink || '');
                if (!normalizedUrl) return null;

                return {
                    id: item?.id,
                    customerName: normalizeText(item?.customerName) || 'Verified Buyer',
                    reviewText: normalizeText(item?.description) || 'Video review',
                    productName: normalizeText(item?.productName),
                    rating: Number(item?.rating || 5),
                    videoUrl: normalizedUrl,
                    createdAt: normalizeText(item?.createdAt || item?.updatedAt),
                    purchaseVerified: Boolean(item?.purchaseVerified),
                    source: 'curated',
                };
            })
            .filter(Boolean) as any[];

        const merged = [...fromApprovedReviews, ...fromCuratedReviews];
        const unique = new Map<string, any>();

        for (const review of merged) {
            const key = [
                normalizeText(review?.id),
                normalizeText(review?.videoUrl),
                normalizeText(review?.customerName),
            ].filter(Boolean).join('|');

            if (!key) continue;
            if (!unique.has(key)) unique.set(key, review);
        }

        const videoReviews = Array.from(unique.values()).sort(
            (a, b) => normalizeDateValue(b?.createdAt) - normalizeDateValue(a?.createdAt)
        );

        res.json({
            success: true,
            data: videoReviews,
        });
    } catch (error) {
        console.error('Get video reviews error:', error);
        res.status(500).json({ success: false, message: 'Failed to get video reviews' });
    }
}

// Public: Get approved reviews (for landing page)
export async function getApprovedReviews(req: Request, res: Response): Promise<void> {
    try {
        const reviews = await reviewsService.getApprovedReviews();
        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Get approved reviews error:', error);
        res.status(500).json({ success: false, message: 'Failed to get reviews' });
    }
}

// Public: Get Google business reviews (cached)
export async function getGoogleReviews(req: Request, res: Response): Promise<void> {
    try {
        const forceRefresh = String(req.query?.refresh || '').trim().toLowerCase() === 'true';
        const response = await googlePlacesReviewsService.getGoogleReviews(forceRefresh);
        const payload: Partial<GoogleReviewsPayload> = response.data || {};

        res.json({
            success: true,
            data: {
                businessName: payload.businessName,
                rating: payload.rating,
                userRatingsTotal: payload.userRatingsTotal,
                reviews: payload.reviews,
                writeReviewUrl: payload.writeReviewUrl,
            },
        });
    } catch (error: any) {
        console.error('Get Google reviews error:', error);
        const message = String(error?.message || 'Failed to fetch Google reviews');
        const isConfigError = message.includes('GOOGLE_MAPS_API_KEY') || message.includes('GOOGLE_REVIEWS_PLACE_ID');

        res.status(isConfigError ? 500 : 502).json({
            success: false,
            message: isConfigError
                ? 'Google reviews are temporarily unavailable'
                : 'Failed to fetch Google reviews',
        });
    }
}

// Protected: Get all reviews (for admin)
export async function getAllReviews(req: AuthRequest, res: Response): Promise<void> {
    try {
        const reviews = await reviewsService.getAllReviews();
        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Get all reviews error:', error);
        res.status(500).json({ success: false, message: 'Failed to get reviews' });
    }
}

// Protected: Update review status
export async function updateReviewStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
            res.status(400).json({ success: false, message: 'Invalid status' });
            return;
        }

        const result = await reviewsService.updateReviewStatus(id, status);
        res.json(result);
    } catch (error) {
        console.error('Update review status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update review' });
    }
}

// Protected: Delete review
export async function deleteReview(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const result = await reviewsService.deleteReview(id);
        res.json(result);
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete review' });
    }
}

// Public: Get review photo (serves from local uploads)
export async function getReviewPhoto(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const filepath = path.join(REVIEW_PHOTOS_DIR, id);

        if (!fs.existsSync(filepath)) {
            res.status(404).json({ success: false, message: 'Photo not found' });
            return;
        }

        // Determine content type from extension
        const ext = path.extname(id).toLowerCase();
        const mimeTypes: { [key: string]: string } = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };

        res.set('Content-Type', mimeTypes[ext] || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=31536000');
        res.sendFile(filepath);
    } catch (error) {
        console.error('Get review photo error:', error);
        res.status(500).json({ success: false, message: 'Failed to get photo' });
    }
}

// Approve review
export async function approveReview(req: AuthRequest, res: Response): Promise<void> {
    try {
        const reviewId = req.params.id;

        const review = await reviewsService.updateReviewStatus(reviewId, 'APPROVED');
        if (!review) {
            res.status(404).json({ success: false, message: 'Review not found' });
            return;
        }

        res.json({
            success: true,
            message: 'Review approved successfully',
            data: review
        });
    } catch (error) {
        console.error('Approve review error:', error);
        res.status(500).json({ success: false, message: 'Failed to approve review' });
    }
}

// Reject review
export async function rejectReview(req: AuthRequest, res: Response): Promise<void> {
    try {
        const reviewId = req.params.id;

        const review = await reviewsService.updateReviewStatus(reviewId, 'REJECTED');
        if (!review) {
            res.status(404).json({ success: false, message: 'Review not found' });
            return;
        }

        res.json({
            success: true,
            message: 'Review rejected successfully',
            data: review
        });
    } catch (error) {
        console.error('Reject review error:', error);
        res.status(500).json({ success: false, message: 'Failed to reject review' });
    }
}

// Get WhatsApp reviews
export async function getWhatsAppReviews(req: AuthRequest, res: Response): Promise<void> {
    try {
        // Return empty array for now - can be implemented later
        const reviews = [];

        res.json({
            success: true,
            data: reviews || []
        });
    } catch (error) {
        console.error('Get WhatsApp reviews error:', error);
        res.status(500).json({ success: false, message: 'Failed to get WhatsApp reviews' });
    }
}
