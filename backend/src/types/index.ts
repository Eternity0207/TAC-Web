export enum OrderStatus {
  PENDING = "PENDING",
  PAYMENT_PENDING = "PAYMENT_PENDING",
  PAID = "PAID",
  PROCESSING = "PROCESSING",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  QR_SHARED = "QR_SHARED",
  RECEIVED = "RECEIVED",
  VERIFIED = "VERIFIED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export enum PaymentMode {
  PREPAID = "PREPAID",
  COD = "COD",
  UPI_QR = "UPI_QR",
  PAYU = "PAYU",
}

export enum OrderType {
  REGULAR = "REGULAR",
  BULK = "BULK",
}

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  HEAD_DISTRIBUTION = "HEAD_DISTRIBUTION", // Head of Distribution and Growth (Manager)
  SALES = "SALES",
  TECHNICAL_ANALYST = "TECHNICAL_ANALYST", // Technical Analyst with access to competitor analysis
  INTERN = "INTERN", // Intern with limited access
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export enum TargetPeriod {
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  YEARLY = "YEARLY",
}

export enum DeliveryPartner {
  DELHIVERY = "Delhivery",
  BLUEDART = "BlueDart",
  DTDC = "DTDC",
  INDIA_POST = "India Post",
  ECOM_EXPRESS = "Ecom Express",
  XPRESSBEES = "XpressBees",
  OTHER = "Other",
}

export interface OrderProduct {
  name: string;
  variant: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  products: OrderProduct[];
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  prepaidAmount?: number; // Amount to be paid upfront (for bulk orders)
  creditAmount?: number; // Amount to be paid after delivery (for bulk orders)
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  paymentTransactionId?: string;
  paymentReceivedAt?: string;
  payuTxnId?: string;
  payuMihpayid?: string;
  payuPaymentMode?: string;
  trackingId?: string;
  deliveryPartner?: string;
  trackingUrl?: string;
  expectedDeliveryDate?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  invoiceNumber?: string;
  customerNotes?: string;
  internalNotes?: string;
  referredBy?: string;
  paymentScreenshotUrl?: string;
  deliveryReceiptUrl?: string;
  orderType?: OrderType;
  bulkPackaging?: string; // e.g., "350gm", "500gm", "1kg"
  createdBy?: string; // Admin/Manager who created the bulk order
  // Coupon fields
  originalAmount?: number; // Original subtotal before coupon discount
  couponCode?: string; // Applied coupon code
  couponDiscount?: number; // Discount amount from coupon
  // Discount fields (for both coupon and dealer discounts)
  discountAmount?: number; // Total discount amount
  discountType?: "PERCENTAGE" | "FIXED"; // Discount type
  discountPercent?: number; // Discount percentage (if percentage type)
  discountValue?: number; // Discount value (% or fixed amount)
  createdAt: string;
  updatedAt: string;
}

export interface SalesTarget {
  skuId: string;
  skuName: string;
  targetQuantity: number;
  targetAmount: number;
  period: TargetPeriod;
  periodValue: string; // e.g., "2026-01" for monthly, "2026-Q1" for quarterly, "2026" for yearly
  orderType?: "ALL" | "BULK" | "RETAIL"; // Type of orders to track (default: ALL)
  achievedQuantity?: number;
  achievedAmount?: number;
}

export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  profileImageUrl?: string;
  bio?: string;
  role: UserRole;
  status: UserStatus;
  designation?: string;
  phone?: string;
  managerId?: string; // For SALES users, their manager's ID
  salesTargets?: SalesTarget[];
  regions?: string[]; // Regions assigned to sales person (e.g., ["North India", "West India"])
  location?: string; // Location/city of the sales person (e.g., "Jaipur, Rajasthan")
  createdBy?: string; // Name/email of the user who created this account
  createdAt: string;
  lastLoginAt?: string;
}

export interface BulkPricingConfig {
  skuId: string;
  skuName: string;
  mrp: number;
  margin5kg: number; // Margin % for 5kg orders
  margin10kg: number; // Margin % for 10kg orders
  sellingPrice5kg: number;
  sellingPrice10kg: number;
}

export interface PackagingOption {
  id: string;
  size: string; // e.g., "350gm", "500gm", "1kg"
  weightInGrams: number;
  isActive: boolean;
}

export interface N8nPaymentWebhook {
  orderRef: string;
  amount: number;
  transactionId: string;
  paidAt?: string;
}

// Bulk Customer - Saved customers for quick bulk order creation
export interface BulkCustomer {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  businessName?: string;
  gstNumber?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  specialDiscount?: number; // Extra discount % for this customer
  createdBy: string; // User ID who created this customer
  managerId?: string; // For team hierarchy visibility
  createdAt: string;
  updatedAt: string;
}

// Discount Coupon - Promotional coupons with validity tracking
export interface DiscountCoupon {
  id: string;
  couponCode: string; // Unique code (e.g., "SAVE20")
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number; // Percentage or fixed amount
  validityType: "DATE" | "ORDER_COUNT" | "BOTH";
  validUntil?: string; // ISO date string
  maxUses?: number; // Max number of orders
  usedCount: number; // Current usage count
  minOrderAmount?: number; // Minimum product subtotal (not including shipping)
  maxDiscountAmount?: number; // Cap for percentage discounts
  influencerName?: string; // Influencer associated with this coupon (if any)
  applicableProducts?: string[]; // SKU IDs (empty = all products)
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Wholesale SKU - Separate pricing for wholesale customers
export interface WholesaleSKU {
  skuId: string;
  skuName: string;
  costPrice: number; // Your cost to produce/acquire
  wholesalePrice: number; // Price to wholesale customers
  wholesaleMargin: number; // Calculated margin %
  grossProfit: number; // Gross profit per unit
  minQuantity?: number; // Minimum order quantity
}

// Daily Report - Intern daily work reports
export interface DailyReport {
  id: string;
  userId: string;
  userName: string;
  whatDid: string;
  whatToDoNext: string;
  thingsRequired: string;
  createdAt: string;
}

// Sales Enquiry - Field sales enquiry tracking
export interface SalesEnquiry {
  id: string;
  createdBy: string;
  createdByName: string;
  personName: string; // Required
  email?: string;
  address?: string;
  phone?: string;
  description?: string;
  orders?: string;
  paymentMode?: string;
  anyCredits?: string;
  location?: string;
  time?: string; // Time of the enquiry
  createdAt: string;
  updatedAt: string;
}

// Platform Credential - Login credentials for various platforms assigned to users
export interface PlatformCredential {
  id: string;
  platformName: string; // e.g., "Instagram", "Google Analytics", "Gmail"
  accountIdentifier: string; // Username, email, or account ID
  password: string; // Encrypted/plain password
  url?: string; // Login URL for the platform
  notes?: string; // Additional notes
  assignedTo: string; // User ID
  assignedToName: string; // User name for display
  createdBy: string; // Admin who created this
  createdAt: string;
  updatedAt: string;
}

// Express Request with user info
export interface AuthRequest extends Request {
  user?: AdminUser;
}