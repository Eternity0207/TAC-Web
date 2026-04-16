import nodemailer from 'nodemailer';
import { config } from '../config';
import { Order } from '../types';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: config.email.user && config.email.pass ? {
    user: config.email.user,
    pass: config.email.pass,
  } : undefined,
  requireTLS: !config.email.secure,
  tls: {
    rejectUnauthorized: false
  }
});

function getQrBuffer(qrCodeBase64: string): Buffer {
  const cleaned = String(qrCodeBase64 || '')
    .trim()
    .replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(cleaned, 'base64');
}

export async function sendOrderConfirmation(order: Order, qrCodeBase64: string): Promise<void> {
  const qrBuffer = getQrBuffer(qrCodeBase64);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a7c23;">Order Confirmation</h2>
      <p>Dear ${order.customerName},</p>
      <p>Thank you for your order! Your order number is: <strong>${order.orderNumber}</strong></p>
      <h3>Order Total: ₹${order.totalAmount.toFixed(2)}</h3>
      <p>Please scan the QR code below to complete your payment:</p>
      <div style="text-align: center; margin: 20px 0;">
        <img src="cid:orderpaymentqr" alt="Payment QR Code" style="max-width: 250px; width: 250px; height: 250px; object-fit: contain; border: 1px solid #e5e5e5; border-radius: 8px;"/>
      </div>
      <p>Thank you for choosing The Awla Company!</p>
    </div>
  `;

  await transporter.sendMail({
    from: config.email.from,
    to: order.customerEmail,
    subject: `Order Confirmation - ${order.orderNumber}`,
    html,
    attachments: [{
      filename: `PaymentQR-${order.orderNumber}.png`,
      content: qrBuffer,
      contentType: 'image/png',
      cid: 'orderpaymentqr'
    }]
  });
}

export async function sendPaymentConfirmation(order: Order): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a7c23;">Payment Received!</h2>
      <p>Dear ${order.customerName},</p>
      <p>We have received your payment of <strong>₹${order.totalAmount.toFixed(2)}</strong> for order <strong>${order.orderNumber}</strong>.</p>
      <p>Your order is now being processed and will be shipped soon.</p>
      <p>Thank you for your purchase!</p>
    </div>
  `;

  await transporter.sendMail({
    from: config.email.from,
    to: order.customerEmail,
    subject: `Payment Received - ${order.orderNumber}`,
    html,
  });
}

