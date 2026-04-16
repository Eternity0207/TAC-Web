import { randomUUID } from "crypto";
import {
  deleteRows,
  insertRow,
  selectRows,
  updateRows,
  upsertRows,
} from "./client";

type ScriptResponse = { success: boolean; message?: string; data?: any };

type TableConfig = {
  table: string;
  getId: (row: any) => string;
};

const tables: Record<string, TableConfig> = {
  orders: { table: "orders", getId: (r) => r.id || randomUUID() },
  adminUsers: { table: "admin_users", getId: (r) => r.id || r.email || randomUUID() },
  bulkOrders: { table: "bulk_orders", getId: (r) => r.id || randomUUID() },
  bulkCustomers: { table: "bulk_customers", getId: (r) => r.id || r.customerPhone || randomUUID() },
  coupons: { table: "discount_coupons", getId: (r) => r.id || r.couponCode || randomUUID() },
  wholesaleSkus: { table: "wholesale_skus", getId: (r) => r.skuId || r.id || randomUUID() },
  dailyReports: { table: "daily_reports", getId: (r) => r.id || randomUUID() },
  salesEnquiries: { table: "sales_enquiries", getId: (r) => r.id || randomUUID() },
  credentials: { table: "platform_credentials", getId: (r) => r.id || randomUUID() },
  socialMediaStats: { table: "social_media_stats", getId: (r) => r.id || `${r.date}-${r.platform}` },
  upcomingProducts: { table: "upcoming_products", getId: (r) => r.id || randomUUID() },
  bulkEnquiries: { table: "bulk_enquiries", getId: (r) => r.id || randomUUID() },
  videoReviews: { table: "video_reviews", getId: (r) => r.id || randomUUID() },
  whatsappReviews: { table: "whatsapp_reviews", getId: (r) => r.id || randomUUID() },
  productionVideos: { table: "production_videos", getId: (r) => r.id || randomUUID() },
  careers: { table: "careers", getId: (r) => r.id || randomUUID() },
  applications: { table: "applications", getId: (r) => r.id || randomUUID() },
  products: { table: "products", getId: (r) => r.id || r.slug || randomUUID() },
  tags: { table: "tags", getId: (r) => r.id || r.slug || randomUUID() },
  reviews: { table: "reviews", getId: (r) => r.id || randomUUID() },
  inventoryBatches: { table: "inventory_batches", getId: (r) => r.id || r.batchNumber || randomUUID() },
  skus: { table: "skus", getId: (r) => r.skuId || r.id || randomUUID() },
  configs: { table: "config_kv", getId: (r) => r.configType || randomUUID() },
};

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

function parseDate(value: string | undefined) {
  if (!value) return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date();
  return date;
}

