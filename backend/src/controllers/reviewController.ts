import { Request, Response } from 'express';
import * as reviewsService from '../services/reviewsService';
import googleSheets from '../services/googleSheets';
import { AuthRequest } from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';

const REVIEW_PHOTOS_DIR = path.join(__dirname, '../../uploads/review-photos');

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

// Public: Submit a review
export async function submitReview(req: Request, res: Response): Promise<void> {
    try {
        const { customerName, rating, reviewText, productName, photos } = req.body;

        if (!customerName || !rating || !reviewText) {
            res.status(400).json({ success: false, message: 'Name, rating, and review text are required' });
            return;
        }

        let photoUrls: string[] = [];

        // Save photos locally if provided (max 3)
        if (photos && Array.isArray(photos)) {
            const photosToSave = photos.slice(0, 3); // Limit to 3

            for (const photo of photosToSave) {
                if (photo.base64 && photo.mimeType) {
                    try {
                        const filename = `review-${Date.now()}-${Math.random().toString(36).substr(2, 6)}${getExtension(photo.mimeType)}`;
                        const filepath = path.join(REVIEW_PHOTOS_DIR, filename);
                        const buffer = Buffer.from(photo.base64, 'base64');
                        fs.writeFileSync(filepath, buffer);
                        // Generate URL for the photo
                        photoUrls.push(`${config.backendUrl || 'http://localhost:3003'}/api/reviews/photo/${filename}`);
                    } catch (photoError) {
                        console.error('Photo save error:', photoError);
                    }
                }
            }
        }

        const result = await reviewsService.submitReview({
            customerName,
            rating: parseInt(rating),
            reviewText,
            productName,
            photoUrl: photoUrls.join(','), // Store as comma-separated URLs
        });

        res.json(result);
    } catch (error) {
        console.error('Submit review error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit review' });
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

// Get video reviews
export async function getVideoReviews(req: AuthRequest, res: Response): Promise<void> {
    try {
        // Return empty array for now - can be implemented later
        const reviews = [];

        res.json({
            success: true,
            data: reviews || []
        });
    } catch (error) {
        console.error('Get video reviews error:', error);
        res.status(500).json({ success: false, message: 'Failed to get video reviews' });
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
