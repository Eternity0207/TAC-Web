import { BulkPricingConfig, PackagingOption, OrderProduct } from '../types';

// Default packaging options (can be overridden from config)
const DEFAULT_PACKAGING_OPTIONS: PackagingOption[] = [
    { id: 'pkg-350', size: '350gm', weightInGrams: 350, isActive: true },
    { id: 'pkg-500', size: '500gm', weightInGrams: 500, isActive: true },
    { id: 'pkg-1000', size: '1kg', weightInGrams: 1000, isActive: true },
];

// Weight thresholds for bulk pricing tiers (in grams)
const TIER_5KG = 5000;
const TIER_10KG = 10000;

export interface BulkPriceCalculation {
    products: BulkOrderProduct[];
    subtotal: number;
    totalWeight: number;
    tier: '5kg' | '10kg' | 'regular';
    appliedMargin: number;
    savings: number;
}

export interface BulkOrderProduct extends OrderProduct {
    packaging: string;
    weightInGrams: number;
    mrp: number;
    discountedPrice: number;
}

/**
 * Calculate the pricing tier based on total weight
 */
export function getTier(totalWeightGrams: number): '5kg' | '10kg' | 'regular' {
    if (totalWeightGrams >= TIER_10KG) return '10kg';
    if (totalWeightGrams >= TIER_5KG) return '5kg';
    return 'regular';
}

/**
 * Calculate bulk order price based on products, quantities, and pricing config
 */
export function calculateBulkPrice(
    products: Array<{
        skuId: string;
        skuName: string;
        quantity: number;
        packaging: string;
        packagingWeight: number;
    }>,
    pricingConfigs: BulkPricingConfig[],
    packagingOptions: PackagingOption[]
): BulkPriceCalculation {
    // Calculate total weight
    let totalWeight = 0;
    const productDetails: BulkOrderProduct[] = [];

    products.forEach(product => {
        const weightInGrams = product.packagingWeight * product.quantity;
        totalWeight += weightInGrams;
    });

    // Determine pricing tier
    const tier = getTier(totalWeight);

    // Calculate prices for each product
    let subtotal = 0;
    let totalMRP = 0;

    products.forEach(product => {
        const config = pricingConfigs.find(c => c.skuId === product.skuId);

        if (!config) {
            throw new Error(`Pricing config not found for SKU: ${product.skuId}`);
        }

        const weightInGrams = product.packagingWeight * product.quantity;

        // Calculate price based on tier
        let unitPrice: number;
        let margin: number;

        switch (tier) {
            case '10kg':
                unitPrice = config.sellingPrice10kg;
                margin = config.margin10kg;
                break;
            case '5kg':
                unitPrice = config.sellingPrice5kg;
                margin = config.margin5kg;
                break;
            default:
                unitPrice = config.mrp;
                margin = 0;
        }

        // Price per unit (per package)
        const pricePerPackage = (unitPrice * product.packagingWeight) / 1000; // Price per kg -> per package
        const totalPrice = pricePerPackage * product.quantity;
        const mrpTotal = (config.mrp * product.packagingWeight / 1000) * product.quantity;

        subtotal += totalPrice;
        totalMRP += mrpTotal;

        productDetails.push({
            name: product.skuName,
            variant: product.packaging,
            quantity: product.quantity,
            unitPrice: pricePerPackage,
            totalPrice: totalPrice,
            packaging: product.packaging,
            weightInGrams: weightInGrams,
            mrp: config.mrp,
            discountedPrice: unitPrice,
        });
    });

    const appliedMargin = tier === '10kg' ?
        (pricingConfigs[0]?.margin10kg || 0) :
        tier === '5kg' ?
            (pricingConfigs[0]?.margin5kg || 0) :
            0;

    return {
        products: productDetails,
        subtotal: Math.round(subtotal * 100) / 100,
        totalWeight,
        tier,
        appliedMargin,
        savings: Math.round((totalMRP - subtotal) * 100) / 100,
    };
}

/**
 * Get available packaging options
 */
export function getPackagingOptions(configOptions?: PackagingOption[]): PackagingOption[] {
    const options = configOptions || DEFAULT_PACKAGING_OPTIONS;
    return options.filter(opt => opt.isActive);
}

/**
 * Get packaging weight in grams from size string
 */
export function getPackagingWeight(size: string): number {
    const option = DEFAULT_PACKAGING_OPTIONS.find(
        opt => opt.size.toLowerCase() === size.toLowerCase()
    );

    if (option) return option.weightInGrams;

    // Try to parse from string (e.g., "500gm" -> 500)
    const match = size.match(/(\d+)/);
    if (match) {
        const num = parseInt(match[1], 10);
        // If under 10, assume kg
        if (num < 10 && size.toLowerCase().includes('kg')) {
            return num * 1000;
        }
        return num;
    }

    return 0;
}

/**
 * Calculate selling price from MRP and margin percentage
 */
export function calculateSellingPrice(mrp: number, marginPercent: number): number {
    const discount = mrp * (marginPercent / 100);
    return Math.round((mrp - discount) * 100) / 100;
}

/**
 * Calculate margin percentage from MRP and selling price
 */
export function calculateMarginPercent(mrp: number, sellingPrice: number): number {
    if (mrp <= 0) return 0;
    const discount = mrp - sellingPrice;
    return Math.round((discount / mrp) * 100 * 100) / 100;
}

export default {
    calculateBulkPrice,
    getPackagingOptions,
    getPackagingWeight,
    calculateSellingPrice,
    calculateMarginPercent,
    getTier,
};
