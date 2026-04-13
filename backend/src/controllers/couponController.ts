import { Request, Response } from "express";
import googleSheets from "../services/googleSheets";

// Get all coupons (admin only)
export async function getAll(req: Request, res: Response): Promise<void> {
    try {
        const coupons = await googleSheets.getAllCoupons();
        res.json({ success: true, data: coupons });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Create coupon
export async function create(req: Request, res: Response): Promise<void> {
    try {
        const user = (req as any).user;
        const data = req.body;

        if (!data.couponCode) {
            res.status(400).json({ success: false, message: "Coupon code is required" });
            return;
        }

        const coupon = await googleSheets.createCoupon({
            ...data,
            createdBy: user.id,
        });

        res.status(201).json({ success: true, data: coupon });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Update coupon
export async function update(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const updates = req.body;

        const coupon = await googleSheets.updateCoupon(id, updates);
        if (!coupon) {
            res.status(404).json({ success: false, message: "Coupon not found" });
            return;
        }

        res.json({ success: true, data: coupon });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Delete coupon
export async function remove(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const success = await googleSheets.deleteCoupon(id);
        if (!success) {
            res.status(404).json({ success: false, message: "Coupon not found" });
            return;
        }

        res.json({ success: true, message: "Coupon deleted" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Validate coupon (PUBLIC endpoint for landing page)
export async function validate(req: Request, res: Response): Promise<void> {
    try {
        const { couponCode, subtotal } = req.body;

        if (!couponCode) {
            res.status(400).json({ valid: false, message: "Code required" });
            return;
        }

        const result = await googleSheets.validateCoupon(
            couponCode,
            parseFloat(subtotal) || 0
        );

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ valid: false, message: "Error" });
    }
}

// Apply coupon (increment usage count) - called when order is placed
export async function apply(req: Request, res: Response): Promise<void> {
    try {
        const { couponCode } = req.body;

        if (!couponCode) {
            res.status(400).json({ success: false, message: "Coupon code is required" });
            return;
        }

        const success = await googleSheets.applyCoupon(couponCode);
        if (!success) {
            res.status(404).json({ success: false, message: "Coupon not found" });
            return;
        }

        res.json({ success: true, message: "Coupon usage recorded" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Get valid coupons for frontend use
export async function getValidCoupons(req: Request, res: Response): Promise<void> {
    try {
        const coupons = await googleSheets.getAllCoupons();
        res.json({ success: true, data: coupons || [] });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Create coupon (alias for create)
export async function createCoupon(req: Request, res: Response): Promise<void> {
    return create(req, res);
}

// Update coupon (alias for update)
export async function updateCoupon(req: Request, res: Response): Promise<void> {
    return update(req, res);
}

// Delete coupon (alias for remove)
export async function deleteCoupon(req: Request, res: Response): Promise<void> {
    return remove(req, res);
}

export default {
    getAll,
    create,
    update,
    remove,
    validate,
    apply,
    getValidCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
};