async function generateYearlySequenceNumber(
  name: "orders" | "bulkOrders",
  prefix: "ORD" | "BLK",
  createdAt?: string,
) {
  const t = tables[name];
  const rows = await selectRows(t.table);
  const date = parseDate(createdAt);
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

async function all(name: keyof typeof tables) {
  const t = tables[name];
  const rows = await selectRows(t.table);
  return rows.map((r: any) => normalizeRow(r));
}

async function upsert(name: keyof typeof tables, rows: any[]) {
  const t = tables[name];
  await upsertRows(
    t.table,
    rows.map((r) => ({ id: t.getId(r), data: r, updated_at: new Date().toISOString() }))
  );
}

async function create(name: keyof typeof tables, row: any) {
  const t = tables[name];
  const nowIso = new Date().toISOString();
  const id = t.getId(row || {});
  const data = row && typeof row === "object" ? { ...row } : {};

  data.id = data.id || id;
  data.createdAt = data.createdAt || nowIso;
  data.updatedAt = data.updatedAt || nowIso;

  if (name === "orders" && !String(data.orderNumber || "").trim()) {
    data.orderNumber = await generateYearlySequenceNumber(
      "orders",
      "ORD",
      data.createdAt,
    );
  }

  if (name === "bulkOrders" && !String(data.orderNumber || "").trim()) {
    data.orderNumber = await generateYearlySequenceNumber(
      "bulkOrders",
      "BLK",
      data.createdAt,
    );
  }

  const payload = { id, data, updated_at: nowIso };
  const created = await insertRow(t.table, payload);
  return normalizeRow(created || payload);
}

async function updateById(name: keyof typeof tables, id: string, updates: any) {
  const t = tables[name];
  const rows = await selectRows(t.table, { id });
  if (!rows.length) return null;
  const existing = normalizeRow(rows[0]);
  const merged = {
    ...existing,
    ...(updates || {}),
    id: existing.id || id,
    updatedAt: new Date().toISOString(),
  };
  const out = await updateRows(t.table, { data: merged, updated_at: new Date().toISOString() }, { id });
  return normalizeRow(out[0] || { id, data: merged });
}

async function findBy(name: keyof typeof tables, key: string, value: string) {
  if (key === "id") {
    const t = tables[name];
    const rows = await selectRows(t.table, { id: value });
    if (rows.length) return normalizeRow(rows[0]);
    return null;
  }
  const data = await all(name);
  return data.find((r: any) => String(r?.[key]) === String(value)) || null;
}

function ok(data?: any): ScriptResponse {
  return { success: true, data };
}

export async function callPostgresAction(action: string, payload: any = {}): Promise<ScriptResponse> {
  switch (action) {
    case "getAllOrders": return ok(await all("orders"));
    case "getOrderById": return ok(await findBy("orders", "id", payload.id));
    case "getOrderByNumber": return ok(await findBy("orders", "orderNumber", payload.orderNumber));
    case "createOrder": return ok(await create("orders", payload));
    case "updateOrder": return ok(await updateById("orders", payload.id, payload.updates || {}));

    case "getAdminByEmail": return ok(await findBy("adminUsers", "email", payload.email));
    case "getAllAdminUsers": return ok(await all("adminUsers"));
    case "createAdminUser": return ok(await create("adminUsers", payload));
    case "updateAdminUser": return ok(await updateById("adminUsers", payload.id, payload.updates || {}));
    case "deleteAdminUser": await deleteRows(tables.adminUsers.table, { id: payload.id }); return ok(true);
    case "updateAdminLastLogin": return ok(await updateById("adminUsers", payload.id, { lastLoginAt: new Date().toISOString() }));

    case "getConfig": {
      const row = await findBy("configs", "configType", payload.configType);
      return ok(row || null);
    }
    case "updateConfig": {
      const id = payload.configType;
      const row = { configType: payload.configType, ...(payload.data || {}) };
      const existing = await selectRows(tables.configs.table, { id });
      if (existing.length) await updateRows(tables.configs.table, { data: row, updated_at: new Date().toISOString() }, { id });
      else await insertRow(tables.configs.table, { id, data: row, updated_at: new Date().toISOString() });
      return ok(true);
    }

    case "getSKUs": return ok(await all("skus"));
    case "updateSKUPricing": return ok(await updateById("skus", payload.skuId, payload.updates || {}));

    case "getOrdersByReferral": {
      const rows = await all("orders");
      const x = String(payload.referredBy || "").toLowerCase();
      return ok(rows.filter((r: any) => String(r?.referredBy || "").toLowerCase() === x));
    }
    case "getUserSalesStats": {
      const rows = await all("orders");
      const filtered = rows.filter((r: any) => r?.createdBy === payload.userId || r?.referredBy === payload.userId);
      const totalOrders = filtered.length;
      const totalRevenue = filtered.reduce((s: number, r: any) => s + Number(r.totalAmount || 0), 0);
      return ok({ totalOrders, totalRevenue });
    }
    case "getTeamMembers": {
      const users = await all("adminUsers");
      return ok(users.filter((u: any) => String(u?.managerId || "") === String(payload.managerId || "")));
    }

    case "getAllBulkOrders": return ok(await all("bulkOrders"));
    case "getBulkOrderById": return ok(await findBy("bulkOrders", "id", payload.id));
    case "getBulkOrderByNumber": return ok(await findBy("bulkOrders", "orderNumber", payload.orderNumber));
    case "createBulkOrder": return ok(await create("bulkOrders", payload));
    case "updateBulkOrder": return ok(await updateById("bulkOrders", payload.id, payload.updates || {}));
    case "getBulkOrderStats": {
      const rows = await all("bulkOrders");
      const totalOrders = rows.length;
      const totalRevenue = rows.reduce((s: number, r: any) => s + Number(r.totalAmount || 0), 0);
      return ok({ totalOrders, totalRevenue });
    }

    case "getAllBulkCustomers": return ok(await all("bulkCustomers"));
    case "createBulkCustomer": return ok(await create("bulkCustomers", payload));
    case "updateBulkCustomer": return ok(await updateById("bulkCustomers", payload.id, payload.updates || {}));
    case "deleteBulkCustomer": await deleteRows(tables.bulkCustomers.table, { id: payload.id }); return ok(true);
    case "getBulkCustomersByUser": {
      const rows = await all("bulkCustomers");
      return ok(rows.filter((r: any) => String(r.createdBy || "") === String(payload.userId || "")));
    }
    case "getBulkCustomersByTeam": {
      const rows = await all("bulkCustomers");
      return ok(rows.filter((r: any) => String(r.managerId || "") === String(payload.managerId || "")));
    }

    case "getAllCoupons": return ok(await all("coupons"));
    case "createCoupon": return ok(await create("coupons", payload));
    case "updateCoupon": return ok(await updateById("coupons", payload.id, payload.updates || {}));
    case "deleteCoupon": await deleteRows(tables.coupons.table, { id: payload.id }); return ok(true);
    case "validateCoupon": {
      const coupons = await all("coupons");
      const coupon = coupons.find((c: any) => String(c.couponCode || "").toLowerCase() === String(payload.couponCode || "").toLowerCase());
      if (!coupon) return { success: true, valid: false, message: "Coupon not found" } as any;
      const subtotal = Number(payload.subtotal || 0);
      const discountAmount = coupon.discountType === "PERCENTAGE"
        ? (subtotal * Number(coupon.discountValue || 0)) / 100
        : Number(coupon.discountValue || 0);
      return { success: true, valid: true, coupon, discountAmount, message: "Coupon valid" } as any;
    }
    case "applyCoupon": {
      const coupons = await all("coupons");
      const coupon = coupons.find((c: any) => String(c.couponCode || "").toLowerCase() === String(payload.couponCode || "").toLowerCase());
      if (!coupon) return { success: false, message: "Coupon not found" };
      await updateById("coupons", coupon.id, { usedCount: Number(coupon.usedCount || 0) + 1 });
      return ok(true);
    }

    case "getWholesaleSKUs": return ok(await all("wholesaleSkus"));
    case "updateWholesaleSKU": return ok(await updateById("wholesaleSkus", payload.skuId, payload.updates || {}));

    case "getSocialMediaStats": return ok(await all("socialMediaStats"));
    case "saveSocialMediaStat": return ok(await create("socialMediaStats", payload));

    case "getUpcomingProducts": return ok(await all("upcomingProducts"));
    case "createUpcomingProduct": return ok(await create("upcomingProducts", payload));
    case "updateUpcomingProduct": return ok(await updateById("upcomingProducts", payload.id, payload.updates || {}));
    case "deleteUpcomingProduct": await deleteRows(tables.upcomingProducts.table, { id: payload.id }); return ok(true);

    case "getAllBulkEnquiries": return ok(await all("bulkEnquiries"));
    case "createBulkEnquiry": return ok(await create("bulkEnquiries", payload));
    case "updateBulkEnquiry": return ok(await updateById("bulkEnquiries", payload.id, payload.updates || {}));

    case "getVideoReviews": return ok(await all("videoReviews"));
    case "createVideoReview": return ok(await create("videoReviews", payload));
    case "updateVideoReview": return ok(await updateById("videoReviews", payload.id, payload.updates || {}));
    case "deleteVideoReview": await deleteRows(tables.videoReviews.table, { id: payload.id }); return ok(true);

    case "getWhatsAppReviews": return ok(await all("whatsappReviews"));
    case "createWhatsAppReview": return ok(await create("whatsappReviews", payload));
    case "updateWhatsAppReview": return ok(await updateById("whatsappReviews", payload.id, payload.updates || {}));
    case "deleteWhatsAppReview": await deleteRows(tables.whatsappReviews.table, { id: payload.id }); return ok(true);

    case "getProductionVideos": return ok(await all("productionVideos"));
    case "createProductionVideo": return ok(await create("productionVideos", payload));
    case "updateProductionVideo": return ok(await updateById("productionVideos", payload.id, payload.updates || {}));
    case "deleteProductionVideo": await deleteRows(tables.productionVideos.table, { id: payload.id }); return ok(true);

    case "getAllCareers": return ok(await all("careers"));
    case "createCareer": return ok(await create("careers", payload));
    case "updateCareer": return ok(await updateById("careers", payload.id, payload.updates || {}));
    case "deleteCareer": await deleteRows(tables.careers.table, { id: payload.id }); return ok(true);

    case "getAllApplications": return ok(await all("applications"));
    case "getApplicationsByJob": {
      const rows = await all("applications");
      return ok(rows.filter((r: any) => String(r.jobId || "") === String(payload.jobId || "")));
    }
    case "createApplication": return ok(await create("applications", payload));
    case "updateApplication": return ok(await updateById("applications", payload.id, payload.updates || {}));

    case "createDailyReport": return ok(await create("dailyReports", payload));
    case "getAllDailyReports": return ok(await all("dailyReports"));

    case "createSalesEnquiry": return ok(await create("salesEnquiries", payload));
    case "getAllSalesEnquiries": return ok(await all("salesEnquiries"));
    case "updateSalesEnquiry": return ok(await updateById("salesEnquiries", payload.id, payload.updates || {}));

    case "createCredential": return ok(await create("credentials", payload));
    case "getAllCredentials": return ok(await all("credentials"));
    case "getCredentialsByUser": {
      const rows = await all("credentials");
      return ok(rows.filter((r: any) => String(r.assignedTo || "") === String(payload.userId || "")));
    }
    case "updateCredential": return ok(await updateById("credentials", payload.id, payload.updates || {}));
    case "deleteCredential": await deleteRows(tables.credentials.table, { id: payload.id }); return ok(true);

    case "getAllProducts": return ok(await all("products"));
    case "getProductBySlug": return ok(await findBy("products", "slug", payload.slug));
    case "createProduct": return ok(await create("products", payload));
    case "updateProduct": return ok(await updateById("products", payload.id, payload.updates || {}));
    case "deleteProduct": await deleteRows(tables.products.table, { id: payload.id }); return ok(true);

    case "getAllTags": return ok(await all("tags"));
    case "createTag": return ok(await create("tags", payload));
    case "updateTag": return ok(await updateById("tags", payload.id, payload.updates || {}));
    case "deleteTag": await deleteRows(tables.tags.table, { id: payload.id }); return ok(true);

    case "getProductsBySection": {
      const tags = await all("tags");
      const products = await all("products");
      const sections = tags.filter((t: any) => t.type === "SECTION");
      return ok(
        sections.map((s: any) => {
          const slugs = String(s.productSlugs || "").split(",").map((x) => x.trim()).filter(Boolean);
          return { ...s, products: products.filter((p: any) => slugs.includes(p.slug)) };
        })
      );
    }

    case "submitReview": return ok(await create("reviews", { ...payload, status: "PENDING" }));
    case "getApprovedReviews": {
      const rows = await all("reviews");
      return ok(rows.filter((r: any) => r.status === "APPROVED"));
    }
    case "getAllReviews": return ok(await all("reviews"));
    case "updateReviewStatus": return ok(await updateById("reviews", payload.id, { status: payload.status }));
    case "deleteReview": await deleteRows(tables.reviews.table, { id: payload.id }); return ok(true);
    case "getReviewPhoto": {
      const r = await findBy("reviews", "id", payload.id);
      return ok(r?.photoUrl ? { photo: r.photoUrl, mimeType: "image/jpeg" } : null);
    }

    case "createBatch": return ok(await create("inventoryBatches", payload));
    case "getAllBatches": {
      let rows = await all("inventoryBatches");
      if (payload.status) rows = rows.filter((r: any) => r.status === payload.status);
      if (payload.productId) rows = rows.filter((r: any) => r.productId === payload.productId);
      if (payload.productName) rows = rows.filter((r: any) => String(r.productName || "").toLowerCase().includes(String(payload.productName).toLowerCase()));
      return ok(rows);
    }
    case "getBatchById": return ok(await findBy("inventoryBatches", "id", payload.id));
    case "getBatchByNumber": return ok(await findBy("inventoryBatches", "batchNumber", payload.batchNumber));
    case "updateBatch": return ok(await updateById("inventoryBatches", payload.id, payload));
    case "deleteBatch": await deleteRows(tables.inventoryBatches.table, { id: payload.id }); return ok(true);
    case "deductQuantity": {
      const row = await findBy("inventoryBatches", "id", payload.batchId);
      if (!row) return { success: false, message: "Batch not found" };
      const rem = Math.max(0, Number(row.remainingQuantity || 0) - Number(payload.quantity || 0));
      return ok(await updateById("inventoryBatches", row.id, { remainingQuantity: rem, status: rem <= 0 ? "DEPLETED" : row.status }));
    }
    case "getStats": {
      const rows = await all("inventoryBatches");
      const totalBatches = rows.length;
      const activeBatches = rows.filter((r: any) => r.status === "ACTIVE").length;
      const depletedBatches = rows.filter((r: any) => r.status === "DEPLETED").length;
      const expiredBatches = rows.filter((r: any) => r.status === "EXPIRED").length;
      const totalQuantity = rows.reduce((s: number, r: any) => s + Number(r.quantity || 0), 0);
      const totalRemainingQuantity = rows.reduce((s: number, r: any) => s + Number(r.remainingQuantity || 0), 0);
      const totalValue = rows.reduce((s: number, r: any) => s + Number(r.remainingQuantity || 0) * Number(r.mrp || 0), 0);
      return ok({ totalBatches, activeBatches, depletedBatches, expiredBatches, expiringSoonBatches: 0, totalQuantity, totalRemainingQuantity, totalValue, productBreakdown: [] });
    }

    default:
      return { success: false, message: `Unsupported postgres action: ${action}` };
  }
}

export async function seedFromActions(datasets: Record<string, any[]>) {
  const map: Record<string, keyof typeof tables> = {
    orders: "orders",
    adminUsers: "adminUsers",
    bulkOrders: "bulkOrders",
    bulkCustomers: "bulkCustomers",
    coupons: "coupons",
    wholesaleSkus: "wholesaleSkus",
    dailyReports: "dailyReports",
    salesEnquiries: "salesEnquiries",
    credentials: "credentials",
    socialMediaStats: "socialMediaStats",
    upcomingProducts: "upcomingProducts",
    bulkEnquiries: "bulkEnquiries",
    videoReviews: "videoReviews",
    whatsappReviews: "whatsappReviews",
    productionVideos: "productionVideos",
    careers: "careers",
    applications: "applications",
    products: "products",
    tags: "tags",
    reviews: "reviews",
    inventoryBatches: "inventoryBatches",
    skus: "skus",
  };

  for (const [k, rows] of Object.entries(datasets)) {
    if (!Array.isArray(rows) || !rows.length) continue;
    const tableKey = map[k];
    if (!tableKey) continue;
    await upsert(tableKey, rows);
  }
}
