/**
 * Direct Supabase Service Layer
 * Replaces Google Sheets integration - all data is stored in Supabase PostgreSQL
 */

import { randomUUID } from "crypto";
import {
  selectRows,
  insertRow,
  updateRows,
  deleteRows,
  upsertRows,
} from "../repos/client";
import {
  Cart,
  Order,
  AdminUser,
  BulkCustomer,
  DiscountCoupon,
  WholesaleSKU,
  DailyReport,
  SalesEnquiry,
  PlatformCredential,
} from "../types";

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function normalizeRow(row: any) {
  const data = row?.data && typeof row.data === "object" ? row.data : {};
  const updatedAt = String(data.updatedAt || row?.updated_at || "").trim();
  const createdAt = String(data.createdAt || row?.created_at || updatedAt || "").trim();

  return {
    ...data,
    id: data.id || row?.id || "",
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: updatedAt || createdAt || new Date().toISOString(),
  };
}

async function generateYearlySequenceNumber(
  tableName: "orders" | "bulk_orders",
  prefix: "ORD" | "BLK",
  createdAt?: string,
) {
  const rows = await selectRows(tableName);
  const date = createdAt ? new Date(createdAt) : new Date();
  const year = date.getUTCFullYear();
  const regex = new RegExp(`^${prefix}${year}(\\d{5})$`);
  let max = 0;

  for (const row of rows) {
    const data = row?.data || {};
    const num = String(data.orderNumber || "").trim().toUpperCase();
    const match = regex.exec(num);
    if (!match) continue;
    const parsed = Number.parseInt(match[1], 10);
    if (!Number.isNaN(parsed) && parsed > max) max = parsed;
  }

  return `${prefix}${year}${String(max + 1).padStart(5, "0")}`;
}

function normalizeRecords(rows: any[]) {
  return rows.map(normalizeRow);
}

async function getAllFromTable<T = any>(tableName: string): Promise<T[]> {
  const rows = await selectRows(tableName);
  return normalizeRecords(rows);
}

