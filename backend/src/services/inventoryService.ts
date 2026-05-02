import inventoryRepo, {
  createBatch as pgCreateBatch,
  getAllBatches as pgGetAllBatches,
  getBatchById as pgGetBatchById,
  getBatchByNumber as pgGetBatchByNumber,
  updateBatch as pgUpdateBatch,
  deleteBatch as pgDeleteBatch,
  deductBatchQuantity as pgDeductBatchQuantity,
  getInventoryStats as pgGetInventoryStats,
  getLowStockBatches as pgGetLowStockBatches,
  getExpiringSoonBatches as pgGetExpiringSoonBatches,
  createMultipleBatches as pgCreateMultipleBatches,
  initInventorySheet as pgInitInventorySheet,
  getUnitEconomics as pgGetUnitEconomics,
  updateUnitEconomics as pgUpdateUnitEconomics,
  getAllCompetitors as pgGetAllCompetitors,
  createCompetitor as pgCreateCompetitor,
  updateCompetitor as pgUpdateCompetitor,
  deleteCompetitor as pgDeleteCompetitor,
  getCompetitorHistory as pgGetCompetitorHistory,
  getCompetitorVersion as pgGetCompetitorVersion,
  revertCompetitor as pgRevertCompetitor,
  getAllCommissionSettings as pgGetAllCommissionSettings,
  getCommissionSettingsByUserId as pgGetCommissionSettingsByUserId,
  upsertCommissionSettings as pgUpsertCommissionSettings,
  bulkUpdateCommissionSettings as pgBulkUpdateCommissionSettings,
  deleteCommissionSettings as pgDeleteCommissionSettings,
  getManagerDistributions as pgGetManagerDistributions,
  getAllMonthlyTargets as pgGetAllMonthlyTargets,
  upsertMonthlyTarget as pgUpsertMonthlyTarget,
  getTeamEarnings as pgGetTeamEarnings,
  getUserEarnings as pgGetUserEarnings,
  getManagerTeamEarnings as pgGetManagerTeamEarnings,
  upsertTeamEarning as pgUpsertTeamEarning,
  calculateAndReleaseEarnings as pgCalculateAndReleaseEarnings,
} from "../repos/inventory";

// Inventory data in this project is primarily stored through the generic
// action repository shape (id + data JSON rows). Keeping direct table mode
// disabled avoids runtime 500 errors when column-based tables are unavailable.
const usePostgres = false;

