async function callAction(action: string, payload: any = {}) {
    const { callPostgresAction } = await import('../repos/googleSheetsRepo');
    return await callPostgresAction(action, payload);
}

async function callAppsScript(action: string, payload: any = {}) {
    return await callAction(action, payload);
}

export interface ProductVariant {
    weight: string;
    price: number;
    mrp: number;
    weightValue?: number;
    weightUnit?: string;
    stockStatus?: string;
    stockQuantity?: number;
}

export interface Product {
    id: string;
    name: string;
    slug: string;
    shortDescription: string;
    description: string;
    imageUrl: string;
    variants: ProductVariant[];
    category: string;
    avgRating: number;
    reviewCount: number;
    isFeatured: boolean;
    isActive: boolean;
    displayOrder: number;
    stockStatus?: string;
    stockQuantity?: number;
    createdAt: string;
    updatedAt: string;
}

function parseVariants(value: any): ProductVariant[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

function normalizeProduct<T extends any>(product: T): T {
    if (!product || typeof product !== 'object') return product;
    const data: any = { ...product };
    data.variants = parseVariants((product as any).variants);

    if (typeof data.galleryImages === 'string') {
        try {
            const parsed = JSON.parse(data.galleryImages);
            data.galleryImages = Array.isArray(parsed) ? parsed : [];
        } catch {
            data.galleryImages = [];
        }
    }

    return data as T;
}

export async function getAllProducts(): Promise<Product[]> {
    const result = await callAppsScript('getAllProducts');
    if (!result.success) throw new Error(result.message);
    const rows = Array.isArray(result.data) ? result.data : [];
    return rows.map((p) => normalizeProduct(p));
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
    const result = await callAppsScript('getProductBySlug', { slug });
    if (!result.success) return null;
    return normalizeProduct(result.data);
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
    const payload = { ...data };
    payload.variants = parseVariants((payload as any).variants) as any;
    const result = await callAppsScript('createProduct', payload);
    if (!result.success) throw new Error(result.message);
    return normalizeProduct(result.data);
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const payload = { ...updates };
    payload.variants = parseVariants((payload as any).variants) as any;
    const result = await callAppsScript('updateProduct', { id, updates: payload });
    if (!result.success) return null;
    return normalizeProduct(result.data);
}

export async function deleteProduct(id: string): Promise<boolean> {
    const result = await callAppsScript('deleteProduct', { id });
    return result.success;
}

export default {
    getAllProducts,
    getProductBySlug,
    createProduct,
    updateProduct,
    deleteProduct,
};
