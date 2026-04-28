import { config } from "../config";
import {
  Cart,
  Order,
  OrderStatus,
  PaymentStatus,
  PaymentMode,
  AdminUser,
  BulkCustomer,
  DiscountCoupon,
  WholesaleSKU,
  DailyReport,
  SalesEnquiry,
  PlatformCredential,
} from "../types";

async function callAppsScript(action: string, payload: any = {}) {
  const { callPostgresAction } = await import("../repos/googleSheetsRepo");
  return await callPostgresAction(action, payload);
}

export async function createCart(data: Partial<Cart>): Promise<Cart> {
  const result = await callAppsScript("createCart", data);
  if (!result.success) throw new Error(result.message);
  return result.data;
}

export async function getCartById(id: string): Promise<Cart | null> {
  const result = await callAppsScript("getCartById", { id });
  if (!result.success) return null;
  return result.data;
}

export async function updateCart(
  id: string,
  updates: Partial<Cart>,
): Promise<Cart | null> {
  const result = await callAppsScript("updateCart", { id, updates });
  if (!result.success) return null;
  return result.data;
}

export async function deleteCart(id: string): Promise<boolean> {
  const result = await callAppsScript("deleteCart", { id });
  return !!result.success;
}

export async function createOrder(data: Partial<Order>): Promise<Order> {
  const result = await callAppsScript("createOrder", data);
  if (!result.success) throw new Error(result.message);
  return result.data;
}

export async function getAllOrders(): Promise<Order[]> {
  const result = await callAppsScript("getAllOrders");
  if (!result.success) throw new Error(result.message);
  return result.data || [];
}

export async function getOrderById(id: string): Promise<Order | null> {
  const result = await callAppsScript("getOrderById", { id });
  if (!result.success) return null;
  return result.data;
}

export async function getOrderByNumber(
  orderNumber: string,
): Promise<Order | null> {
  const result = await callAppsScript("getOrderByNumber", { orderNumber });
  if (!result.success) return null;
  return result.data;
}

export async function updateOrder(
  id: string,
  updates: Partial<Order>,
): Promise<Order | null> {
  const result = await callAppsScript("updateOrder", { id, updates });
  if (!result.success) return null;
  return result.data;
}

export async function deleteOrder(id: string): Promise<boolean> {
  const result = await callAppsScript("deleteOrder", { id });
  return !!result.success;
}

export async function assignInvoiceNumber(id: string): Promise<Order | null> {
  const orders = await getAllOrders();
  const invoiceCount = orders.filter((o) => o.invoiceNumber).length;
  const invoiceNumber = `INV${new Date().getFullYear()}${String(
    invoiceCount + 1,
  ).padStart(5, "0")}`;
  return updateOrder(id, { invoiceNumber });
}

export async function getAdminByEmail(
  email: string,
): Promise<AdminUser | null> {
  const result = await callAppsScript("getAdminByEmail", { email });
  if (!result.success || !result.data) return null;
  return result.data;
}

export async function createAdminUser(
  data: Omit<AdminUser, "id" | "createdAt">,
): Promise<AdminUser> {
  const result = await callAppsScript("createAdminUser", data);
  if (!result.success) throw new Error(result.message);
  return result.data;
}

export async function updateAdminLastLogin(id: string): Promise<void> {
  await callAppsScript("updateAdminLastLogin", { id });
}

export async function getAllAdminUsers(): Promise<AdminUser[]> {
  const result = await callAppsScript("getAllAdminUsers");
  if (!result.success) throw new Error(result.message);
  return result.data || [];
}

export async function updateAdminUser(
  id: string,
  updates: Partial<AdminUser>,
): Promise<AdminUser | null> {
  const result = await callAppsScript("updateAdminUser", { id, updates });
  if (!result.success) return null;
  return result.data;
}

export async function deleteAdminUser(id: string): Promise<boolean> {
  const result = await callAppsScript("deleteAdminUser", { id });
  return result.success;
}

export async function uploadPaymentScreenshot(data: {
  orderId: string;
  orderNumber: string;
  base64Image: string;
  mimeType: string;
}): Promise<{ success: boolean; message?: string; data?: any }> {
  return await callAppsScript("uploadPaymentScreenshot", data);
}

export async function addFormSubmission(data: {
  name: string;
  email: string;
  phone: string;
  products: any[];
  address: string;
  city: string;
  pincode: string;
  state: string;
  country: string;
  message: string;
  referredBy: string;
  orderNumber: string;
}): Promise<{ success: boolean; message?: string }> {
  return await callAppsScript("addFormSubmission", data);
}

