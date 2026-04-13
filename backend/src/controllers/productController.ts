import { Request, Response } from 'express';
import * as productsService from '../services/productsService';
import * as reviewsService from '../services/reviewsService';
import googleSheets from '../services/googleSheets';
import { AuthRequest } from '../middleware/auth';

// Helper: match review.productName to product name  
function reviewMatchesProduct(reviewProductName: string, productName: string): boolean {
    const rn = (reviewProductName || '').toLowerCase().trim();
    const pn = (productName || '').toLowerCase().trim();
    if (!rn || !pn) return false;
    if (rn === pn || rn === 'both products') return true;
    if (rn.includes(pn) || pn.includes(rn)) return true;
    return false;
}

// Public: Get product by slug (with reviews)
export async function getProductBySlug(req: Request, res: Response): Promise<void> {
    try {
        const { slug } = req.params;
        const product = await productsService.getProductBySlug(slug);
        if (!product) {
            res.status(404).json({ success: false, message: 'Product not found' });
            return;
        }

        // Enrich with reviews
        try {
            const allReviews = await reviewsService.getApprovedReviews();
            const productReviews = allReviews.filter(r =>
                reviewMatchesProduct(r.productName, product.name)
            );
            if (productReviews.length > 0) {
                const avg = productReviews.reduce((sum, r) => sum + (parseFloat(String(r.rating)) || 0), 0) / productReviews.length;
                (product as any).avgRating = parseFloat(avg.toFixed(1));
                (product as any).reviewCount = productReviews.length;
                (product as any).reviews = productReviews.map(r => ({
                    customerName: r.customerName,
                    rating: r.rating,
                    reviewText: r.reviewText,
                    isVerified: r.status === 'APPROVED',
                    createdon: r.createdAt,
                }));
            }
        } catch (e) {
            console.log('Reviews enrichment failed (non-critical)');
        }

        res.json({ success: true, data: product });
    } catch (error) {
        console.error('Get product by slug error:', error);
        res.status(500).json({ success: false, message: 'Failed to get product' });
    }
}

// Public: Get all active products (enriched with review stats)
export async function getPublicProducts(req: Request, res: Response): Promise<void> {
    try {
        const products = await productsService.getAllProducts();
        const active = products.filter(p => p.isActive);

        // Enrich with reviews
        try {
            const allReviews = await reviewsService.getApprovedReviews();
            for (const product of active) {
                const productReviews = allReviews.filter(r =>
                    reviewMatchesProduct(r.productName, product.name)
                );
                if (productReviews.length > 0) {
                    const avg = productReviews.reduce((sum, r) => sum + (parseFloat(String(r.rating)) || 0), 0) / productReviews.length;
                    (product as any).avgRating = parseFloat(avg.toFixed(1));
                    (product as any).reviewCount = productReviews.length;
                }
            }
        } catch (e) {
            console.log('Reviews enrichment failed (non-critical)');
        }

        res.json({ success: true, data: active });
    } catch (error) {
        console.error('Get public products error:', error);
        res.status(500).json({ success: false, message: 'Failed to get products' });
    }
}

// Protected: Get all products (admin)
export async function getAllProducts(req: AuthRequest, res: Response): Promise<void> {
    try {
        const products = await productsService.getAllProducts();
        res.json({ success: true, data: products });
    } catch (error) {
        console.error('Get all products error:', error);
        res.status(500).json({ success: false, message: 'Failed to get products' });
    }
}

// Protected: Create product
export async function createProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { name } = req.body;
        if (!name) {
            res.status(400).json({ success: false, message: 'Product name is required' });
            return;
        }
        const product = await productsService.createProduct(req.body);
        res.json({ success: true, data: product });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ success: false, message: 'Failed to create product' });
    }
}

// Protected: Update product
export async function updateProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const product = await productsService.updateProduct(id, req.body);
        if (!product) {
            res.status(404).json({ success: false, message: 'Product not found' });
            return;
        }
        res.json({ success: true, data: product });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ success: false, message: 'Failed to update product' });
    }
}

// Protected: Delete product
export async function deleteProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const result = await productsService.deleteProduct(id);
        if (!result) {
            res.status(404).json({ success: false, message: 'Product not found' });
            return;
        }
        res.json({ success: true, message: 'Product deleted' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete product' });
    }
}

// =============================================================================
// SKU Management
// =============================================================================

