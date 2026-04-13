import { Request, Response } from 'express';
import * as tagsService from '../services/tagsService';
import * as reviewsService from '../services/reviewsService';
import { AuthRequest } from '../middleware/auth';

// Helper: match review.productName to product name (fuzzy)
function reviewMatchesProduct(reviewProductName: string, productName: string): boolean {
    const rn = (reviewProductName || '').toLowerCase().trim();
    const pn = (productName || '').toLowerCase().trim();
    if (!rn || !pn) return false;
    // Exact match or "Both Products" reviews count for all
    if (rn === pn || rn === 'both products') return true;
    // Partial match: "awla candy" matches "Awla Candy 100gm" etc.
    if (rn.includes(pn) || pn.includes(rn)) return true;
    return false;
}

// Public: Get products grouped by section tags (for landing page)
export async function getProductsBySection(req: Request, res: Response): Promise<void> {
    try {
        const sections = await tagsService.getProductsBySection();

        // Fetch reviews and enrich products with avgRating/reviewCount
        let allReviews: any[] = [];
        try {
            allReviews = await reviewsService.getApprovedReviews();
        } catch (e) {
            console.log('Reviews fetch failed (non-critical):', (e as Error).message);
        }

        if (allReviews.length > 0 && Array.isArray(sections)) {
            for (const section of sections) {
                for (const product of (section.products || [])) {
                    const productReviews = allReviews.filter(r =>
                        reviewMatchesProduct(r.productName, product.name)
                    );
                    if (productReviews.length > 0) {
                        const avg = productReviews.reduce((sum: number, r: any) => sum + (parseFloat(r.rating) || 0), 0) / productReviews.length;
                        product.avgRating = parseFloat(avg.toFixed(1));
                        product.reviewCount = productReviews.length;
                    }
                }
            }
        }

        res.json({ success: true, data: sections });
    } catch (error) {
        console.error('Get products by section error:', error);
        res.status(500).json({ success: false, message: 'Failed to get products by section' });
    }
}

// Public: Get all tags
export async function getPublicTags(req: Request, res: Response): Promise<void> {
    try {
        const tags = await tagsService.getAllTags();
        res.json({ success: true, data: tags });
    } catch (error) {
        console.error('Get public tags error:', error);
        res.status(500).json({ success: false, message: 'Failed to get tags' });
    }
}

// Protected: Get all tags (admin)
export async function getAllTags(req: AuthRequest, res: Response): Promise<void> {
    try {
        const tags = await tagsService.getAllTags();
        res.json({ success: true, data: tags });
    } catch (error) {
        console.error('Get all tags error:', error);
        res.status(500).json({ success: false, message: 'Failed to get tags' });
    }
}

// Protected: Create tag
export async function createTag(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { name, type, displayOrder, productSlugs } = req.body;
        if (!name) {
            res.status(400).json({ success: false, message: 'Tag name is required' });
            return;
        }
        const tag = await tagsService.createTag({ name, type, displayOrder, productSlugs });
        res.json({ success: true, data: tag });
    } catch (error) {
        console.error('Create tag error:', error);
        res.status(500).json({ success: false, message: 'Failed to create tag' });
    }
}

// Protected: Update tag
export async function updateTag(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const tag = await tagsService.updateTag(id, req.body);
        if (!tag) {
            res.status(404).json({ success: false, message: 'Tag not found' });
            return;
        }
        res.json({ success: true, data: tag });
    } catch (error) {
        console.error('Update tag error:', error);
        res.status(500).json({ success: false, message: 'Failed to update tag' });
    }
}

// Protected: Delete tag
export async function deleteTag(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const result = await tagsService.deleteTag(id);
        if (!result) {
            res.status(404).json({ success: false, message: 'Tag not found' });
            return;
        }
        res.json({ success: true, message: 'Tag deleted' });
    } catch (error) {
        console.error('Delete tag error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete tag' });
    }
}