export async function getAdminById(id: string): Promise<AdminUser | null> {
  const users = await getAllAdminUsers();
  return users.find((u) => u.id === id) || null;
}

// Configuration Management

export async function getConfig(configType: string): Promise<any> {
  const result = await callAppsScript("getConfig", { configType });
  if (!result.success) return null;
  return result.data;
}

export async function updateConfig(
  configType: string,
  data: any,
): Promise<boolean> {
  const result = await callAppsScript("updateConfig", { configType, data });
  return result.success;
}

export async function getSKUs(): Promise<any[]> {
  const result = await callAppsScript("getSKUs", {});
  if (!result.success) return [];
  return result.data || [];
}

export async function updateSKUPricing(
  skuId: string,
  updates: any,
): Promise<any> {
  const result = await callAppsScript("updateSKUPricing", { skuId, updates });
  if (!result.success) return null;
  return result.data;
}

// Sales and Referral Tracking

export async function getOrdersByReferral(
  referredBy: string,
): Promise<Order[]> {
  const result = await callAppsScript("getOrdersByReferral", { referredBy });
  if (!result.success) return [];
  return result.data || [];
}

export async function getUserSalesStats(userId: string): Promise<any> {
  const result = await callAppsScript("getUserSalesStats", { userId });
  if (!result.success) return null;
  return result.data;
}

export async function getTeamMembers(managerId: string): Promise<AdminUser[]> {
  const result = await callAppsScript("getTeamMembers", { managerId });
  if (!result.success) return [];
  return result.data || [];
}

// Bulk Orders (Separate Sheet)

