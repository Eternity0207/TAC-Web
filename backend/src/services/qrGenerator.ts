import QRCode from 'qrcode';
import { config } from '../config';

interface QRParams {
    amount: number;
    orderNumber: string;
}

export function generateUPIString(params: QRParams): string {
    const { amount, orderNumber } = params;
    const upiId = config.upi.id;
    const payeeName = encodeURIComponent(config.upi.payeeName);
    const txnNote = encodeURIComponent(`Order ${orderNumber}`);
    return `upi://pay?pa=${upiId}&pn=${payeeName}&am=${amount.toFixed(2)}&cu=INR&tn=${txnNote}`;
}

export async function generateQRCodeBase64(params: QRParams): Promise<string> {
    const upiString = generateUPIString(params);
    return QRCode.toDataURL(upiString, { width: 300, margin: 2 });
}

export function getUPIDeepLink(params: QRParams): string {
    return generateUPIString(params);
}

export default { generateUPIString, generateQRCodeBase64, getUPIDeepLink };
