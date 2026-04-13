import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AdminUser } from '../types';

export interface AuthRequest extends Request {
    user?: AdminUser;
    userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'Authorization required' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, config.jwtSecret) as {
            id: string;
            userId?: string;
            email: string;
            role: string;
            name?: string
        };

        // Support both id and userId patterns from different systems
        const userId = decoded.id || decoded.userId;

        req.user = {
            ...decoded,
            id: userId!
        } as AdminUser;
        req.userId = userId;
        next();
    } catch {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
}

export function authorize(...roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: 'Access forbidden. Insufficient permissions.'
            });
            return;
        }

        next();
    };
}

export function n8nWebhookAuth(req: Request, res: Response, next: NextFunction): void {
    const webhookSecret = req.headers['x-webhook-secret'];
    if (!webhookSecret || webhookSecret !== config.n8nWebhookSecret) {
        res.status(401).json({ success: false, message: 'Invalid webhook secret' });
        return;
    }
    next();
}

// Legacy auth function for compatibility with existing JavaScript routes
export const auth = authMiddleware;