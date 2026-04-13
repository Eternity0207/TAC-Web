import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { seedFromActions } from "../src/repos/googleSheetsRepo";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function callMain(action: string, payload: any = {}) {
  const url = required("APPS_SCRIPT_URL");
  const apiKey = required("APPS_SCRIPT_API_KEY");
  const response = await axios.post(url, { apiKey, action, payload }, { timeout: 60000 });
  return response.data;
}

async function callInventory(action: string, payload: any = {}) {
  const url = required("INVENTORY_SCRIPT_URL");
  const apiKey = required("INVENTORY_API_KEY");
  const response = await axios.post(`${url}?action=${action}`, { ...payload, apiKey, referer: "api.theawlacompany.com" }, { timeout: 60000 });
  return response.data;
}

async function callReviews(action: string, payload: any = {}, auth = false) {
  const url = required("REVIEWS_SCRIPT_URL");
  const apiKey = process.env.REVIEWS_API_KEY || "";
  const body: any = { action, payload };
  if (auth) body.apiKey = apiKey;
  const response = await axios.post(url, body, { timeout: 60000 });
  return response.data;
}

async function main() {
  required("SUPABASE_URL");
  required("SUPABASE_SERVICE_ROLE_KEY");

  const dryRun = process.argv.includes("--dry-run");
  const datasets: Record<string, any[]> = {};

  const mainActions: Record<string, string> = {
    orders: "getAllOrders",
    adminUsers: "getAllAdminUsers",
    bulkOrders: "getAllBulkOrders",
    bulkCustomers: "getAllBulkCustomers",
    coupons: "getAllCoupons",
    wholesaleSkus: "getWholesaleSKUs",
    dailyReports: "getAllDailyReports",
    salesEnquiries: "getAllSalesEnquiries",
    credentials: "getAllCredentials",
    socialMediaStats: "getSocialMediaStats",
    upcomingProducts: "getUpcomingProducts",
    bulkEnquiries: "getAllBulkEnquiries",
    videoReviews: "getVideoReviews",
    whatsappReviews: "getWhatsAppReviews",
    productionVideos: "getProductionVideos",
    careers: "getAllCareers",
    applications: "getAllApplications",
    products: "getAllProducts",
    tags: "getAllTags",
    skus: "getSKUs",
  };

  for (const [k, action] of Object.entries(mainActions)) {
    const res = await callMain(action, {});
    datasets[k] = Array.isArray(res?.data) ? res.data : [];
    console.log(`[extract] ${k}: ${datasets[k].length}`);
  }

  const reviews = await callReviews("getAllReviews", {}, true);
  datasets.reviews = Array.isArray(reviews?.data) ? reviews.data : [];
  console.log(`[extract] reviews: ${datasets.reviews.length}`);

  const batches = await callInventory("getAllBatches", {});
  datasets.inventoryBatches = Array.isArray(batches?.data) ? batches.data : [];
  console.log(`[extract] inventoryBatches: ${datasets.inventoryBatches.length}`);

  if (dryRun) {
    console.log("[dry-run] extraction complete; skipping load");
    return;
  }

  await seedFromActions(datasets);
  console.log("[load] completed");
}

main().catch((err) => {
  console.error("migration failed:", err.message);
  process.exit(1);
});
