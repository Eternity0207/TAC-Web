import { Response } from 'express';
import supabase from "../services/supabase";
import bulkPricingService from '../services/bulkPricingService';
import {
    getResolvedBulkPricingConfig,
    getResolvedPackagingOptions
} from '../services/bulkConfigResolver';
import { AuthRequest } from '../middleware/auth';
import { UserRole, BulkPricingConfig, PackagingOption } from '../types';

// Check if user has Super Admin access
function isSuperAdmin(req: AuthRequest): boolean {
    return req.user?.role === UserRole.SUPER_ADMIN;
}

// Check if user has Admin or higher access
function hasAdminAccess(req: AuthRequest): boolean {
    return req.user?.role === UserRole.SUPER_ADMIN || req.user?.role === UserRole.ADMIN;
}

/**
 * Get bulk pricing configuration for all SKUs
 */
export async function getBulkPricingConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!hasAdminAccess(req)) {
            res.status(403).json({ success: false, message: 'Admin access required' });
            return;
        }

        const config = await getResolvedBulkPricingConfig();

        res.json({
            success: true,
            data: config,
        });
    } catch (error) {
        console.error('Get bulk pricing config error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch pricing config' });
    }
}

/**
 * Update bulk pricing configuration for SKUs (Super Admin only)
 */
export async function updateBulkPricingConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!isSuperAdmin(req)) {
            res.status(403).json({ success: false, message: 'Super Admin access required' });
            return;
        }

        const { skuConfigs }: { skuConfigs: BulkPricingConfig[] } = req.body;

        if (!skuConfigs || !Array.isArray(skuConfigs)) {
            res.status(400).json({ success: false, message: 'SKU configs array required' });
            return;
        }

        // Validate and calculate selling prices if margins provided
        const processedConfigs = skuConfigs.map(config => ({
            ...config,
            sellingPrice5kg: config.sellingPrice5kg ||
                bulkPricingService.calculateSellingPrice(config.mrp, config.margin5kg),
            sellingPrice10kg: config.sellingPrice10kg ||
                bulkPricingService.calculateSellingPrice(config.mrp, config.margin10kg),
        }));

        await supabase.updateConfig('bulk_pricing', processedConfigs);

        res.json({
            success: true,
            message: 'Bulk pricing config updated',
            data: processedConfigs,
        });
    } catch (error) {
        console.error('Update bulk pricing config error:', error);
        res.status(500).json({ success: false, message: 'Failed to update pricing config' });
    }
}

/**
 * Get packaging options
 */
export async function getPackagingConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!hasAdminAccess(req)) {
            res.status(403).json({ success: false, message: 'Admin access required' });
            return;
        }

        const options = await getResolvedPackagingOptions();

        res.json({
            success: true,
            data: options,
        });
    } catch (error) {
        console.error('Get packaging config error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch packaging config' });
    }
}

/**
 * Update packaging options (Super Admin only)
 */
export async function updatePackagingConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!isSuperAdmin(req)) {
            res.status(403).json({ success: false, message: 'Super Admin access required' });
            return;
        }

        const { packagingOptions }: { packagingOptions: PackagingOption[] } = req.body;

        if (!packagingOptions || !Array.isArray(packagingOptions)) {
            res.status(400).json({ success: false, message: 'Packaging options array required' });
            return;
        }

        await supabase.updateConfig('packaging', packagingOptions);

        res.json({
            success: true,
            message: 'Packaging config updated',
            data: packagingOptions,
        });
    } catch (error) {
        console.error('Update packaging config error:', error);
        res.status(500).json({ success: false, message: 'Failed to update packaging config' });
    }
}

/**
 * Get all SKUs with their pricing information
 */
export async function getSKUs(req: AuthRequest, res: Response): Promise<void> {
    try {
        const skus = await supabase.getSKUs();

        res.json({
            success: true,
            data: skus || [],
        });
    } catch (error) {
        console.error('Get SKUs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch SKUs' });
    }
}

/**
 * Update SKU pricing (Super Admin only)
 */
export async function updateSKUPricing(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!isSuperAdmin(req)) {
            res.status(403).json({ success: false, message: 'Super Admin access required' });
            return;
        }

        const { skuId } = req.params;
        const { mrp, margin5kg, margin10kg, sellingPrice5kg, sellingPrice10kg } = req.body;

        const updates: Partial<BulkPricingConfig> = {};
        if (mrp !== undefined) updates.mrp = mrp;
        if (margin5kg !== undefined) updates.margin5kg = margin5kg;
        if (margin10kg !== undefined) updates.margin10kg = margin10kg;

        // Calculate selling prices from margins if not provided
        if (mrp !== undefined) {
            if (sellingPrice5kg !== undefined) {
                updates.sellingPrice5kg = sellingPrice5kg;
            } else if (margin5kg !== undefined) {
                updates.sellingPrice5kg = bulkPricingService.calculateSellingPrice(mrp, margin5kg);
            }

            if (sellingPrice10kg !== undefined) {
                updates.sellingPrice10kg = sellingPrice10kg;
            } else if (margin10kg !== undefined) {
                updates.sellingPrice10kg = bulkPricingService.calculateSellingPrice(mrp, margin10kg);
            }
        }

        const updated = await supabase.updateSKUPricing(skuId, updates);

        if (!updated) {
            res.status(404).json({ success: false, message: 'SKU not found' });
            return;
        }

        res.json({
            success: true,
            message: 'SKU pricing updated',
            data: updated,
        });
    } catch (error) {
        console.error('Update SKU pricing error:', error);
        res.status(500).json({ success: false, message: 'Failed to update SKU pricing' });
    }
}