export interface InventoryBatch {
  id: string;
  batchNumber: string;
  productId: string;
  productName: string;
  packaging: string;
  quantity: number;
  remainingQuantity: number;
  mrp: number;
  mfgDate: string;
  expiryDate: string;
  status: "ACTIVE" | "DEPLETED" | "EXPIRED";
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryStats {
  totalBatches: number;
  activeBatches: number;
  depletedBatches: number;
  expiredBatches: number;
  expiringSoonBatches: number;
  totalQuantity: number;
  totalRemainingQuantity: number;
  totalValue: number;
  productBreakdown: {
    productId: string;
    productName: string;
    packaging: string;
    totalBatches: number;
    activeBatches: number;
    totalQuantity: number;
    remainingQuantity: number;
    totalValue: number;
  }[];
}

interface ScriptResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

async function callInventoryScript<T = any>(
  action: string,
  payload: any = {}
): Promise<ScriptResponse<T>> {
  const { callPostgresAction } = await import("../repos/googleSheetsRepo");
  return (await callPostgresAction(action, payload)) as ScriptResponse<T>;
}

export async function createBatch(
  data: Partial<InventoryBatch>
): Promise<ScriptResponse<InventoryBatch>> {
  if (usePostgres) return await pgCreateBatch(data);
  return await callInventoryScript<InventoryBatch>("createBatch", data);
}

export async function getAllBatches(filters?: {
  status?: string;
  productId?: string;
  productName?: string;
}): Promise<ScriptResponse<InventoryBatch[]>> {
  if (usePostgres) return await pgGetAllBatches(filters);
  return await callInventoryScript<InventoryBatch[]>("getAllBatches", filters);
}

export async function getBatchById(
  id: string
): Promise<ScriptResponse<InventoryBatch>> {
  if (usePostgres) return await pgGetBatchById(id);
  return await callInventoryScript<InventoryBatch>("getBatchById", { id });
}

export async function getBatchByNumber(
  batchNumber: string
): Promise<ScriptResponse<InventoryBatch>> {
  if (usePostgres) return await pgGetBatchByNumber(batchNumber);
  return await callInventoryScript<InventoryBatch>("getBatchByNumber", {
    batchNumber,
  });
}

export async function updateBatch(
  id: string,
  updates: Partial<InventoryBatch>
): Promise<ScriptResponse<InventoryBatch>> {
  if (usePostgres) return await pgUpdateBatch(id, updates);
  return await callInventoryScript<InventoryBatch>("updateBatch", {
    id,
    ...updates,
  });
}

export async function deleteBatch(id: string): Promise<ScriptResponse<void>> {
  if (usePostgres) return await pgDeleteBatch(id);
  return await callInventoryScript<void>("deleteBatch", { id });
}

export async function deductBatchQuantity(
  batchId: string,
  quantity: number
): Promise<ScriptResponse<InventoryBatch>> {
  if (usePostgres) return await pgDeductBatchQuantity(batchId, quantity);
  return await callInventoryScript<InventoryBatch>("deductQuantity", {
    batchId,
    quantity,
  });
}

export async function getInventoryStats(): Promise<
  ScriptResponse<InventoryStats>
> {
  if (usePostgres) return await pgGetInventoryStats();
  return await callInventoryScript<InventoryStats>("getStats");
}

export async function getLowStockBatches(
  threshold?: number
): Promise<ScriptResponse<InventoryBatch[]>> {
  if (usePostgres) return await pgGetLowStockBatches(threshold);
  return await callInventoryScript<InventoryBatch[]>("getLowStock", {
    threshold,
  });
}

export async function getExpiringSoonBatches(
  days?: number
): Promise<ScriptResponse<InventoryBatch[]>> {
  if (usePostgres) return await pgGetExpiringSoonBatches(days);
  return await callInventoryScript<InventoryBatch[]>("getExpiringSoon", {
    days,
  });
}

export async function createMultipleBatches(
  batches: Partial<InventoryBatch>[]
): Promise<ScriptResponse<InventoryBatch[]>> {
  if (usePostgres) return await pgCreateMultipleBatches(batches);
  return await callInventoryScript<InventoryBatch[]>("createMultiple", {
    batches,
  });
}

export async function initInventorySheet(): Promise<ScriptResponse<void>> {
  if (usePostgres) return await pgInitInventorySheet();
  return await callInventoryScript<void>("init");
}

export interface UnitEconomicsData {
  id?: string;
  batchSizeKg: number;
  outputCandiesKg: number;
  outputPowderKg: number;
  awlaRateMin: number;
  awlaRateMax: number;
  sugarAndOther: number;
  packingLabelling: number;
  electricityGas: number;
  labour: number;
  transport: number;
  skus: any[];
  teamCommissions: { sales: number; manager: number };
  updatedAt?: string;
}

export async function getUnitEconomics(): Promise<UnitEconomicsData | null> {
  if (usePostgres) return await pgGetUnitEconomics();
  const result = await callInventoryScript<UnitEconomicsData>("getUnitEconomics");
  if (!result.success) return null;
  return result.data || null;
}

export async function updateUnitEconomics(
  data: Partial<UnitEconomicsData>
): Promise<boolean> {
  if (usePostgres) return await pgUpdateUnitEconomics(data);
  const result = await callInventoryScript("updateUnitEconomics", data);
  return result.success;
}

export interface Competitor {
  id: string;
  name: string;
  website: string;
  description: string;
  products: string;
  pricingLow: number;
  pricingHigh: number;
  strengths: string;
  weaknesses: string;
  marketShare: number;
  targetAudience: string;
  socialMedia: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getAllCompetitors(): Promise<Competitor[]> {
  if (usePostgres) return await pgGetAllCompetitors();
  const result = await callInventoryScript<Competitor[]>("getAllCompetitors");
  if (!result.success) return [];
  return result.data || [];
}

export async function createCompetitor(
  data: Partial<Competitor>
): Promise<Competitor | null> {
  if (usePostgres) return await pgCreateCompetitor(data);
  const result = await callInventoryScript<Competitor>("createCompetitor", data);
  if (!result.success) return null;
  return result.data || null;
}

export async function updateCompetitor(
  id: string,
  updates: Partial<Competitor>
): Promise<boolean> {
  if (usePostgres) return await pgUpdateCompetitor(id, updates);
  const result = await callInventoryScript("updateCompetitor", { id, updates });
  return result.success;
}

export async function deleteCompetitor(id: string): Promise<boolean> {
  if (usePostgres) return await pgDeleteCompetitor(id);
  const result = await callInventoryScript("deleteCompetitor", { id });
  return result.success;
}

export interface CompetitorHistoryEntry {
  historyId: string;
  competitorId: string;
  version: number;
  action: string;
  data: Competitor;
  changedBy: string;
  changedAt: string;
}

export async function getCompetitorHistory(
  competitorId: string
): Promise<CompetitorHistoryEntry[]> {
  if (usePostgres) return await pgGetCompetitorHistory(competitorId);
  const result = await callInventoryScript<CompetitorHistoryEntry[]>(
    "getCompetitorHistory",
    { competitorId }
  );
  if (!result.success) return [];
  return result.data || [];
}

export async function getCompetitorVersion(
  competitorId: string,
  version: number
): Promise<Competitor | null> {
  if (usePostgres) return await pgGetCompetitorVersion(competitorId, version);
  const result = await callInventoryScript<Competitor>("getCompetitorVersion", {
    competitorId,
    version,
  });
  if (!result.success) return null;
  return result.data || null;
}

export async function revertCompetitor(
  competitorId: string,
  version: number
): Promise<Competitor | null> {
  if (usePostgres) return await pgRevertCompetitor(competitorId, version);
  const result = await callInventoryScript<Competitor>("revertCompetitor", {
    competitorId,
    version,
  });
  if (!result.success) return null;
  return result.data || null;
}

export interface CommissionSettings {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  commissionPercent: number;
  managerId?: string;
  managerName?: string;
  managerDistributionPercent: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export async function getAllCommissionSettings(): Promise<CommissionSettings[]> {
  if (usePostgres) return await pgGetAllCommissionSettings();
  const result = await callInventoryScript<CommissionSettings[]>(
    "getAllCommissionSettings"
  );
  if (!result.success) return [];
  return result.data || [];
}

export async function getCommissionSettingsByUserId(
  userId: string
): Promise<CommissionSettings | null> {
  if (usePostgres) return await pgGetCommissionSettingsByUserId(userId);
  const result = await callInventoryScript<CommissionSettings>(
    "getCommissionSettingsByUserId",
    { userId }
  );
  if (!result.success) return null;
  return result.data || null;
}

export async function upsertCommissionSettings(
  settings: Partial<CommissionSettings>
): Promise<CommissionSettings | null> {
  if (usePostgres) return await pgUpsertCommissionSettings(settings);
  const result = await callInventoryScript<CommissionSettings>(
    "upsertCommissionSettings",
    settings
  );
  if (!result.success) return null;
  return result.data || null;
}

export async function bulkUpdateCommissionSettings(
  settings: Partial<CommissionSettings>[]
): Promise<boolean> {
  if (usePostgres) return await pgBulkUpdateCommissionSettings(settings);
  const result = await callInventoryScript("bulkUpdateCommissionSettings", {
    settings,
  });
  return result.success;
}

export async function deleteCommissionSettings(userId: string): Promise<boolean> {
  if (usePostgres) return await pgDeleteCommissionSettings(userId);
  const result = await callInventoryScript("deleteCommissionSettings", {
    userId,
  });
  return result.success;
}

export async function getManagerDistributions(): Promise<CommissionSettings[]> {
  if (usePostgres) return await pgGetManagerDistributions();
  const result = await callInventoryScript<CommissionSettings[]>(
    "getManagerDistributions"
  );
  if (!result.success) return [];
  return result.data || [];
}

export interface MonthlyTarget {
  id: string;
  month: string;
  managerId: string;
  managerName: string;
  teamTargetAmount: number;
  teamAchievedAmount: number;
  teamGrossProfit: number;
  isTeamTargetMet: boolean;
  teamDistributionPool: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function getAllMonthlyTargets(filters?: {
  month?: string;
  managerId?: string;
}): Promise<MonthlyTarget[]> {
  if (usePostgres) return await pgGetAllMonthlyTargets(filters || {});
  const result = await callInventoryScript<MonthlyTarget[]>(
    "getAllMonthlyTargets",
    filters || {}
  );
  if (!result.success) return [];
  return result.data || [];
}

export async function upsertMonthlyTarget(
  target: Partial<MonthlyTarget>
): Promise<MonthlyTarget | null> {
  if (usePostgres) return await pgUpsertMonthlyTarget(target);
  const result = await callInventoryScript<MonthlyTarget>(
    "upsertMonthlyTarget",
    target
  );
  if (!result.success) return null;
  return result.data || null;
}

export interface TeamEarning {
  id: string;
  month: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  managerId: string;
  managerName: string;
  targetAmount: number;
  achievedAmount: number;
  grossProfit: number;
  isTargetMet: boolean;
  commissionPercent: number;
  earnedCommission: number;
  isEarningsReleased: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ManagerTeamEarningsResponse {
  teamMembers: TeamEarning[];
  summary: {
    totalMembers: number;
    membersWithTargetMet: number;
    totalTarget: number;
    totalAchieved: number;
    achievementPercent: number;
    totalGrossProfit: number;
    totalEarnings: number;
  };
}

export async function getTeamEarnings(filters?: {
  month?: string;
  userId?: string;
  managerId?: string;
}): Promise<TeamEarning[]> {
  if (usePostgres) return await pgGetTeamEarnings(filters || {});
  const result = await callInventoryScript<TeamEarning[]>(
    "getTeamEarnings",
    filters || {}
  );
  if (!result.success) return [];
  return result.data || [];
}

export async function getUserEarnings(userId: string): Promise<TeamEarning[]> {
  if (usePostgres) return await pgGetUserEarnings(userId);
  const result = await callInventoryScript<TeamEarning[]>("getUserEarnings", {
    userId,
  });
  if (!result.success) return [];
  return result.data || [];
}

export async function getManagerTeamEarnings(
  managerId: string,
  month?: string
): Promise<ManagerTeamEarningsResponse | null> {
  if (usePostgres) return await pgGetManagerTeamEarnings(managerId, month);
  const result = await callInventoryScript<ManagerTeamEarningsResponse>(
    "getManagerTeamEarnings",
    { managerId, month }
  );
  if (!result.success) return null;
  return result.data || null;
}

export async function upsertTeamEarning(
  earning: Partial<TeamEarning>
): Promise<TeamEarning | null> {
  if (usePostgres) return await pgUpsertTeamEarning(earning);
  const result = await callInventoryScript<TeamEarning>("upsertTeamEarning", earning);
  if (!result.success) return null;
  return result.data || null;
}

export async function calculateAndReleaseEarnings(
  managerId: string,
  month: string
): Promise<{ releasedCount: number; totalReleased: number } | null> {
  if (usePostgres) return await pgCalculateAndReleaseEarnings(managerId, month);
  const result = await callInventoryScript<{
    releasedCount: number;
    totalReleased: number;
  }>("calculateAndReleaseEarnings", { managerId, month });
  if (!result.success) return null;
  return result.data || null;
}

export default usePostgres
  ? inventoryRepo
  : {
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
      getUnitEconomics,
      updateUnitEconomics,
      getAllCompetitors,
      createCompetitor,
      updateCompetitor,
      deleteCompetitor,
      getCompetitorHistory,
      getCompetitorVersion,
      revertCompetitor,
      getAllCommissionSettings,
      getCommissionSettingsByUserId,
      upsertCommissionSettings,
      bulkUpdateCommissionSettings,
      deleteCommissionSettings,
      getManagerDistributions,
      getAllMonthlyTargets,
      upsertMonthlyTarget,
      getTeamEarnings,
      getUserEarnings,
      getManagerTeamEarnings,
      upsertTeamEarning,
      calculateAndReleaseEarnings,
    };
