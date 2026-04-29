import supabase from "./supabase";
import bulkPricingService from "./bulkPricingService";
import * as productsService from "./productsService";
import { BulkPricingConfig, PackagingOption } from "../types";

const DEFAULT_MARGIN_5KG = 10;
const DEFAULT_MARGIN_10KG = 15;

function toNumber(value: any, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeArrayConfig(raw: any): any[] {
  if (Array.isArray(raw)) return raw;

  if (!raw || typeof raw !== "object") return [];

  if (Array.isArray(raw.value)) {
    return raw.value;
  }

  const numericKeys = Object.keys(raw)
    .filter((key) => /^\d+$/.test(key))
    .sort((a, b) => Number(a) - Number(b));

  if (!numericKeys.length) return [];

  return numericKeys.map((key) => raw[key]).filter(Boolean);
}

function normalizeBulkPricingEntry(entry: any): BulkPricingConfig | null {
  if (!entry || typeof entry !== "object") return null;

  const skuId = String(entry.skuId || entry.id || entry.slug || "").trim();
  if (!skuId) return null;

  const skuName = String(entry.skuName || entry.name || skuId).trim();
  const mrp = roundTo2(Math.max(0, toNumber(entry.mrp, 0)));
  if (mrp <= 0) return null;

  const margin5kg = toNumber(entry.margin5kg, DEFAULT_MARGIN_5KG);
  const margin10kg = toNumber(entry.margin10kg, DEFAULT_MARGIN_10KG);

  const fallback5kg = bulkPricingService.calculateSellingPrice(mrp, margin5kg);
  const fallback10kg = bulkPricingService.calculateSellingPrice(mrp, margin10kg);

  const sellingPrice5kg = roundTo2(
    Math.max(0, toNumber(entry.sellingPrice5kg, fallback5kg)),
  );
  const sellingPrice10kg = roundTo2(
    Math.max(0, toNumber(entry.sellingPrice10kg, fallback10kg)),
  );

  return {
    skuId,
    skuName: skuName || skuId,
    mrp,
    margin5kg,
    margin10kg,
    sellingPrice5kg: sellingPrice5kg || fallback5kg,
    sellingPrice10kg: sellingPrice10kg || fallback10kg,
  };
}

function normalizeBulkPricingConfig(raw: any): BulkPricingConfig[] {
  return normalizeArrayConfig(raw)
    .map((entry) => normalizeBulkPricingEntry(entry))
    .filter(Boolean) as BulkPricingConfig[];
}

function getVariantMrpPerKg(variant: any): number {
  if (!variant || typeof variant !== "object") return 0;

  const packagePrice = toNumber(variant.mrp, toNumber(variant.price, 0));
  if (packagePrice <= 0) return 0;

  const size = String(variant.weight || variant.size || "").trim();
  const parsedWeight = bulkPricingService.getPackagingWeight(size);
  const weightInGrams = parsedWeight > 0 ? parsedWeight : 1000;

  return roundTo2((packagePrice * 1000) / weightInGrams);
}

function deriveBulkPricingConfigFromProducts(
  products: productsService.Product[],
): BulkPricingConfig[] {
  const rows: BulkPricingConfig[] = [];

  for (const product of products || []) {
    if (!product || product.isActive === false) continue;

    const skuId = String(product.slug || product.id || "").trim();
    if (!skuId) continue;

    const variantMrpValues = (Array.isArray(product.variants)
      ? product.variants
      : []
    )
      .map((variant) => getVariantMrpPerKg(variant))
      .filter((value) => value > 0);

    const productLevelMrp = toNumber((product as any).mrp, 0);
    const mrp =
      variantMrpValues.length > 0
        ? variantMrpValues[0]
        : productLevelMrp > 0
          ? productLevelMrp
          : 0;

    if (mrp <= 0) continue;

    rows.push({
      skuId,
      skuName: String(product.name || skuId),
      mrp: roundTo2(mrp),
      margin5kg: DEFAULT_MARGIN_5KG,
      margin10kg: DEFAULT_MARGIN_10KG,
      sellingPrice5kg: bulkPricingService.calculateSellingPrice(
        mrp,
        DEFAULT_MARGIN_5KG,
      ),
      sellingPrice10kg: bulkPricingService.calculateSellingPrice(
        mrp,
        DEFAULT_MARGIN_10KG,
      ),
    });
  }

  return rows;
}

function mergeBulkPricingConfig(
  stored: BulkPricingConfig[],
  derived: BulkPricingConfig[],
): BulkPricingConfig[] {
  if (!derived.length) return stored;

  const storedBySku = new Map(stored.map((row) => [row.skuId, row]));
  const resolved: BulkPricingConfig[] = [];

  for (const derivedRow of derived) {
    const existing = storedBySku.get(derivedRow.skuId);
    const mrp = existing?.mrp && existing.mrp > 0 ? existing.mrp : derivedRow.mrp;
    const margin5kg =
      existing?.margin5kg ?? derivedRow.margin5kg ?? DEFAULT_MARGIN_5KG;
    const margin10kg =
      existing?.margin10kg ?? derivedRow.margin10kg ?? DEFAULT_MARGIN_10KG;
    const sellingPrice5kg =
      existing?.sellingPrice5kg &&
      Number.isFinite(existing.sellingPrice5kg) &&
      existing.sellingPrice5kg > 0
        ? existing.sellingPrice5kg
        : bulkPricingService.calculateSellingPrice(mrp, margin5kg);
    const sellingPrice10kg =
      existing?.sellingPrice10kg &&
      Number.isFinite(existing.sellingPrice10kg) &&
      existing.sellingPrice10kg > 0
        ? existing.sellingPrice10kg
        : bulkPricingService.calculateSellingPrice(mrp, margin10kg);

    resolved.push({
      skuId: derivedRow.skuId,
      skuName: existing?.skuName || derivedRow.skuName,
      mrp: roundTo2(mrp),
      margin5kg,
      margin10kg,
      sellingPrice5kg: roundTo2(sellingPrice5kg),
      sellingPrice10kg: roundTo2(sellingPrice10kg),
    });
  }

  for (const storedRow of stored) {
    if (!resolved.some((row) => row.skuId === storedRow.skuId)) {
      resolved.push(storedRow);
    }
  }

  return resolved;
}

function normalizePackagingOption(entry: any): PackagingOption | null {
  if (!entry || typeof entry !== "object") return null;

  const size = String(entry.size || "").trim();
  const id = String(entry.id || size || "").trim();
  if (!id || !size) return null;

  const parsedWeight = toNumber(entry.weightInGrams, 0);
  const fallbackWeight = bulkPricingService.getPackagingWeight(size);
  const weightInGrams = parsedWeight > 0 ? parsedWeight : fallbackWeight;
  if (!weightInGrams || weightInGrams <= 0) return null;

  const isActive =
    typeof entry.isActive === "boolean"
      ? entry.isActive
      : String(entry.isActive || "").toLowerCase() !== "false";

  return {
    id,
    size,
    weightInGrams,
    isActive,
  };
}

function normalizePackagingConfig(raw: any): PackagingOption[] {
  return normalizeArrayConfig(raw)
    .map((entry) => normalizePackagingOption(entry))
    .filter(Boolean) as PackagingOption[];
}

export async function getResolvedBulkPricingConfig(): Promise<
  BulkPricingConfig[]
> {
  const rawConfig = await supabase.getConfig("bulk_pricing");
  const storedConfig = normalizeBulkPricingConfig(rawConfig);

  try {
    const products = await productsService.getAllProducts();
    const derivedConfig = deriveBulkPricingConfigFromProducts(products);
    return mergeBulkPricingConfig(storedConfig, derivedConfig);
  } catch (error) {
    console.warn("Falling back to stored bulk pricing config:", error);
    return storedConfig;
  }
}

export async function getResolvedPackagingOptions(): Promise<PackagingOption[]> {
  const rawConfig = await supabase.getConfig("packaging");
  const storedOptions = normalizePackagingConfig(rawConfig);

  if (storedOptions.length > 0) {
    return storedOptions;
  }

  return bulkPricingService.getPackagingOptions();
}