export interface BulkOrder {
  id: string;
  orderNumber: string;
  orderType: string;
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
  products: any[];
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  discountType?: "PERCENTAGE" | "FIXED"; // Dealer discount type
  discountValue?: number; // Dealer discount value (% or fixed amount)
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  prepaidAmount: number;
  creditAmount: number;
  prepaidStatus: string;
  creditStatus: string;
  prepaidPaidAt?: string;
  creditPaidAt?: string;
  prepaidTxnId?: string;
  creditTxnId?: string;
  payuTxnId?: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMode: string;
  trackingId?: string;
  deliveryPartner?: string;
  trackingUrl?: string;
  expectedDeliveryDate?: string;
  shippedAt?: string;
  deliveredAt?: string;
  invoiceNumber?: string;
  customerNotes?: string;
  internalNotes?: string;
  referredBy?: string;
  deliveryReceiptUrl?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BulkOrderStats {
  totalOrders: number;
  totalRevenue: number;
  totalPrepaid: number;
  totalCredit: number;
  prepaidCollected: number;
  creditCollected: number;
  prepaidPending: number;
  creditPending: number;
  pendingOrders: number;
  completedOrders: number;
}

export async function createBulkOrder(
  data: Partial<BulkOrder>,
): Promise<BulkOrder> {
  const result = await callAppsScript("createBulkOrder", data);
  if (!result.success) throw new Error(result.message);
  return result.data;
}

export async function getAllBulkOrders(): Promise<BulkOrder[]> {
  const result = await callAppsScript("getAllBulkOrders");
  if (!result.success) throw new Error(result.message);
  return result.data || [];
}

export async function getBulkOrderById(id: string): Promise<BulkOrder | null> {
  const result = await callAppsScript("getBulkOrderById", { id });
  if (!result.success) return null;
  return result.data;
}

export async function getBulkOrderByNumber(
  orderNumber: string,
): Promise<BulkOrder | null> {
  const result = await callAppsScript("getBulkOrderByNumber", { orderNumber });
  if (!result.success) {
    return null;
  }
  return result.data;
}

export async function updateBulkOrder(
  id: string,
  updates: Partial<BulkOrder>,
): Promise<BulkOrder | null> {
  const result = await callAppsScript("updateBulkOrder", { id, updates });
  if (!result.success) return null;
  return result.data;
}

export async function getBulkOrderStats(): Promise<BulkOrderStats | null> {
  const result = await callAppsScript("getBulkOrderStats");
  if (!result.success) return null;
  return result.data;
}

// ============================================================
// BULK CUSTOMERS
// ============================================================

export async function createBulkCustomer(
  data: Partial<BulkCustomer>,
): Promise<BulkCustomer> {
  const result = await callAppsScript("createBulkCustomer", data);
  if (!result.success) throw new Error(result.message);
  return result.data;
}

export async function getAllBulkCustomers(): Promise<BulkCustomer[]> {
  const result = await callAppsScript("getAllBulkCustomers");
  if (!result.success) throw new Error(result.message);
  return result.data || [];
}

export async function getBulkCustomersByUser(
  userId: string,
): Promise<BulkCustomer[]> {
  const result = await callAppsScript("getBulkCustomersByUser", { userId });
  if (!result.success) return [];
  return result.data || [];
}

export async function getBulkCustomersByTeam(
  managerId: string,
): Promise<BulkCustomer[]> {
  const result = await callAppsScript("getBulkCustomersByTeam", { managerId });
  if (!result.success) return [];
  return result.data || [];
}

export async function updateBulkCustomer(
  id: string,
  updates: Partial<BulkCustomer>,
): Promise<BulkCustomer | null> {
  const result = await callAppsScript("updateBulkCustomer", { id, updates });
  if (!result.success) return null;
  return result.data;
}

export async function deleteBulkCustomer(id: string): Promise<boolean> {
  const result = await callAppsScript("deleteBulkCustomer", { id });
  return result.success;
}

// ============================================================
// COUPONS
// ============================================================

export async function createCoupon(
  data: Partial<DiscountCoupon>,
): Promise<DiscountCoupon> {
  const result = await callAppsScript("createCoupon", data);
  if (!result.success) throw new Error(result.message);
  return result.data;
}

export async function getAllCoupons(): Promise<DiscountCoupon[]> {
  const result = await callAppsScript("getAllCoupons");
  if (!result.success) throw new Error(result.message);
  return result.data || [];
}

export interface CouponValidationResult {
  success: boolean;
  valid: boolean;
  coupon?: DiscountCoupon;
  discountAmount?: number;
  message: string;
}

export async function validateCoupon(
  couponCode: string,
  subtotal: number,
): Promise<CouponValidationResult> {
  const result: any = await callAppsScript("validateCoupon", {
    couponCode,
    subtotal,
  });
  return {
    success: !!result.success,
    valid: !!result.valid,
    coupon: result.coupon,
    discountAmount: result.discountAmount,
    message: result.message || "Validation failed",
  };
}

export async function applyCoupon(couponCode: string): Promise<boolean> {
  const result = await callAppsScript("applyCoupon", { couponCode });
  return result.success;
}

export async function updateCoupon(
  id: string,
  updates: Partial<DiscountCoupon>,
): Promise<DiscountCoupon | null> {
  const result = await callAppsScript("updateCoupon", { id, updates });
  if (!result.success) return null;
  return result.data;
}

export async function deleteCoupon(id: string): Promise<boolean> {
  const result = await callAppsScript("deleteCoupon", { id });
  return result.success;
}

// ============================================================
// WHOLESALE SKUS
// ============================================================

export async function getWholesaleSKUs(): Promise<WholesaleSKU[]> {
  const result = await callAppsScript("getWholesaleSKUs");
  if (!result.success) return [];
  return result.data || [];
}

export async function updateWholesaleSKU(
  skuId: string,
  updates: Partial<WholesaleSKU>,
): Promise<WholesaleSKU | null> {
  const result = await callAppsScript("updateWholesaleSKU", { skuId, updates });
  if (!result.success) return null;
  return result.data;
}

export default {
  createCart,
  getCartById,
  updateCart,
  deleteCart,
  createOrder,
  getAllOrders,
  getOrderById,
  getOrderByNumber,
  updateOrder,
  deleteOrder,
  assignInvoiceNumber,
  getAdminByEmail,
  createAdminUser,
  updateAdminLastLogin,
  getAllAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  uploadPaymentScreenshot,
  addFormSubmission,
  getAdminById,
  // Config functions
  getConfig,
  updateConfig,
  getSKUs,
  updateSKUPricing,
  // Sales functions
  getOrdersByReferral,
  getUserSalesStats,
  getTeamMembers,
  // Bulk Order functions
  createBulkOrder,
  getAllBulkOrders,
  getBulkOrderById,
  getBulkOrderByNumber,
  updateBulkOrder,
  getBulkOrderStats,
  // Bulk Customer functions
  createBulkCustomer,
  getAllBulkCustomers,
  getBulkCustomersByUser,
  getBulkCustomersByTeam,
  updateBulkCustomer,
  deleteBulkCustomer,
  // Coupon functions
  createCoupon,
  getAllCoupons,
  validateCoupon,
  applyCoupon,
  updateCoupon,
  deleteCoupon,
  // Wholesale SKU functions
  getWholesaleSKUs,
  updateWholesaleSKU,
  // Social Media functions
  getSocialMediaStats,
  saveSocialMediaStat,
  // Upcoming Products functions
  getUpcomingProducts,
  createUpcomingProduct,
  updateUpcomingProduct,
  deleteUpcomingProduct,
  // Bulk Enquiry functions
  getAllBulkEnquiries,
  createBulkEnquiry,
  updateBulkEnquiry,
  // Video Review functions
  getVideoReviews,
  createVideoReview,
  updateVideoReview,
  deleteVideoReview,
  // WhatsApp Review functions
  getWhatsAppReviews,
  createWhatsAppReview,
  updateWhatsAppReview,
  deleteWhatsAppReview,
  // Production Video functions
  getProductionVideos,
  createProductionVideo,
  updateProductionVideo,
  deleteProductionVideo,
  // Career functions
  getAllCareers,
  createCareer,
  updateCareer,
  deleteCareer,
  // Application functions
  getAllApplications,
  getApplicationsByJob,
  createApplication,
  updateApplication,
  // Intern functions
  createDailyReport,
  getAllDailyReports,
  createSalesEnquiry,
  getAllSalesEnquiries,
  updateSalesEnquiry,
};

// Social Media Stats functions
async function getSocialMediaStats(): Promise<any[]> {
  const result = await callAppsScript("getSocialMediaStats", {});
  return result?.data || [];
}

async function saveSocialMediaStat(stat: {
  date: string;
  platform: string;
  followers: number;
  reach: number;
  impressions: number;
  engagement: number;
}): Promise<boolean> {
  const result = await callAppsScript("saveSocialMediaStat", stat);
  return result?.success || false;
}

// ============================================================
// UPCOMING PRODUCTS (Launching Soon)
// ============================================================

async function getUpcomingProducts(): Promise<any[]> {
  const result = await callAppsScript("getUpcomingProducts", {});
  if (!result.success) return [];
  return result.data || [];
}

async function createUpcomingProduct(data: any): Promise<any> {
  const result = await callAppsScript("createUpcomingProduct", data);
  if (!result.success) throw new Error(result.message);
  return result.data;
}

async function updateUpcomingProduct(id: string, updates: any): Promise<any> {
  const result = await callAppsScript("updateUpcomingProduct", { id, updates });
  if (!result.success) return null;
  return result.data;
}

async function deleteUpcomingProduct(id: string): Promise<boolean> {
  const result = await callAppsScript("deleteUpcomingProduct", { id });
  return result.success;
}

// ============================================================
// BULK ENQUIRIES
// ============================================================

async function getAllBulkEnquiries(): Promise<any[]> {
  const result = await callAppsScript("getAllBulkEnquiries", {});
  if (!result.success) return [];
  return result.data || [];
}

async function createBulkEnquiry(data: any): Promise<any> {
  const result = await callAppsScript("createBulkEnquiry", data);
  if (!result.success) throw new Error(result.message);
  return result.data;
}

async function updateBulkEnquiry(id: string, updates: any): Promise<any> {
  const result = await callAppsScript("updateBulkEnquiry", { id, updates });
  if (!result.success) return null;
  return result.data;
}

// ============================================================
// VIDEO REVIEWS
// ============================================================

async function getVideoReviews(): Promise<any[]> {
  const result = await callAppsScript("getVideoReviews", {});
  if (!result.success) return [];
  return result.data || [];
}

async function createVideoReview(data: any): Promise<any> {
  const result = await callAppsScript("createVideoReview", data);
  if (!result.success) throw new Error(result.message);
  return result.data;
}

async function updateVideoReview(id: string, updates: any): Promise<any> {
  const result = await callAppsScript("updateVideoReview", { id, updates });
  if (!result.success) return null;
  return result.data;
}

async function deleteVideoReview(id: string): Promise<boolean> {
  const result = await callAppsScript("deleteVideoReview", { id });
  return result.success;
}

// ============================================================
// WHATSAPP REVIEWS
// ============================================================

async function getWhatsAppReviews(): Promise<any[]> {
  const result = await callAppsScript("getWhatsAppReviews", {});
  if (!result.success) return [];
  return result.data || [];
}

async function createWhatsAppReview(data: any): Promise<any> {
  const result = await callAppsScript("createWhatsAppReview", data);
  if (!result.success) throw new Error(result.message);
  return result.data;
}

async function updateWhatsAppReview(id: string, updates: any): Promise<any> {
  const result = await callAppsScript("updateWhatsAppReview", { id, updates });
  if (!result.success) return null;
  return result.data;
}

async function deleteWhatsAppReview(id: string): Promise<boolean> {
  const result = await callAppsScript("deleteWhatsAppReview", { id });
  return result.success;
}

// ============================================================
// PRODUCTION VIDEOS
// ============================================================

async function getProductionVideos(): Promise<any[]> {
  const result = await callAppsScript("getProductionVideos", {});
  if (!result.success) return [];
  return result.data || [];
}

async function createProductionVideo(data: any): Promise<any> {
  const result = await callAppsScript("createProductionVideo", data);
  if (!result.success) throw new Error(result.message);
  return result.data;
}

async function updateProductionVideo(id: string, updates: any): Promise<any> {
  const result = await callAppsScript("updateProductionVideo", { id, updates });
  if (!result.success) return null;
  return result.data;
}

async function deleteProductionVideo(id: string): Promise<boolean> {
  const result = await callAppsScript("deleteProductionVideo", { id });
  return result.success;
}

// ============================================================
// CAREERS
// ============================================================

export async function getAllCareers(): Promise<any[]> {
  const result = await callAppsScript("getAllCareers", {});
  if (!result.success) return [];
  return result.data || [];
}

export async function createCareer(data: any): Promise<any> {
  return await callAppsScript("createCareer", data);
}

export async function updateCareer(id: string, updates: any): Promise<any> {
  return await callAppsScript("updateCareer", { id, updates });
}

export async function deleteCareer(id: string): Promise<boolean> {
  const result = await callAppsScript("deleteCareer", { id });
  return result.success;
}

// ============================================================
// APPLICATIONS
// ============================================================

export async function getAllApplications(): Promise<any[]> {
  const result = await callAppsScript("getAllApplications", {});
  if (!result.success) return [];
  return result.data || [];
}

export async function getApplicationsByJob(jobId: string): Promise<any[]> {
  const result = await callAppsScript("getApplicationsByJob", { jobId });
  if (!result.success) return [];
  return result.data || [];
}

export async function createApplication(data: any): Promise<any> {
  return await callAppsScript("createApplication", data);
}

export async function updateApplication(id: string, updates: any): Promise<any> {
  return await callAppsScript("updateApplication", { id, updates });
}

// ============================================================
// DAILY REPORTS (Intern)
// ============================================================

export async function createDailyReport(data: Partial<DailyReport>): Promise<DailyReport> {
  const result = await callAppsScript("createDailyReport", data);
  if (!result.success) throw new Error(result.message);
  return result.data;
}

export async function getAllDailyReports(): Promise<DailyReport[]> {
  const result = await callAppsScript("getAllDailyReports", {});
  if (!result.success) return [];
  return result.data || [];
}

// ============================================================
// SALES ENQUIRIES (Intern)
// ============================================================

export async function createSalesEnquiry(data: Partial<SalesEnquiry>): Promise<SalesEnquiry> {
  const result = await callAppsScript("createSalesEnquiry", data);
  if (!result.success) throw new Error(result.message);
  return result.data;
}

export async function getAllSalesEnquiries(): Promise<SalesEnquiry[]> {
  const result = await callAppsScript("getAllSalesEnquiries", {});
  if (!result.success) return [];
  return result.data || [];
}

export async function updateSalesEnquiry(id: string, updates: Partial<SalesEnquiry>): Promise<SalesEnquiry | null> {
  const result = await callAppsScript("updateSalesEnquiry", { id, updates });
  if (!result.success) return null;
  return result.data;
}

// ============================================================
// PLATFORM CREDENTIALS
// ============================================================

export async function createCredential(data: Partial<PlatformCredential>): Promise<PlatformCredential> {
  const result = await callAppsScript("createCredential", data);
  if (!result.success) throw new Error(result.message);
  return result.data;
}

export async function getAllCredentials(): Promise<PlatformCredential[]> {
  const result = await callAppsScript("getAllCredentials", {});
  if (!result.success) return [];
  return result.data || [];
}

export async function getCredentialsByUser(userId: string): Promise<PlatformCredential[]> {
  const result = await callAppsScript("getCredentialsByUser", { userId });
  if (!result.success) return [];
  return result.data || [];
}

export async function updateCredential(id: string, updates: Partial<PlatformCredential>): Promise<PlatformCredential | null> {
  const result = await callAppsScript("updateCredential", { id, updates });
  if (!result.success) return null;
  return result.data;
}

export async function deleteCredential(id: string): Promise<boolean> {
  const result = await callAppsScript("deleteCredential", { id });
  return result.success;
}
