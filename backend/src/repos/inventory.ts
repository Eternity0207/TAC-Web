import { supabase } from "./client";

interface ScriptResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

const ok = <T>(data?: T): ScriptResponse<T> => ({ success: true, data });
const fail = <T>(message: string): ScriptResponse<T> => ({ success: false, message });

function mapBatch(row: any) {
  return {
    id: row.id,
    batchNumber: row.batch_number,
    productId: row.product_id,
    productName: row.product_name,
    packaging: row.packaging,
    quantity: row.quantity,
    remainingQuantity: row.remaining_quantity,
    mrp: row.mrp,
    mfgDate: row.mfg_date,
    expiryDate: row.expiry_date,
    status: row.status,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createBatch(data: any): Promise<ScriptResponse<any>> {
  const { data: created, error } = await supabase
    .from("inventory_batches")
    .insert({
      batch_number: data.batchNumber,
      product_id: data.productId,
      product_name: data.productName,
      packaging: data.packaging,
      quantity: Number(data.quantity || 0),
      remaining_quantity: Number(data.remainingQuantity ?? data.quantity ?? 0),
      mrp: Number(data.mrp || 0),
      mfg_date: data.mfgDate,
      expiry_date: data.expiryDate,
      status: data.status || "ACTIVE",
      notes: data.notes || "",
      created_by: data.createdBy || "",
    })
    .select("*")
    .single();
  if (error) return fail(error.message);
  return ok(mapBatch(created));
}

export async function getAllBatches(filters: any = {}): Promise<ScriptResponse<any[]>> {
  let query = supabase.from("inventory_batches").select("*").order("created_at", { ascending: false });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.productId) query = query.eq("product_id", filters.productId);
  if (filters.productName) query = query.ilike("product_name", `%${filters.productName}%`);
  const { data, error } = await query;
  if (error) return fail(error.message);
  return ok((data || []).map(mapBatch));
}

export async function getBatchById(id: string): Promise<ScriptResponse<any>> {
  const { data, error } = await supabase.from("inventory_batches").select("*").eq("id", id).maybeSingle();
  if (error || !data) return fail(error?.message || "Batch not found");
  return ok(mapBatch(data));
}

export async function getBatchByNumber(batchNumber: string): Promise<ScriptResponse<any>> {
  const { data, error } = await supabase.from("inventory_batches").select("*").eq("batch_number", batchNumber).maybeSingle();
  if (error || !data) return fail(error?.message || "Batch not found");
  return ok(mapBatch(data));
}

export async function updateBatch(id: string, updates: any): Promise<ScriptResponse<any>> {
  const payload: any = {};
  if (typeof updates.batchNumber !== "undefined") payload.batch_number = updates.batchNumber;
  if (typeof updates.productId !== "undefined") payload.product_id = updates.productId;
  if (typeof updates.productName !== "undefined") payload.product_name = updates.productName;
  if (typeof updates.packaging !== "undefined") payload.packaging = updates.packaging;
  if (typeof updates.quantity !== "undefined") payload.quantity = Number(updates.quantity);
  if (typeof updates.remainingQuantity !== "undefined") payload.remaining_quantity = Number(updates.remainingQuantity);
  if (typeof updates.mrp !== "undefined") payload.mrp = Number(updates.mrp);
  if (typeof updates.mfgDate !== "undefined") payload.mfg_date = updates.mfgDate;
  if (typeof updates.expiryDate !== "undefined") payload.expiry_date = updates.expiryDate;
  if (typeof updates.status !== "undefined") payload.status = updates.status;
  if (typeof updates.notes !== "undefined") payload.notes = updates.notes;

  const { data, error } = await supabase
    .from("inventory_batches")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error || !data) return fail(error?.message || "Batch not found");
  return ok(mapBatch(data));
}

export async function deleteBatch(id: string): Promise<ScriptResponse<void>> {
  const { error } = await supabase.from("inventory_batches").delete().eq("id", id);
  if (error) return fail(error.message);
  return ok();
}

export async function deductBatchQuantity(batchId: string, quantity: number): Promise<ScriptResponse<any>> {
  const current = await getBatchById(batchId);
  if (!current.success || !current.data) return fail(current.message || "Batch not found");
  const next = Math.max(0, Number(current.data.remainingQuantity || 0) - Number(quantity || 0));
  const status = next <= 0 ? "DEPLETED" : current.data.status;
  return updateBatch(batchId, { remainingQuantity: next, status });
}

