import crypto from "crypto";
import { config } from "../config";

export interface PayUOrderData {
  orderId: string;
  orderNumber: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productInfo: string;
  isBulkOrder?: boolean;
}

export interface PayUPaymentParams {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string; // Success URL
  furl: string; // Failure URL
  hash: string;
  udf1?: string; // Store original order number
}

export interface PayUWebhookPayload {
  mihpayid: string;
  status: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  hash: string;
  error_Message?: string;
  bank_ref_num?: string;
  bankcode?: string;
  cardnum?: string;
  mode?: string;
  unmappedstatus?: string;
  PG_TYPE?: string;
  udf1?: string; // Original order number
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}

/**
 * Generate unique transaction ID for PayU
 * Format: OrderNumber_Timestamp to ensure uniqueness for each payment attempt
 */
export function generateUniqueTxnId(orderNumber: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${orderNumber}_${timestamp}_${random}`;
}

/**
 * Extract original order number from txnid
 */
export function extractOrderNumber(txnid: string): string {
  // txnid format: OrderNumber_Timestamp_Random
  const parts = txnid.split("_");
  // The order number might have underscores too, so we need to be careful
  // We remove the last two parts (timestamp and random)
  if (parts.length >= 3) {
    parts.pop(); // remove random
    parts.pop(); // remove timestamp
    return parts.join("_");
  }
  return txnid;
}

/**
 * Generate PayU hash for payment request
 * Hash formula: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
 */
export function createPaymentHash(txnid: string, data: PayUOrderData): string {
  // Store original order number in udf1 for reference
  const udf1 = data.orderNumber;
  const hashString = `${config.payu.merchantKey}|${txnid}|${data.amount.toFixed(
    2
  )}|${data.productInfo}|${data.customerName}|${data.customerEmail
    }|${udf1}||||||||||${config.payu.merchantSalt}`;

  return crypto.createHash("sha512").update(hashString).digest("hex");
}

/**
 * Verify PayU response hash
 * Reverse hash formula: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 * With additionalCharges: sha512(additionalCharges|SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
export function verifyPaymentResponse(payload: PayUWebhookPayload): boolean {
  // udf1 contains the original order number
  const udf1 = payload.udf1 || "";
  const udf2 = payload.udf2 || "";
  const udf3 = payload.udf3 || "";
  const udf4 = payload.udf4 || "";
  const udf5 = payload.udf5 || "";

  // Standard reverse hash (without additionalCharges)
  const reverseHashString = `${config.payu.merchantSalt}|${payload.status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${payload.email}|${payload.firstname}|${payload.productinfo}|${payload.amount}|${payload.txnid}|${config.payu.merchantKey}`;

  const calculatedHash = crypto
    .createHash("sha512")
    .update(reverseHashString)
    .digest("hex");

  let isValid = calculatedHash.toLowerCase() === payload.hash.toLowerCase();

  // Try with additionalCharges if first attempt fails
  if (!isValid && (payload as any).additionalCharges) {
    const additionalCharges = (payload as any).additionalCharges || "";
    const reverseHashWithCharges = `${additionalCharges}|${config.payu.merchantSalt}|${payload.status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${payload.email}|${payload.firstname}|${payload.productinfo}|${payload.amount}|${payload.txnid}|${config.payu.merchantKey}`;

    const calculatedHashWithCharges = crypto
      .createHash("sha512")
      .update(reverseHashWithCharges)
      .digest("hex");

    isValid =
      calculatedHashWithCharges.toLowerCase() === payload.hash.toLowerCase();
  }



  return isValid;
}

/**
 * Generate PayU payment parameters for checkout
 */
export function generatePaymentParams(data: PayUOrderData): PayUPaymentParams {
  // Generate unique txnid for each payment attempt
  const txnid = generateUniqueTxnId(data.orderNumber);
  const hash = createPaymentHash(txnid, data);

  // Determine callback URLs based on order type
  const callbackUrl = data.isBulkOrder
    ? `${config.backendUrl}/api/webhooks/payu/bulk-callback`
    : `${config.backendUrl}/api/webhooks/payu/callback`;

  return {
    key: config.payu.merchantKey,
    txnid: txnid,
    amount: data.amount.toFixed(2),
    productinfo: data.productInfo,
    firstname: data.customerName,
    email: data.customerEmail,
    phone: data.customerPhone,
    surl: callbackUrl,
    furl: callbackUrl,
    hash: hash,
    udf1: data.orderNumber, // Store original order number
  };
}

/**
 * Get PayU payment form URL based on environment
 */
export function getPayUFormUrl(): string {
  return config.nodeEnv === "production"
    ? "https://secure.payu.in/_payment"
    : "https://test.payu.in/_payment";
}

/**
 * Process PayU callback and return result
 */
export function processPayUCallback(payload: PayUWebhookPayload): {
  success: boolean;
  txnId: string;
  orderNumber: string;
  paymentId: string;
  status: string;
  message: string;
  mode?: string;
} {
  // Get order number first (before hash verification) for error pages
  const orderNumber = payload.udf1 || extractOrderNumber(payload.txnid);
  const isValid = verifyPaymentResponse(payload);

  if (!isValid) {
    return {
      success: false,
      txnId: payload.txnid || "",
      orderNumber: orderNumber, // Still return order number for error page
      paymentId: payload.mihpayid || "",
      status: "FAILED",
      message: "Invalid hash - payment verification failed",
    };
  }

  const isSuccess = payload.status === "success";

  return {
    success: isSuccess,
    txnId: payload.txnid,
    orderNumber: orderNumber,
    paymentId: payload.mihpayid,
    status: payload.status,
    message: isSuccess
      ? "Payment successful"
      : payload.error_Message || "Payment failed",
    mode: payload.mode,
  };
}

/**
 * Generate UPI QR code payment link via PayU
 */
export function generateUPIPaymentLink(data: PayUOrderData): string {
  const params = generatePaymentParams(data);
  const formUrl = getPayUFormUrl();

  // Return the payment URL with all parameters
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    queryParams.append(key, value);
  });

  return `${formUrl}?${queryParams.toString()}`;
}

export default {
  createPaymentHash,
  verifyPaymentResponse,
  generatePaymentParams,
  getPayUFormUrl,
  processPayUCallback,
  generateUPIPaymentLink,
  generateUniqueTxnId,
  extractOrderNumber,
};
