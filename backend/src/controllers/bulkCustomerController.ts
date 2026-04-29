import { Request, Response } from "express";
import supabase from "../services/supabase";
import { UserRole } from "../types";

// Get all bulk customers (SUPER_ADMIN only)
export async function getAll(req: Request, res: Response): Promise<void> {
    try {
        const user = (req as any).user;

        // Only SUPER_ADMIN can see all customers
        if (user.role !== UserRole.SUPER_ADMIN) {
            res.status(403).json({
                success: false,
                message: "Access denied. Only Super Admin can view all customers.",
            });
            return;
        }

        const customers = await supabase.getAllBulkCustomers();
        res.json({ success: true, data: customers });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Get own customers (current user only)
export async function getMine(req: Request, res: Response): Promise<void> {
    try {
        const user = (req as any).user;
        const customers = await supabase.getBulkCustomersByUser(user.id);
        res.json({ success: true, data: customers });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Get team customers (HEAD_DISTRIBUTION sees own + team)
export async function getTeam(req: Request, res: Response): Promise<void> {
    try {
        const user = (req as any).user;

        // For HEAD_DISTRIBUTION - get team customers
        if (user.role === UserRole.HEAD_DISTRIBUTION) {
            const customers = await supabase.getBulkCustomersByTeam(user.id);
            res.json({ success: true, data: customers });
            return;
        }

        // For SUPER_ADMIN - return all
        if (user.role === UserRole.SUPER_ADMIN) {
            const customers = await supabase.getAllBulkCustomers();
            res.json({ success: true, data: customers });
            return;
        }

        // For TECHNICAL_ANALYST, SALES, and others - return only own customers
        const customers = await supabase.getBulkCustomersByUser(user.id);
        res.json({ success: true, data: customers });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Create bulk customer
export async function create(req: Request, res: Response): Promise<void> {
    try {
        const user = (req as any).user;
        const data = req.body;

        const customer = await supabase.createBulkCustomer({
            ...data,
            createdBy: user.id,
            managerId: user.managerId || user.id, // For hierarchy
        });

        res.status(201).json({ success: true, data: customer });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Update bulk customer
export async function update(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const updates = req.body;

        const customer = await supabase.updateBulkCustomer(id, updates);
        if (!customer) {
            res.status(404).json({ success: false, message: "Customer not found" });
            return;
        }

        res.json({ success: true, data: customer });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Delete bulk customer
export async function remove(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const success = await supabase.deleteBulkCustomer(id);
        if (!success) {
            res.status(404).json({ success: false, message: "Customer not found" });
            return;
        }

        res.json({ success: true, message: "Customer deleted" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export default {
    getAll,
    getMine,
    getTeam,
    create,
    update,
    remove,
};