async function createInTable<T = any>(tableName: string, data: Record<string, any>): Promise<T> {
  const id = String(data.id || randomUUID());
  const now = new Date().toISOString();
  const record = {
    id,
    ...data,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
  const row = await insertRow(tableName, { id, data: record, updated_at: now });
  return normalizeRow(row);
}

async function updateInTable<T = any>(tableName: string, id: string, updates: Record<string, any>): Promise<T | null> {
  const existing = await selectRows(tableName, { id });
  if (!existing.length) return null;
  const current = normalizeRow(existing[0]);
  const next = { ...current, ...updates, updatedAt: new Date().toISOString() };
  const rows = await updateRows(tableName, { data: next, updated_at: new Date().toISOString() }, { id });
  if (!rows.length) return null;
  return normalizeRow(rows[0]);
}

async function deleteFromTable(tableName: string, id: string): Promise<boolean> {
  await deleteRows(tableName, { id });
  return true;
}

// ============================================================
// CART FUNCTIONS
// ============================================================

export async function createCart(data: Partial<Cart>): Promise<Cart> {
  const id = data.id || randomUUID();
  const cart = {
    id,
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const row = await insertRow("carts", { id, data: cart, updated_at: new Date().toISOString() });
  return normalizeRow(row);
}

export async function getCartById(id: string): Promise<Cart | null> {
  const rows = await selectRows("carts", { id });
  if (!rows.length) return null;
  return normalizeRow(rows[0]);
}

export async function updateCart(id: string, updates: Partial<Cart>): Promise<Cart | null> {
  const existing = await getCartById(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  const rows = await updateRows("carts", { data: updated, updated_at: new Date().toISOString() }, { id });
  if (!rows.length) return null;
  return normalizeRow(rows[0]);
}

export async function deleteCart(id: string): Promise<boolean> {
  await deleteRows("carts", { id });
  return true;
}

// ============================================================
// ORDER FUNCTIONS
// ============================================================

export async function createOrder(data: Partial<Order>): Promise<Order> {
  const id = data.id || randomUUID();
  const orderNumber = data.orderNumber || (await generateYearlySequenceNumber("orders", "ORD", data.createdAt));
  const order = {
    id,
    ...data,
    orderNumber,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const row = await insertRow("orders", { id, data: order, updated_at: new Date().toISOString() });
  return normalizeRow(row);
}

export async function getAllOrders(): Promise<Order[]> {
  const rows = await selectRows("orders");
  return rows.map(normalizeRow);
}

export async function getOrderById(id: string): Promise<Order | null> {
  const rows = await selectRows("orders", { id });
  if (!rows.length) return null;
  return normalizeRow(rows[0]);
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const rows = await selectRows("orders");
  const order = rows.find((r) => normalizeRow(r).orderNumber === orderNumber);
  if (!order) return null;
  return normalizeRow(order);
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<Order | null> {
  const existing = await getOrderById(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  const rows = await updateRows("orders", { data: updated, updated_at: new Date().toISOString() }, { id });
  if (!rows.length) return null;
  return normalizeRow(rows[0]);
}

export async function deleteOrder(id: string): Promise<boolean> {
  await deleteRows("orders", { id });
  return true;
}

export async function assignInvoiceNumber(id: string): Promise<Order | null> {
  const orders = await getAllOrders();
  const invoiceCount = orders.filter((o) => o.invoiceNumber).length;
  const invoiceNumber = `INV${new Date().getFullYear()}${String(invoiceCount + 1).padStart(5, "0")}`;
  return updateOrder(id, { invoiceNumber });
}

export async function getOrdersByReferral(referredBy: string): Promise<Order[]> {
  const rows = await selectRows("orders");
  return rows.map(normalizeRow).filter((o) => o.referredBy === referredBy);
}

// ============================================================
// ADMIN USER FUNCTIONS
// ============================================================

export async function createAdminUser(data: Omit<AdminUser, "id" | "createdAt">): Promise<AdminUser> {
  const id = data.email || randomUUID();
  const user = {
    id,
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const row = await insertRow("admin_users", { id, data: user, updated_at: new Date().toISOString() });
  return normalizeRow(row);
}

export async function getAdminByEmail(email: string): Promise<AdminUser | null> {
  const rows = await selectRows("admin_users");
  const user = rows.find((r) => normalizeRow(r).email === email);
  if (!user) return null;
  return normalizeRow(user);
}

export async function getAdminById(id: string): Promise<AdminUser | null> {
  const rows = await selectRows("admin_users", { id });
  if (!rows.length) return null;
  return normalizeRow(rows[0]);
}

export async function getAllAdminUsers(): Promise<AdminUser[]> {
  const rows = await selectRows("admin_users");
  return rows.map(normalizeRow);
}

export async function updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser | null> {
  const existing = await getAdminById(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  const rows = await updateRows("admin_users", { data: updated, updated_at: new Date().toISOString() }, { id });
  if (!rows.length) return null;
  return normalizeRow(rows[0]);
}

export async function updateAdminLastLogin(id: string): Promise<void> {
  await updateAdminUser(id, { lastLogin: new Date().toISOString() });
}

export async function deleteAdminUser(id: string): Promise<boolean> {
  await deleteRows("admin_users", { id });
  return true;
}

export async function getTeamMembers(managerId: string): Promise<AdminUser[]> {
  const rows = await selectRows("admin_users");
  return rows.map(normalizeRow).filter((u) => u.managerId === managerId);
}

// ============================================================
// BULK ORDER FUNCTIONS
// ============================================================

export async function createBulkOrder(data: Partial<any>): Promise<any> {
  const id = data.id || randomUUID();
  const orderNumber = data.orderNumber || (await generateYearlySequenceNumber("bulk_orders", "BLK", data.createdAt));
  const order = {
    id,
    ...data,
    orderNumber,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const row = await insertRow("bulk_orders", { id, data: order, updated_at: new Date().toISOString() });
  return normalizeRow(row);
}

export async function getAllBulkOrders(): Promise<any[]> {
  const rows = await selectRows("bulk_orders");
  return rows.map(normalizeRow);
}

export async function getBulkOrderById(id: string): Promise<any | null> {
  const rows = await selectRows("bulk_orders", { id });
  if (!rows.length) return null;
  return normalizeRow(rows[0]);
}

export async function getBulkOrderByNumber(orderNumber: string): Promise<any | null> {
  const rows = await selectRows("bulk_orders");
  const order = rows.find((r) => normalizeRow(r).orderNumber === orderNumber);
  if (!order) return null;
  return normalizeRow(order);
}

export async function updateBulkOrder(id: string, updates: Partial<any>): Promise<any | null> {
  const existing = await getBulkOrderById(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  const rows = await updateRows("bulk_orders", { data: updated, updated_at: new Date().toISOString() }, { id });
  if (!rows.length) return null;
  return normalizeRow(rows[0]);
}

export async function getBulkOrderStats(): Promise<any | null> {
  const orders = await getAllBulkOrders();
  return {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    totalPrepaid: orders.reduce((sum, o) => sum + (o.prepaidAmount || 0), 0),
    totalCredit: orders.reduce((sum, o) => sum + (o.creditAmount || 0), 0),
    prepaidCollected: orders.filter((o) => o.prepaidStatus === "PAID").length,
    creditCollected: orders.filter((o) => o.creditStatus === "PAID").length,
    prepaidPending: orders.filter((o) => o.prepaidStatus === "PENDING").length,
    creditPending: orders.filter((o) => o.creditStatus === "PENDING").length,
    pendingOrders: orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.orderStatus)).length,
    completedOrders: orders.filter((o) => o.orderStatus === "DELIVERED").length,
  };
}

// ============================================================
// BULK CUSTOMER FUNCTIONS
// ============================================================

export async function createBulkCustomer(data: Partial<BulkCustomer>): Promise<BulkCustomer> {
  const id = data.id || randomUUID();
  const customer = {
    id,
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const row = await insertRow("bulk_customers", { id, data: customer, updated_at: new Date().toISOString() });
  return normalizeRow(row);
}

export async function getAllBulkCustomers(): Promise<BulkCustomer[]> {
  const rows = await selectRows("bulk_customers");
  return rows.map(normalizeRow);
}

export async function getBulkCustomersByUser(userId: string): Promise<BulkCustomer[]> {
  const rows = await selectRows("bulk_customers");
  return rows.map(normalizeRow).filter((c) => c.managedBy === userId || c.createdBy === userId);
}

export async function getBulkCustomersByTeam(managerId: string): Promise<BulkCustomer[]> {
  const rows = await selectRows("bulk_customers");
  return rows.map(normalizeRow).filter((c) => c.managerId === managerId);
}

export async function updateBulkCustomer(id: string, updates: Partial<BulkCustomer>): Promise<BulkCustomer | null> {
  const existing = await selectRows("bulk_customers", { id });
  if (!existing.length) return null;
  const current = normalizeRow(existing[0]);
  const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
  const rows = await updateRows("bulk_customers", { data: updated, updated_at: new Date().toISOString() }, { id });
  if (!rows.length) return null;
  return normalizeRow(rows[0]);
}

export async function deleteBulkCustomer(id: string): Promise<boolean> {
  await deleteRows("bulk_customers", { id });
  return true;
}

// ============================================================
// COUPON FUNCTIONS
// ============================================================

export async function createCoupon(data: Partial<DiscountCoupon>): Promise<DiscountCoupon> {
  const id = data.id || data.couponCode || randomUUID();
  const coupon = {
    id,
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const row = await insertRow("discount_coupons", { id, data: coupon, updated_at: new Date().toISOString() });
  return normalizeRow(row);
}

export async function getAllCoupons(): Promise<DiscountCoupon[]> {
  const rows = await selectRows("discount_coupons");
  return rows.map(normalizeRow);
}

export async function validateCoupon(
  couponCode: string,
  subtotal: number,
): Promise<{ success: boolean; valid: boolean; coupon?: DiscountCoupon; discountAmount?: number; message: string }> {
  const rows = await selectRows("discount_coupons");
  const coupon = rows.find((r) => normalizeRow(r).couponCode === couponCode);

  if (!coupon) {
    return { success: false, valid: false, message: "Coupon not found" };
  }

  const data = normalizeRow(coupon);

  // Check if coupon is active
  if (data.isActive === false) {
    return { success: false, valid: false, message: "Coupon is inactive" };
  }

  // Check expiry
  if (data.expiryDate && new Date(data.expiryDate) < new Date()) {
    return { success: false, valid: false, message: "Coupon has expired" };
  }

  // Check minimum purchase
  if (data.minimumPurchase && subtotal < data.minimumPurchase) {
    return { success: false, valid: false, message: `Minimum purchase of ₹${data.minimumPurchase} required` };
  }

  // Calculate discount
  let discountAmount = 0;
  if (data.discountType === "PERCENTAGE") {
    discountAmount = (subtotal * data.discountValue) / 100;
  } else {
    discountAmount = data.discountValue;
  }

  return {
    success: true,
    valid: true,
    coupon: data,
    discountAmount,
    message: "Coupon is valid",
  };
}

export async function applyCoupon(couponCode: string): Promise<boolean> {
  const rows = await selectRows("discount_coupons");
  const coupon = rows.find((r) => normalizeRow(r).couponCode === couponCode);
  if (!coupon) return false;
  return true;
}

export async function updateCoupon(id: string, updates: Partial<DiscountCoupon>): Promise<DiscountCoupon | null> {
  const existing = await selectRows("discount_coupons", { id });
  if (!existing.length) return null;
  const current = normalizeRow(existing[0]);
  const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
  const rows = await updateRows("discount_coupons", { data: updated, updated_at: new Date().toISOString() }, { id });
  if (!rows.length) return null;
  return normalizeRow(rows[0]);
}

export async function deleteCoupon(id: string): Promise<boolean> {
  await deleteRows("discount_coupons", { id });
  return true;
}

// ============================================================
// WHOLESALE SKU FUNCTIONS
// ============================================================

export async function getWholesaleSKUs(): Promise<WholesaleSKU[]> {
  const rows = await selectRows("wholesale_skus");
  return rows.map(normalizeRow);
}

export async function updateWholesaleSKU(skuId: string, updates: Partial<WholesaleSKU>): Promise<WholesaleSKU | null> {
  const existing = await selectRows("wholesale_skus", { id: skuId });
  if (!existing.length) return null;
  const current = normalizeRow(existing[0]);
  const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
  const rows = await updateRows("wholesale_skus", { data: updated, updated_at: new Date().toISOString() }, { id: skuId });
  if (!rows.length) return null;
  return normalizeRow(rows[0]);
}

// ============================================================
// CONFIG FUNCTIONS
// ============================================================

export async function getConfig(configType: string): Promise<any> {
  const rows = await selectRows("config_kv", { id: configType });
  if (!rows.length) return null;
  return normalizeRow(rows[0]).data;
}

export async function updateConfig(configType: string, data: any): Promise<boolean> {
  const config = {
    id: configType,
    configType,
    data,
    updatedAt: new Date().toISOString(),
  };
  await upsertRows("config_kv", [{ id: configType, data: config, updated_at: new Date().toISOString() }]);
  return true;
}

export async function getSKUs(): Promise<any[]> {
  const rows = await selectRows("skus");
  return rows.map(normalizeRow);
}

export async function updateSKUPricing(skuId: string, updates: any): Promise<any> {
  const existing = await selectRows("skus", { id: skuId });
  if (!existing.length) return null;
  const current = normalizeRow(existing[0]);
  const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
  const rows = await updateRows("skus", { data: updated, updated_at: new Date().toISOString() }, { id: skuId });
  if (!rows.length) return null;
  return normalizeRow(rows[0]);
}

// ============================================================
// SALES STATS FUNCTIONS
// ============================================================

export async function getUserSalesStats(userId: string): Promise<any> {
  const orders = await getAllBulkOrders();
  const userOrders = orders.filter((o) => o.createdBy === userId);
  return {
    totalOrders: userOrders.length,
    totalRevenue: userOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    completedOrders: userOrders.filter((o) => o.orderStatus === "DELIVERED").length,
  };
}

// ============================================================
// BULK ENQUIRY FUNCTIONS
// ============================================================

export async function getAllBulkEnquiries(): Promise<any[]> {
  const rows = await selectRows("bulk_enquiries");
  return rows.map(normalizeRow);
}

export async function createBulkEnquiry(data: any): Promise<any> {
  const id = data.id || randomUUID();
  const enquiry = {
    id,
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const row = await insertRow("bulk_enquiries", { id, data: enquiry, updated_at: new Date().toISOString() });
  return normalizeRow(row);
}

export async function updateBulkEnquiry(id: string, updates: any): Promise<any> {
  const existing = await selectRows("bulk_enquiries", { id });
  if (!existing.length) return null;
  const current = normalizeRow(existing[0]);
  const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
  const rows = await updateRows("bulk_enquiries", { data: updated, updated_at: new Date().toISOString() }, { id });
  if (!rows.length) return null;
  return normalizeRow(rows[0]);
}

// ============================================================
// DAILY REPORT FUNCTIONS
// ============================================================

export async function createDailyReport(data: Partial<DailyReport>): Promise<DailyReport> {
  const id = data.id || randomUUID();
  const report = {
    id,
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const row = await insertRow("daily_reports", { id, data: report, updated_at: new Date().toISOString() });
  return normalizeRow(row);
}

export async function getAllDailyReports(): Promise<DailyReport[]> {
  const rows = await selectRows("daily_reports");
  return rows.map(normalizeRow);
}

// ============================================================
// SALES ENQUIRY FUNCTIONS
// ============================================================

export async function createSalesEnquiry(data: Partial<SalesEnquiry>): Promise<SalesEnquiry> {
  const id = data.id || randomUUID();
  const enquiry = {
    id,
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const row = await insertRow("sales_enquiries", { id, data: enquiry, updated_at: new Date().toISOString() });
  return normalizeRow(row);
}

export async function getAllSalesEnquiries(): Promise<SalesEnquiry[]> {
  const rows = await selectRows("sales_enquiries");
  return rows.map(normalizeRow);
}

export async function updateSalesEnquiry(id: string, updates: Partial<SalesEnquiry>): Promise<SalesEnquiry | null> {
  const existing = await selectRows("sales_enquiries", { id });
  if (!existing.length) return null;
  const current = normalizeRow(existing[0]);
  const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
  const rows = await updateRows("sales_enquiries", { data: updated, updated_at: new Date().toISOString() }, { id });
  if (!rows.length) return null;
  return normalizeRow(rows[0]);
}

// ============================================================
// EXTENDED CONTENT / CMS FUNCTIONS
// ============================================================

export async function uploadPaymentScreenshot(payload: {
  orderId: string;
  base64Image: string;
}): Promise<boolean> {
  const existing = await getOrderById(payload.orderId);
  if (!existing) return false;
  await updateOrder(payload.orderId, {
    paymentScreenshotUrl: payload.base64Image,
    updatedAt: new Date().toISOString(),
  } as Partial<Order>);
  return true;
}

export async function addFormSubmission(data: Record<string, any>): Promise<boolean> {
  await createSalesEnquiry({
    customerName: data.name || "",
    email: data.email || "",
    phone: data.phone || "",
    inquiryType: "ORDER_SUBMISSION",
    message: data.message || "",
    status: "NEW",
    source: "WEBSITE_ORDER",
    metadata: data,
  } as any);
  return true;
}

export async function getSocialMediaStats(): Promise<any[]> {
  return getAllFromTable("social_media_stats");
}

export async function saveSocialMediaStat(data: Record<string, any>): Promise<any> {
  return createInTable("social_media_stats", data);
}

export async function getUpcomingProducts(): Promise<any[]> {
  return getAllFromTable("upcoming_products");
}

export async function createUpcomingProduct(data: Record<string, any>): Promise<any> {
  return createInTable("upcoming_products", data);
}

export async function updateUpcomingProduct(id: string, updates: Record<string, any>): Promise<any | null> {
  return updateInTable("upcoming_products", id, updates);
}

export async function deleteUpcomingProduct(id: string): Promise<boolean> {
  return deleteFromTable("upcoming_products", id);
}

export async function getVideoReviews(): Promise<any[]> {
  return getAllFromTable("video_reviews");
}

export async function createVideoReview(data: Record<string, any>): Promise<any> {
  return createInTable("video_reviews", data);
}

export async function updateVideoReview(id: string, updates: Record<string, any>): Promise<any | null> {
  return updateInTable("video_reviews", id, updates);
}

export async function deleteVideoReview(id: string): Promise<boolean> {
  return deleteFromTable("video_reviews", id);
}

export async function getWhatsAppReviews(): Promise<any[]> {
  return getAllFromTable("whatsapp_reviews");
}

export async function createWhatsAppReview(data: Record<string, any>): Promise<any> {
  return createInTable("whatsapp_reviews", data);
}

export async function updateWhatsAppReview(id: string, updates: Record<string, any>): Promise<any | null> {
  return updateInTable("whatsapp_reviews", id, updates);
}

export async function deleteWhatsAppReview(id: string): Promise<boolean> {
  return deleteFromTable("whatsapp_reviews", id);
}

export async function getProductionVideos(): Promise<any[]> {
  return getAllFromTable("production_videos");
}

export async function createProductionVideo(data: Record<string, any>): Promise<any> {
  return createInTable("production_videos", data);
}

export async function updateProductionVideo(id: string, updates: Record<string, any>): Promise<any | null> {
  return updateInTable("production_videos", id, updates);
}

export async function deleteProductionVideo(id: string): Promise<boolean> {
  return deleteFromTable("production_videos", id);
}

export async function getAllCareers(): Promise<any[]> {
  return getAllFromTable("careers");
}

export async function createCareer(data: Record<string, any>): Promise<any> {
  return createInTable("careers", data);
}

export async function updateCareer(id: string, updates: Record<string, any>): Promise<any | null> {
  return updateInTable("careers", id, updates);
}

export async function deleteCareer(id: string): Promise<boolean> {
  return deleteFromTable("careers", id);
}

export async function getAllApplications(): Promise<any[]> {
  return getAllFromTable("applications");
}

export async function getApplicationsByJob(jobId: string): Promise<any[]> {
  const apps = await getAllApplications();
  return apps.filter((app: any) => String(app.jobId || "") === String(jobId || ""));
}

export async function createApplication(data: Record<string, any>): Promise<any> {
  return createInTable("applications", data);
}

export async function updateApplication(id: string, updates: Record<string, any>): Promise<any | null> {
  return updateInTable("applications", id, updates);
}

export async function getAllCredentials(): Promise<PlatformCredential[]> {
  const rows = await getAllFromTable("platform_credentials");
  return rows as PlatformCredential[];
}

export async function getCredentialsByUser(userId: string): Promise<PlatformCredential[]> {
  const rows = await getAllCredentials();
  return rows.filter((row: any) => String(row.assignedTo || "") === String(userId || ""));
}

export async function createCredential(data: Partial<PlatformCredential>): Promise<PlatformCredential> {
  const row = await createInTable("platform_credentials", data as Record<string, any>);
  return row as PlatformCredential;
}

export async function updateCredential(id: string, updates: Partial<PlatformCredential>): Promise<PlatformCredential | null> {
  const row = await updateInTable("platform_credentials", id, updates as Record<string, any>);
  return (row as PlatformCredential | null) || null;
}

export async function deleteCredential(id: string): Promise<boolean> {
  return deleteFromTable("platform_credentials", id);
}

export async function createSKU(data: Record<string, any>): Promise<any> {
  return createInTable("skus", data);
}

export async function updateSKU(id: string, updates: Record<string, any>): Promise<any | null> {
  return updateInTable("skus", id, updates);
}

export async function deleteSKU(id: string): Promise<boolean> {
  return deleteFromTable("skus", id);
}

export async function getAllInterns(): Promise<AdminUser[]> {
  const users = await getAllAdminUsers();
  return users.filter((user) => String(user.role || "") === "INTERN");
}

export default {
  // Cart
  createCart,
  getCartById,
  updateCart,
  deleteCart,
  // Orders
  createOrder,
  getAllOrders,
  getOrderById,
  getOrderByNumber,
  updateOrder,
  deleteOrder,
  assignInvoiceNumber,
  getOrdersByReferral,
  // Admin Users
  createAdminUser,
  getAdminByEmail,
  getAdminById,
  getAllAdminUsers,
  updateAdminUser,
  updateAdminLastLogin,
  deleteAdminUser,
  getTeamMembers,
  // Bulk Orders
  createBulkOrder,
  getAllBulkOrders,
  getBulkOrderById,
  getBulkOrderByNumber,
  updateBulkOrder,
  getBulkOrderStats,
  // Bulk Customers
  createBulkCustomer,
  getAllBulkCustomers,
  getBulkCustomersByUser,
  getBulkCustomersByTeam,
  updateBulkCustomer,
  deleteBulkCustomer,
  // Coupons
  createCoupon,
  getAllCoupons,
  validateCoupon,
  applyCoupon,
  updateCoupon,
  deleteCoupon,
  // Wholesale SKUs
  getWholesaleSKUs,
  updateWholesaleSKU,
  // Config
  getConfig,
  updateConfig,
  getSKUs,
  updateSKUPricing,
  // Sales Stats
  getUserSalesStats,
  // Bulk Enquiries
  getAllBulkEnquiries,
  createBulkEnquiry,
  updateBulkEnquiry,
  // Daily Reports
  createDailyReport,
  getAllDailyReports,
  // Sales Enquiries
  createSalesEnquiry,
  getAllSalesEnquiries,
  updateSalesEnquiry,
  // Extended Content / CMS
  uploadPaymentScreenshot,
  addFormSubmission,
  getSocialMediaStats,
  saveSocialMediaStat,
  getUpcomingProducts,
  createUpcomingProduct,
  updateUpcomingProduct,
  deleteUpcomingProduct,
  getVideoReviews,
  createVideoReview,
  updateVideoReview,
  deleteVideoReview,
  getWhatsAppReviews,
  createWhatsAppReview,
  updateWhatsAppReview,
  deleteWhatsAppReview,
  getProductionVideos,
  createProductionVideo,
  updateProductionVideo,
  deleteProductionVideo,
  getAllCareers,
  createCareer,
  updateCareer,
  deleteCareer,
  getAllApplications,
  getApplicationsByJob,
  createApplication,
  updateApplication,
  getAllCredentials,
  getCredentialsByUser,
  createCredential,
  updateCredential,
  deleteCredential,
  createSKU,
  updateSKU,
  deleteSKU,
  getAllInterns,
};
