import QRCode from 'qrcode';
import { config } from '../config';

interface QRParams {
    amount: number;
    orderNumber: string;
}

function validateParams(params: QRParams): { amount: number; orderNumber: string } {
    const orderNumber = String(params?.orderNumber || '').trim();
    if (!orderNumber) {
        throw new Error('Order number is required to generate UPI QR');
    }

    const amount = Number(params?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number to generate UPI QR');
    }

    return {
        orderNumber,
        amount: Math.round((amount + Number.EPSILON) * 100) / 100,
    };
}

export function generateUPIString(params: QRParams): string {
    const { amount, orderNumber } = validateParams(params);
    const upiId = String(config.upi.id || '').trim();
    if (!upiId) {
        throw new Error('UPI ID is not configured');
    }

    const payeeName = encodeURIComponent(config.upi.payeeName);
    const txnNote = encodeURIComponent(`Order ${orderNumber}`);
    return `upi://pay?pa=${upiId}&pn=${payeeName}&am=${amount.toFixed(2)}&cu=INR&tn=${txnNote}`;
}

export async function generateQRCodeBase64(params: QRParams): Promise<string> {
    const upiString = generateUPIString(params);
    return QRCode.toDataURL(upiString, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: 'M',
    });
}

export function getUPIDeepLink(params: QRParams): string {
    return generateUPIString(params);
}

export default { generateUPIString, generateQRCodeBase64, getUPIDeepLink };