export async function sendShippingNotification(order: Order, invoicePdf: Buffer): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a7c23;">Your Order Has Been Shipped!</h2>
      <p>Dear ${order.customerName},</p>
      <p>Your order <strong>${order.orderNumber}</strong> has been shipped!</p>
      <p><strong>Tracking ID:</strong> ${order.trackingId}</p>
      <p><strong>Delivery Partner:</strong> ${order.deliveryPartner}</p>
      ${order.trackingUrl ? `<p><a href="${order.trackingUrl}" style="color: #4a7c23;">Track Your Package</a></p>` : ''}
      <p>Your invoice is attached to this email.</p>
      <p>Thank you for shopping with The Awla Company!</p>
    </div>
  `;

  await transporter.sendMail({
    from: config.email.from,
    to: order.customerEmail,
    subject: `Order Shipped - ${order.orderNumber}`,
    html,
    attachments: [{
      filename: `Invoice-${order.invoiceNumber || order.orderNumber}.pdf`,
      content: invoicePdf,
    }],
  });
}

export async function sendPaymentQREmail(order: Order, qrCodeBase64: string): Promise<void> {
  const qrBuffer = getQrBuffer(qrCodeBase64);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 30px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4a7c23; margin: 0;">🌿 The Awla Company</h1>
        <p style="color: #666; margin: 4px 0;">Royal Way to Stay Healthy</p>
      </div>
      <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-top: 0;">Payment Request</h2>
        <p>Dear <strong>${order.customerName}</strong>,</p>
        <p>Please complete your payment for the following order:</p>
        <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p style="margin: 4px 0;"><strong>Total Amount:</strong> <span style="color: #4a7c23; font-size: 1.2em; font-weight: bold;">₹${order.totalAmount.toFixed(2)}</span></p>
        </div>
        <div style="text-align: center; margin: 24px 0; padding: 20px; background: #fff; border: 2px dashed #4a7c23; border-radius: 12px;">
          <p style="margin: 0 0 16px 0; color: #666;">Scan the QR code to pay:</p>
          <img src="cid:paymentqr" alt="Payment QR Code" style="max-width: 220px; border-radius: 8px;"/>
          <p style="margin: 16px 0 0 0; font-size: 1.3em; font-weight: bold; color: #4a7c23;">₹${order.totalAmount.toFixed(2)}</p>
        </div>
        <p style="color: #666; font-size: 0.9em;">After payment, please share the transaction ID with us for verification.</p>
      </div>
      <div style="text-align: center; margin-top: 24px; color: #888; font-size: 0.85em;">
        <p>Thank you for choosing The Awla Company!</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: config.email.from,
    to: order.customerEmail,
    subject: `Payment Request - Order ${order.orderNumber} - The Awla Company`,
    html,
    attachments: [{
      filename: 'payment-qr.png',
      content: qrBuffer,
      cid: 'paymentqr'
    }]
  });
}

export async function sendInvoiceEmail(order: Order, invoicePdf: Buffer): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a7c23;">Your Invoice from The Awla Company</h2>
      <p>Dear ${order.customerName},</p>
      <p>Please find attached the invoice for your order <strong>${order.orderNumber}</strong>.</p>
      <p><strong>Invoice Number:</strong> ${order.invoiceNumber}</p>
      <p><strong>Total Amount:</strong> Rs. ${order.totalAmount.toFixed(2)}</p>
      <p>Thank you for your purchase!</p>
      <div style="margin-top: 24px; color: #888; font-size: 0.85em;">
        <p>The Awla Company - Royal Way to Stay Healthy</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: config.email.from,
    to: order.customerEmail,
    subject: `Invoice ${order.invoiceNumber} - The Awla Company`,
    html,
    attachments: [{
      filename: `Invoice-${order.invoiceNumber}.pdf`,
      content: invoicePdf,
      contentType: 'application/pdf'
    }]
  });
}

export async function sendBulkPaymentConfirmation(order: any, paymentType: string, txnId: string): Promise<void> {
  const paymentLabel = paymentType === 'prepaid' ? 'Advance Payment' : 'Credit Payment';
  const amountPaid = paymentType === 'prepaid' ? order.prepaidAmount : order.creditAmount;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a7c23;">${paymentLabel} Received!</h2>
      <p>Dear ${order.customerName},</p>
      <p>We have received your ${paymentLabel.toLowerCase()} of <strong>₹${amountPaid?.toFixed(2) || '0.00'}</strong> for bulk order <strong>${order.orderNumber}</strong>.</p>
      ${order.businessName ? `<p><strong>Business:</strong> ${order.businessName}</p>` : ''}
      <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p style="margin: 4px 0;"><strong>Transaction ID:</strong> ${txnId}</p>
        <p style="margin: 4px 0;"><strong>Payment Type:</strong> ${paymentLabel}</p>
        <p style="margin: 4px 0;"><strong>Amount Paid:</strong> ₹${amountPaid?.toFixed(2) || '0.00'}</p>
        <p style="margin: 4px 0;"><strong>Total Order Value:</strong> ₹${order.totalAmount?.toFixed(2) || '0.00'}</p>
        ${order.creditAmount > 0 && paymentType === 'prepaid' ? `<p style="margin: 4px 0; color: #dc3545;"><strong>Remaining Credit:</strong> ₹${order.creditAmount?.toFixed(2) || '0.00'}</p>` : ''}
      </div>
      <p>Your order is now being processed and will be shipped soon.</p>
      <p>Thank you for your business!</p>
      <div style="margin-top: 24px; color: #888; font-size: 0.85em;">
        <p>The Awla Company - Royal Way to Stay Healthy</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: config.email.from,
    to: order.customerEmail,
    subject: `${paymentLabel} Received - ${order.orderNumber} - The Awla Company`,
    html,
  });
}

export default { sendOrderConfirmation, sendPaymentConfirmation, sendShippingNotification, sendPaymentQREmail, sendInvoiceEmail, sendBulkPaymentConfirmation };
