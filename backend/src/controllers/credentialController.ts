import { Request, Response } from "express";
import supabase from "../services/supabase";

// Get all credentials (admin sees all, users see their own)
export async function getAll(req: Request, res: Response): Promise<void> {
    try {
        const user = (req as any).user;
        // TODO: Implement getAllCredentials method in supabase service
        // const credentials = await supabase.getAllCredentials();
        const credentials: any[] = [];

        // SUPER_ADMIN and ADMIN see all, others see only their own
        const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";
        const filtered = isAdmin
            ? credentials
            : credentials.filter((c: any) => c.assignedTo === user.id);

        res.json({ success: true, data: filtered });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Get credentials by user ID
export async function getByUser(req: Request, res: Response): Promise<void> {
    try {
        const { userId } = req.params;
        // TODO: Implement getCredentialsByUser method in supabase service
        // const credentials = await supabase.getCredentialsByUser(userId);
        const credentials: any[] = [];
        res.json({ success: true, data: credentials });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Create credential
export async function create(req: Request, res: Response): Promise<void> {
    try {
        const user = (req as any).user;
        const data = req.body;

        if (!data.platformName || !data.accountIdentifier || !data.password) {
            res.status(400).json({
                success: false,
                message: "Platform name, account identifier, and password are required",
            });
            return;
        }

        // TODO: Implement createCredential method in supabase service
        // const credential = await supabase.createCredential({
        //     ...data,
        //     createdBy: user.id,
        // });
        const credential = {
            ...data,
            createdBy: user.id,
            id: Date.now().toString(),
            createdAt: new Date().toISOString()
        };

        res.status(201).json({ success: true, data: credential });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Update credential
export async function update(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const updates = req.body;

        // TODO: Implement updateCredential method in supabase service
        // const credential = await supabase.updateCredential(id, updates);
        const credential = null;
        if (!credential) {
            res.status(404).json({ success: false, message: "Credential not found" });
            return;
        }

        res.json({ success: true, data: credential });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Delete credential
export async function remove(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        // TODO: Implement deleteCredential method in supabase service
        // const success = await supabase.deleteCredential(id);
        const success = false;
        if (!success) {
            res.status(404).json({ success: false, message: "Credential not found" });
            return;
        }

        res.json({ success: true, message: "Credential deleted" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Alias functions for consistency with route names
export async function getAllCredentials(req: Request, res: Response): Promise<void> {
    return getAll(req, res);
}

export async function createCredential(req: Request, res: Response): Promise<void> {
    return create(req, res);
}

export async function updateCredential(req: Request, res: Response): Promise<void> {
    return update(req, res);
}

export async function deleteCredential(req: Request, res: Response): Promise<void> {
    return remove(req, res);
}

export default {
    getAll,
    getByUser,
    create,
    update,
    remove,
    getAllCredentials,
    createCredential,
    updateCredential,
    deleteCredential,
};
