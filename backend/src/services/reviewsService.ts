export interface Review {
    id: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    rating: number;
    reviewText: string;
    productName: string;
    city: string;
    photo?: string;
    photoMimeType?: string;
    photoUrl?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    approvedAt: string;
    rejectedAt: string;
}

async function callReviewsScript(action: string, payload: any = {}, requiresAuth: boolean = false) {
    const { callPostgresAction } = await import('../repos/googleSheetsRepo');
    return await callPostgresAction(action, payload);
}

export async function submitReview(data: Partial<Review>): Promise<{ success: boolean; message: string; data?: Review }> {
    const result = await callReviewsScript('submitReview', data, false);
    return { success: !!result.success, message: result.message || 'Failed', data: result.data };
}

export async function getApprovedReviews(): Promise<Review[]> {
    const result = await callReviewsScript('getApprovedReviews', {}, false);
    if (!result.success) throw new Error(result.message);
    return result.data || [];
}

export async function getAllReviews(): Promise<Review[]> {
    const result = await callReviewsScript('getAllReviews', {}, true);
    if (!result.success) throw new Error(result.message);
    return result.data || [];
}

export async function updateReviewStatus(id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING'): Promise<{ success: boolean; message: string }> {
    const result = await callReviewsScript('updateReviewStatus', { id, status }, true);
    return { success: !!result.success, message: result.message || 'Failed' };
}

export async function deleteReview(id: string): Promise<{ success: boolean; message: string }> {
    const result = await callReviewsScript('deleteReview', { id }, true);
    return { success: !!result.success, message: result.message || 'Failed' };
}

export async function getReviewPhoto(id: string): Promise<{ photo: string; mimeType: string } | null> {
    const result = await callReviewsScript('getReviewPhoto', { id }, false);
    if (!result.success) return null;
    return result.data;
}

export default {
    submitReview,
    getApprovedReviews,
    getAllReviews,
    updateReviewStatus,
    deleteReview,
    getReviewPhoto,
};