/**
 * Preview bulk price calculation
 */
export async function previewBulkPrice(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { products } = req.body;

        if (!products || !Array.isArray(products) || products.length === 0) {
            res.status(400).json({ success: false, message: 'Products array required' });
            return;
        }

        // Get pricing configs and packaging options
        const pricingConfigs = await getResolvedBulkPricingConfig();
        const packagingOptions = await getResolvedPackagingOptions();

        if (!pricingConfigs || pricingConfigs.length === 0) {
            res.status(400).json({ success: false, message: 'No pricing configuration found. Please configure bulk pricing first.' });
            return;
        }

        const calculation = bulkPricingService.calculateBulkPrice(
            products,
            pricingConfigs,
            packagingOptions
        );

        res.json({
            success: true,
            data: calculation,
        });
    } catch (error: any) {
        console.error('Preview bulk price error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to calculate bulk price' });
    }
}

/**
 * Get all wholesale SKUs with cost/price/margin info
 */
export async function getWholesaleSKUs(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!hasAdminAccess(req)) {
            res.status(403).json({ success: false, message: 'Admin access required' });
            return;
        }

        const skus = await supabase.getWholesaleSKUs();

        res.json({
            success: true,
            data: skus || [],
        });
    } catch (error) {
        console.error('Get wholesale SKUs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch wholesale SKUs' });
    }
}

/**
 * Update wholesale SKU pricing (Super Admin only)
 */
export async function updateWholesaleSKU(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!isSuperAdmin(req)) {
            res.status(403).json({ success: false, message: 'Super Admin access required' });
            return;
        }

        const { skuId } = req.params;
        const { skuName, costPrice, wholesalePrice, minQuantity } = req.body;

        const updates: any = {};
        if (skuName !== undefined) updates.skuName = skuName;
        if (costPrice !== undefined) updates.costPrice = parseFloat(costPrice);
        if (wholesalePrice !== undefined) updates.wholesalePrice = parseFloat(wholesalePrice);
        if (minQuantity !== undefined) updates.minQuantity = parseInt(minQuantity);

        const updated = await supabase.updateWholesaleSKU(skuId, updates);

        if (!updated) {
            res.status(404).json({ success: false, message: 'SKU not found' });
            return;
        }

        res.json({
            success: true,
            message: 'Wholesale SKU pricing updated',
            data: updated,
        });
    } catch (error) {
        console.error('Update wholesale SKU error:', error);
        res.status(500).json({ success: false, message: 'Failed to update wholesale SKU' });
    }
}

// =============================================================================
// General Configuration Management
// =============================================================================

// Get general configuration
export async function getConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
        const config = await supabase.getConfig('general');

        res.json({
            success: true,
            data: config || {
                bulkPricing: {},
                packaging: {},
                commissionSettings: {},
                general: {}
            }
        });
    } catch (error) {
        console.error('Get config error:', error);
        res.status(500).json({ success: false, message: 'Failed to get configuration' });
    }
}

// Update general configuration
export async function updateConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
        const configData = req.body;

        const updatedConfig = await supabase.updateConfig('general', configData);

        res.json({
            success: true,
            message: 'Configuration updated successfully',
            data: updatedConfig
        });
    } catch (error) {
        console.error('Update config error:', error);
        res.status(500).json({ success: false, message: 'Failed to update configuration' });
    }
}

// Get settings (aliases for config)
export async function getSettings(req: AuthRequest, res: Response): Promise<void> {
    return getConfig(req, res);
}

// Update settings (aliases for config)
export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
    return updateConfig(req, res);
}

// Get commission settings
export async function getCommissionSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
        // Use config method with commission type
        const commissionSettings = await supabase.getConfig('commission');

        res.json({
            success: true,
            data: commissionSettings || {
                distributionCommission: 10,
                referralBonus: 5,
                performanceBonus: 3,
                minOrderAmount: 500
            }
        });
    } catch (error) {
        console.error('Get commission settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to get commission settings' });
    }
}

// Update commission settings
export async function updateCommissionSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
        const commissionData = req.body;

        const updatedSettings = await supabase.updateConfig('commission', commissionData);

        res.json({
            success: true,
            message: 'Commission settings updated successfully',
            data: updatedSettings
        });
    } catch (error) {
        console.error('Update commission settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to update commission settings' });
    }
}

export default {
    getBulkPricingConfig,
    updateBulkPricingConfig,
    getPackagingConfig,
    updatePackagingConfig,
    getSKUs,
    updateSKUPricing,
    previewBulkPrice,
    getWholesaleSKUs,
    updateWholesaleSKU,
    getConfig,
    updateConfig,
    getSettings,
    updateSettings,
    getCommissionSettings,
    updateCommissionSettings,
};