// Get all SKUs
export async function getAllSKUs(req: AuthRequest, res: Response): Promise<void> {
    try {
        const skus = await googleSheets.getSKUs();

        res.json({
            success: true,
            data: skus || []
        });
    } catch (error) {
        console.error('Get all SKUs error:', error);
        res.status(500).json({ success: false, message: 'Failed to get SKUs' });
    }
}

// Create new SKU
export async function createSKU(req: AuthRequest, res: Response): Promise<void> {
    try {
        const skuData = req.body;

        // TODO: Implement createSKU method in googleSheets service
        // const newSKU = await googleSheets.createSKU(skuData);
        const newSKU = {
            ...skuData,
            id: Date.now().toString(),
            createdAt: new Date().toISOString()
        };

        res.status(201).json({
            success: true,
            message: 'SKU created successfully',
            data: newSKU
        });
    } catch (error) {
        console.error('Create SKU error:', error);
        res.status(500).json({ success: false, message: 'Failed to create SKU' });
    }
}

// Update SKU
export async function updateSKU(req: AuthRequest, res: Response): Promise<void> {
    try {
        const skuId = req.params.id;
        const updateData = req.body;

        // TODO: Implement updateSKU method in googleSheets service
        // const updatedSKU = await googleSheets.updateSKU(skuId, updateData);
        const updatedSKU = null;
        if (!updatedSKU) {
            res.status(404).json({ success: false, message: 'SKU not found' });
            return;
        }

        res.json({
            success: true,
            message: 'SKU updated successfully',
            data: updatedSKU
        });
    } catch (error) {
        console.error('Update SKU error:', error);
        res.status(500).json({ success: false, message: 'Failed to update SKU' });
    }
}

// Delete SKU
export async function deleteSKU(req: AuthRequest, res: Response): Promise<void> {
    try {
        const skuId = req.params.id;

        // TODO: Implement deleteSKU method in googleSheets service
        // const deleted = await googleSheets.deleteSKU(skuId);
        const deleted = false;
        if (!deleted) {
            res.status(404).json({ success: false, message: 'SKU not found' });
            return;
        }

        res.json({
            success: true,
            message: 'SKU deleted successfully'
        });
    } catch (error) {
        console.error('Delete SKU error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete SKU' });
    }
}

// Get wholesale SKUs
export async function getWholesaleSKUs(req: AuthRequest, res: Response): Promise<void> {
    try {
        const wholesaleSKUs = await googleSheets.getWholesaleSKUs();

        res.json({
            success: true,
            data: wholesaleSKUs || []
        });
    } catch (error) {
        console.error('Get wholesale SKUs error:', error);
        res.status(500).json({ success: false, message: 'Failed to get wholesale SKUs' });
    }
}

// =============================================================================
// Upcoming Products
// =============================================================================

// Get upcoming products
export async function getUpcomingProducts(req: AuthRequest, res: Response): Promise<void> {
    try {
        const upcomingProducts = await googleSheets.getUpcomingProducts();

        res.json({
            success: true,
            data: upcomingProducts || []
        });
    } catch (error) {
        console.error('Get upcoming products error:', error);
        res.status(500).json({ success: false, message: 'Failed to get upcoming products' });
    }
}

// Create upcoming product
export async function createUpcomingProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
        const productData = req.body;

        const newProduct = await googleSheets.createUpcomingProduct(productData);

        res.status(201).json({
            success: true,
            message: 'Upcoming product created successfully',
            data: newProduct
        });
    } catch (error) {
        console.error('Create upcoming product error:', error);
        res.status(500).json({ success: false, message: 'Failed to create upcoming product' });
    }
}

// =============================================================================
// Production Videos
// =============================================================================

// Get production videos
export async function getProductionVideos(req: AuthRequest, res: Response): Promise<void> {
    try {
        const videos = await googleSheets.getProductionVideos();

        res.json({
            success: true,
            data: videos || []
        });
    } catch (error) {
        console.error('Get production videos error:', error);
        res.status(500).json({ success: false, message: 'Failed to get production videos' });
    }
}

// Create production video
export async function createProductionVideo(req: AuthRequest, res: Response): Promise<void> {
    try {
        const videoData = req.body;

        const newVideo = await googleSheets.createProductionVideo(videoData);

        res.status(201).json({
            success: true,
            message: 'Production video created successfully',
            data: newVideo
        });
    } catch (error) {
        console.error('Create production video error:', error);
        res.status(500).json({ success: false, message: 'Failed to create production video' });
    }
}