export async function getInventoryStats(): Promise<ScriptResponse<any>> {
  const all = await getAllBatches();
  if (!all.success) return fail(all.message || "Failed to fetch batches");
  const batches = all.data || [];
  const active = batches.filter((b: any) => b.status === "ACTIVE");
  const depleted = batches.filter((b: any) => b.status === "DEPLETED");
  const expired = batches.filter((b: any) => b.status === "EXPIRED");
  const soon = batches.filter((b: any) => {
    if (!b.expiryDate) return false;
    const diffDays = (new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 30;
  });

  const productMap = new Map<string, any>();
  for (const b of batches) {
    const key = `${b.productId}|${b.packaging}`;
    const curr = productMap.get(key) || {
      productId: b.productId,
      productName: b.productName,
      packaging: b.packaging,
      totalBatches: 0,
      activeBatches: 0,
      totalQuantity: 0,
      remainingQuantity: 0,
      totalValue: 0,
    };
    curr.totalBatches += 1;
    if (b.status === "ACTIVE") curr.activeBatches += 1;
    curr.totalQuantity += Number(b.quantity || 0);
    curr.remainingQuantity += Number(b.remainingQuantity || 0);
    curr.totalValue += Number(b.remainingQuantity || 0) * Number(b.mrp || 0);
    productMap.set(key, curr);
  }

  return ok({
    totalBatches: batches.length,
    activeBatches: active.length,
    depletedBatches: depleted.length,
    expiredBatches: expired.length,
    expiringSoonBatches: soon.length,
    totalQuantity: batches.reduce((s: number, b: any) => s + Number(b.quantity || 0), 0),
    totalRemainingQuantity: batches.reduce((s: number, b: any) => s + Number(b.remainingQuantity || 0), 0),
    totalValue: batches.reduce((s: number, b: any) => s + Number(b.remainingQuantity || 0) * Number(b.mrp || 0), 0),
    productBreakdown: Array.from(productMap.values()),
  });
}

export async function getLowStockBatches(threshold = 10): Promise<ScriptResponse<any[]>> {
  const all = await getAllBatches({ status: "ACTIVE" });
  if (!all.success) return fail(all.message || "Failed to fetch batches");
  return ok((all.data || []).filter((b: any) => Number(b.remainingQuantity || 0) <= Number(threshold)));
}

export async function getExpiringSoonBatches(days = 30): Promise<ScriptResponse<any[]>> {
  const all = await getAllBatches({ status: "ACTIVE" });
  if (!all.success) return fail(all.message || "Failed to fetch batches");
  return ok((all.data || []).filter((b: any) => {
    if (!b.expiryDate) return false;
    const diffDays = (new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= Number(days);
  }));
}

export async function createMultipleBatches(batches: any[]): Promise<ScriptResponse<any[]>> {
  const out: any[] = [];
  for (const b of batches || []) {
    const created = await createBatch(b);
    if (!created.success) return fail(created.message || "Failed to create batch");
    if (created.data) out.push(created.data);
  }
  return ok(out);
}

export async function initInventorySheet(): Promise<ScriptResponse<void>> {
  return ok();
}

const unsupported = {
  getUnitEconomics: async (..._args: any[]) => null,
  updateUnitEconomics: async (..._args: any[]) => false,
  getAllCompetitors: async (..._args: any[]) => [],
  createCompetitor: async (..._args: any[]) => null,
  updateCompetitor: async (..._args: any[]) => false,
  deleteCompetitor: async (..._args: any[]) => false,
  getCompetitorHistory: async (..._args: any[]) => [],
  getCompetitorVersion: async (..._args: any[]) => null,
  revertCompetitor: async (..._args: any[]) => null,
  getAllCommissionSettings: async (..._args: any[]) => [],
  getCommissionSettingsByUserId: async (..._args: any[]) => null,
  upsertCommissionSettings: async (..._args: any[]) => null,
  bulkUpdateCommissionSettings: async (..._args: any[]) => false,
  deleteCommissionSettings: async (..._args: any[]) => false,
  getManagerDistributions: async (..._args: any[]) => [],
  getAllMonthlyTargets: async (..._args: any[]) => [],
  upsertMonthlyTarget: async (..._args: any[]) => null,
  getTeamEarnings: async (..._args: any[]) => [],
  getUserEarnings: async (..._args: any[]) => [],
  getManagerTeamEarnings: async (..._args: any[]) => null,
  upsertTeamEarning: async (..._args: any[]) => null,
  calculateAndReleaseEarnings: async (..._args: any[]) => null,
};

export default {
  createBatch,
  getAllBatches,
  getBatchById,
  getBatchByNumber,
  updateBatch,
  deleteBatch,
  deductBatchQuantity,
  getInventoryStats,
  getLowStockBatches,
  getExpiringSoonBatches,
  createMultipleBatches,
  initInventorySheet,
  ...unsupported,
};

export const getUnitEconomics = unsupported.getUnitEconomics;
export const updateUnitEconomics = unsupported.updateUnitEconomics;
export const getAllCompetitors = unsupported.getAllCompetitors;
export const createCompetitor = unsupported.createCompetitor;
export const updateCompetitor = unsupported.updateCompetitor;
export const deleteCompetitor = unsupported.deleteCompetitor;
export const getCompetitorHistory = unsupported.getCompetitorHistory;
export const getCompetitorVersion = unsupported.getCompetitorVersion;
export const revertCompetitor = unsupported.revertCompetitor;
export const getAllCommissionSettings = unsupported.getAllCommissionSettings;
export const getCommissionSettingsByUserId = unsupported.getCommissionSettingsByUserId;
export const upsertCommissionSettings = unsupported.upsertCommissionSettings;
export const bulkUpdateCommissionSettings = unsupported.bulkUpdateCommissionSettings;
export const deleteCommissionSettings = unsupported.deleteCommissionSettings;
export const getManagerDistributions = unsupported.getManagerDistributions;
export const getAllMonthlyTargets = unsupported.getAllMonthlyTargets;
export const upsertMonthlyTarget = unsupported.upsertMonthlyTarget;
export const getTeamEarnings = unsupported.getTeamEarnings;
export const getUserEarnings = unsupported.getUserEarnings;
export const getManagerTeamEarnings = unsupported.getManagerTeamEarnings;
export const upsertTeamEarning = unsupported.upsertTeamEarning;
export const calculateAndReleaseEarnings = unsupported.calculateAndReleaseEarnings;
