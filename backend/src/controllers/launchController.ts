import { Request, Response } from 'express';
import googleSheets from '../services/googleSheets';
import { AuthRequest } from '../middleware/auth';

// ============================================================
// UPCOMING PRODUCTS (Launching Soon)
// ============================================================

export async function getUpcomingProducts(req: Request, res: Response) {
    try {
        const products = await googleSheets.getUpcomingProducts();
        res.json({ success: true, data: products });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function createUpcomingProduct(req: AuthRequest, res: Response) {
    try {
        const { name, description, imageUrl, launchDate, badgeText, status } = req.body;
        if (!name || !imageUrl) {
            return res.status(400).json({ success: false, message: 'Name and image URL are required' });
        }
        const product = await googleSheets.createUpcomingProduct({
            name, description, imageUrl, launchDate, badgeText: badgeText || 'Coming Soon',
            status: status || 'active', createdBy: req.user?.id
        });
        res.json({ success: true, data: product });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function updateUpcomingProduct(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const product = await googleSheets.updateUpcomingProduct(id, req.body);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        res.json({ success: true, data: product });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function deleteUpcomingProduct(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const success = await googleSheets.deleteUpcomingProduct(id);
        if (!success) return res.status(404).json({ success: false, message: 'Product not found' });
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// ============================================================
// BULK ENQUIRIES
// ============================================================

export async function createBulkEnquiry(req: Request, res: Response) {
    try {
        const { businessName, contactPerson, email, phone, productInterest, estimatedQuantity, message } = req.body;
        if (!contactPerson || !phone || !email) {
            return res.status(400).json({ success: false, message: 'Contact person, email, and phone are required' });
        }
        const enquiry = await googleSheets.createBulkEnquiry({
            businessName, contactPerson, email, phone, productInterest,
            estimatedQuantity, message, status: 'NEW'
        });
        res.json({ success: true, data: enquiry, message: 'Enquiry submitted successfully! We will contact you soon.' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function getAllBulkEnquiries(req: AuthRequest, res: Response) {
    try {
        const enquiries = await googleSheets.getAllBulkEnquiries();
        res.json({ success: true, data: enquiries });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function updateBulkEnquiryStatus(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        if (!status) return res.status(400).json({ success: false, message: 'Status is required' });
        const enquiry = await googleSheets.updateBulkEnquiry(id, { status, notes });
        if (!enquiry) return res.status(404).json({ success: false, message: 'Enquiry not found' });
        res.json({ success: true, data: enquiry });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// ============================================================
// VIDEO REVIEWS
// ============================================================

export async function getVideoReviews(req: Request, res: Response) {
    try {
        const reviews = await googleSheets.getVideoReviews();
        res.json({ success: true, data: reviews });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function createVideoReview(req: AuthRequest, res: Response) {
    try {
        const { customerName, driveLink, productName, description, status } = req.body;
        if (!customerName || !driveLink) {
            return res.status(400).json({ success: false, message: 'Customer name and Drive link are required' });
        }
        const review = await googleSheets.createVideoReview({
            customerName, driveLink, productName, description,
            status: status || 'published', createdBy: req.user?.id
        });
        res.json({ success: true, data: review });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function updateVideoReview(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const review = await googleSheets.updateVideoReview(id, req.body);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
        res.json({ success: true, data: review });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function deleteVideoReview(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const success = await googleSheets.deleteVideoReview(id);
        if (!success) return res.status(404).json({ success: false, message: 'Review not found' });
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// ============================================================
// PRODUCTION VIDEOS
// ============================================================

export async function getProductionVideos(req: Request, res: Response) {
    try {
        const videos = await googleSheets.getProductionVideos();
        res.json({ success: true, data: videos });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function createProductionVideo(req: AuthRequest, res: Response) {
    try {
        const { title, driveLink, description, thumbnailUrl, priority } = req.body;
        if (!title || !driveLink) {
            return res.status(400).json({ success: false, message: 'Title and Drive link are required' });
        }
        const video = await googleSheets.createProductionVideo({
            title, driveLink, description, thumbnailUrl,
            priority: priority || 0, createdBy: req.user?.id
        });
        res.json({ success: true, data: video });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function updateProductionVideo(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const video = await googleSheets.updateProductionVideo(id, req.body);
        if (!video) return res.status(404).json({ success: false, message: 'Video not found' });
        res.json({ success: true, data: video });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function deleteProductionVideo(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const success = await googleSheets.deleteProductionVideo(id);
        if (!success) return res.status(404).json({ success: false, message: 'Video not found' });
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// ============================================================
// WHATSAPP REVIEWS
// ============================================================

export async function getWhatsAppReviews(req: Request, res: Response) {
    try {
        const reviews = await googleSheets.getWhatsAppReviews();
        res.json({ success: true, data: reviews });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function createWhatsAppReview(req: AuthRequest, res: Response) {
    try {
        const { customerName, screenshotUrl, message, location, productName, status } = req.body;
        if (!customerName) {
            return res.status(400).json({ success: false, message: 'Customer name is required' });
        }
        const review = await googleSheets.createWhatsAppReview({
            customerName, screenshotUrl, message, location, productName,
            status: status || 'active'
        });
        res.json({ success: true, data: review });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function updateWhatsAppReview(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const review = await googleSheets.updateWhatsAppReview(id, req.body);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
        res.json({ success: true, data: review });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function deleteWhatsAppReview(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const success = await googleSheets.deleteWhatsAppReview(id);
        if (!success) return res.status(404).json({ success: false, message: 'Review not found' });
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Alias functions for consistency with route names
export async function getAllLaunches(req: Request, res: Response) {
    return getUpcomingProducts(req, res);
}

export async function createLaunch(req: AuthRequest, res: Response) {
    return createUpcomingProduct(req, res);
}

export default {
    getUpcomingProducts, createUpcomingProduct, updateUpcomingProduct, deleteUpcomingProduct,
    createBulkEnquiry, getAllBulkEnquiries, updateBulkEnquiryStatus,
    getVideoReviews, createVideoReview, updateVideoReview, deleteVideoReview,
    getProductionVideos, createProductionVideo, updateProductionVideo, deleteProductionVideo,
    getWhatsAppReviews, createWhatsAppReview, updateWhatsAppReview, deleteWhatsAppReview,
    getAllLaunches, createLaunch,
};
