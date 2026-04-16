import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function parseBooleanEnv(value: string | undefined): boolean | undefined {
    if (value == null || value.trim() === '') return undefined;
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return undefined;
}

const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpSecure = parseBooleanEnv(process.env.SMTP_SECURE) ?? smtpPort === 465;

export const config = {
    port: parseInt(process.env.PORT || '3003', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret',

    backendStorage: 'postgres' as const,
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    supabaseProfilePhotosBucket: process.env.SUPABASE_PROFILE_PHOTOS_BUCKET || 'profile-photos',
    credentialsEncryptionKey: process.env.CREDENTIALS_ENCRYPTION_KEY || '',

    payu: {
        merchantKey: process.env.PAYU_MERCHANT_KEY || '',
        merchantSalt: process.env.PAYU_MERCHANT_SALT || '',
        authHeader: process.env.PAYU_AUTH_HEADER || '',
    },

    upi: {
        id: process.env.UPI_ID || '',
        payeeName: process.env.UPI_PAYEE_NAME || 'The Awla Company',
    },

    n8nWebhookSecret: process.env.N8N_WEBHOOK_SECRET || '',

    email: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: smtpPort,
        secure: smtpSecure,
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.EMAIL_FROM || 'orders@theawlacompany.com',
    },

    admin: {
        email: process.env.ADMIN_EMAIL || 'admin@theawlacompany.com',
        password: process.env.ADMIN_PASSWORD || 'change-this',
    },

    frontendUrl: process.env.FRONTEND_URL || 'https://theawlacompany.com',
    adminUrl: process.env.ADMIN_URL || 'https://admin.theawlacompany.com',
    backendUrl: process.env.BACKEND_URL || process.env.ADMIN_URL || 'https://admin.theawlacompany.com',
    uploadsUrl: process.env.BACKEND_UPLOADS_URL || `${process.env.BACKEND_URL || process.env.ADMIN_URL || 'https://admin.theawlacompany.com'}/uploads`,

    corsOrigins: process.env.CORS_ORIGINS ?
        process.env.CORS_ORIGINS.split(',') :
        [
            'https://theawlacompany.com',
            'https://admin.theawlacompany.com'
        ],
};
