import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AdminUser } from '../types';

export interface AuthRequest extends Request {
    user?: AdminUser;
    userId?: string;
}

function parseCookies(cookieHeader?: string): Record<string, string> {
    if (!cookieHeader) return {};

    return cookieHeader.split(';').reduce((acc, part) => {
        const [rawKey, ...rawValue] = part.trim().split('=');
        if (!rawKey) return acc;

        acc[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.join('='));
        return acc;
    }, {} as Record<string, string>);
}

export function extractTokenFromRequest(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }

    const cookies = parseCookies(req.headers.cookie);
    if (cookies.token) {
        return cookies.token;
    }

    return null;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
    const token = extractTokenFromRequest(req);
    if (!token) {
        res.status(401).json({ success: false, message: 'Authorization required' });
        return;
    }

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