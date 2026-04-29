import googleSheets from "./googleSheets";
import * as productsService from "./productsService";
import { CartItem, CartItemInput, OrderProduct } from "../types";

export const SHIPPING_FREE_THRESHOLD = 299;
export const SHIPPING_FLAT_AMOUNT = 40;
const MAX_QTY_PER_LINE = 100;

export class CartValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "CartValidationError";
    this.statusCode = statusCode;
  }
}

export interface PricedCartBreakdown {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  shippingAmount: number;
  discountAmount: number;
  discountType: "PERCENTAGE" | "FIXED" | null;
  couponCode: string;
  totalAmount: number;
}

function toTwoDecimals(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeLower(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function normalizeDisplay(value: unknown): string {
  return String(value || "").trim();
}

function parseQuantity(raw: unknown): number {
  const parsed = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new CartValidationError("Quantity must be a positive integer");
  }
  if (parsed > MAX_QTY_PER_LINE) {
    throw new CartValidationError(
      `Quantity cannot exceed ${MAX_QTY_PER_LINE} per line item`,
    );
  }
  return parsed;
}

function parsePrice(raw: unknown): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return toTwoDecimals(parsed);
}

function parseStockQuantity(raw: unknown): number | null {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
}

function normalizeStockStatus(raw: unknown): string {
  return String(raw || "").trim().toUpperCase();
}

function parseItemsInput(rawItems: unknown): CartItemInput[] {
  if (!Array.isArray(rawItems)) {
    throw new CartValidationError("Cart items must be an array");
  }

  const out: CartItemInput[] = rawItems.map((raw, idx) => {
    const obj = raw && typeof raw === "object" ? (raw as Record<string, any>) : {};
    const productId = normalizeDisplay(obj.productId || obj.id);
    const slug = normalizeDisplay(obj.slug);
    const weight = normalizeDisplay(obj.weight || obj.variantWeight || obj.variant);
    const quantity = parseQuantity(obj.quantity);

    if (!productId && !slug) {
      throw new CartValidationError(`Line ${idx + 1}: productId or slug is required`);
    }

    return {
      productId: productId || undefined,
      slug: slug || undefined,
      weight: weight || undefined,
      variant: weight || undefined,
      quantity,
    };
  });

  if (out.length === 0) {
    throw new CartValidationError("Cart is empty");
  }

  return out;
}

function getShippingAmount(subtotal: number, itemCount: number): number {
  if (itemCount <= 0) return 0;
  return subtotal >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_FLAT_AMOUNT;
}

function findVariant(
  product: Record<string, any>,
  requestedWeight: string,
): Record<string, any> | null {
  const variants = Array.isArray(product.variants) ? product.variants : [];

  if (variants.length === 0) {
    return {
      weight: requestedWeight || "",
      price: parsePrice(product.price),
      mrp: parsePrice(product.mrp || product.price),
    };
  }

  if (!requestedWeight) {
    return variants[0] || null;
  }

  const requestedNorm = normalizeLower(requestedWeight);
  const matched = variants.find((v) => normalizeLower(v?.weight) === requestedNorm);
  return matched || null;
}

function resolveStockState(
  product: Record<string, any>,
  variant: Record<string, any> | null,
): {
  isOutOfStock: boolean;
  quantityLeft: number | null;
} {
  const status = normalizeStockStatus(variant?.stockStatus || product?.stockStatus);
  const quantityLeft = parseStockQuantity(
    variant?.stockQuantity ??
      variant?.inventoryQuantity ??
      variant?.remainingQuantity ??
      product?.stockQuantity ??
      product?.inventoryQuantity ??
      product?.remainingQuantity,
  );

  const isOutOfStock =
    status === "OUT_OF_STOCK" ||
    status === "DEPLETED" ||
    (quantityLeft !== null && quantityLeft <= 0);

  return { isOutOfStock, quantityLeft };
}

function lineKey(productId: string, weight: string): string {
  const suffix = weight ? normalizeLower(weight) : "default";
  return `${productId}-${suffix}`;
}

function toOrderProducts(items: CartItem[]): OrderProduct[] {
  return items.map((item) => ({
    name: item.name,
    variant: item.variant || item.weight || "",
    quantity: item.quantity,
    unitPrice: toTwoDecimals(item.unitPrice),
    totalPrice: toTwoDecimals(item.totalPrice),
  }));
}

export async function buildPricedCart(
  rawItems: unknown,
  rawCouponCode?: unknown,
): Promise<PricedCartBreakdown> {
  const parsedItems = parseItemsInput(rawItems);

  const products = await productsService.getAllProducts();
  const byId = new Map<string, Record<string, any>>();
  const bySlug = new Map<string, Record<string, any>>();

  for (const product of products) {
    const id = normalizeDisplay(product?.id);
    const slug = normalizeLower(product?.slug);
    if (id) byId.set(id, product as unknown as Record<string, any>);
    if (slug) bySlug.set(slug, product as unknown as Record<string, any>);
  }

  const deduped = new Map<string, CartItem>();

  for (let i = 0; i < parsedItems.length; i += 1) {
    const item = parsedItems[i];
    const refId = normalizeDisplay(item.productId);
    const refSlug = normalizeLower(item.slug);

    const product = (refId && byId.get(refId)) || (refSlug && bySlug.get(refSlug));
    if (!product) {
      throw new CartValidationError(`Line ${i + 1}: product not found`);
    }
    if (product.isActive === false) {
      throw new CartValidationError(`Line ${i + 1}: ${product.name} is not available`);
    }

    const requestedWeight = normalizeDisplay(item.weight || item.variant);
    const variant = findVariant(product, requestedWeight);
    if (!variant) {
      throw new CartValidationError(
        `Line ${i + 1}: requested variant is not available for ${product.name}`,
      );
    }

    const stockState = resolveStockState(product, variant);
    if (stockState.isOutOfStock) {
      throw new CartValidationError(`Line ${i + 1}: ${product.name} is out of stock`);
    }
    if (stockState.quantityLeft !== null && item.quantity > stockState.quantityLeft) {
      throw new CartValidationError(
        `Line ${i + 1}: only ${stockState.quantityLeft} left for ${product.name}`,
      );
    }

    const unitPrice = parsePrice(variant.price);
    if (unitPrice <= 0) {
      throw new CartValidationError(`Line ${i + 1}: invalid price for ${product.name}`);
    }

    const variantWeight = normalizeDisplay(variant.weight || requestedWeight);
    const productId = normalizeDisplay(product.id || product.slug);
    const key = lineKey(productId, variantWeight);
    const existing = deduped.get(key);

    if (existing) {
      const nextQty = existing.quantity + item.quantity;
      if (nextQty > MAX_QTY_PER_LINE) {
        throw new CartValidationError(
          `Line ${i + 1}: combined quantity exceeds ${MAX_QTY_PER_LINE}`,
        );
      }
      if (stockState.quantityLeft !== null && nextQty > stockState.quantityLeft) {
        throw new CartValidationError(
          `Line ${i + 1}: only ${stockState.quantityLeft} left for ${product.name}`,
        );
      }
      existing.quantity = nextQty;
      existing.totalPrice = toTwoDecimals(existing.unitPrice * existing.quantity);
      deduped.set(key, existing);
      continue;
    }

    const normalized: CartItem = {
      key,
      productId,
      slug: normalizeDisplay(product.slug) || undefined,
      name: normalizeDisplay(product.name),
      imageUrl: normalizeDisplay(product.imageUrl) || undefined,
      weight: variantWeight || undefined,
      variant: variantWeight || undefined,
      quantity: item.quantity,
      unitPrice,
      mrp: parsePrice(variant.mrp || unitPrice),
      totalPrice: toTwoDecimals(unitPrice * item.quantity),
    };

    deduped.set(key, normalized);
  }

  const items = Array.from(deduped.values());
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = toTwoDecimals(items.reduce((sum, item) => sum + item.totalPrice, 0));
  const shippingAmount = toTwoDecimals(getShippingAmount(subtotal, itemCount));

  const couponCode = normalizeDisplay(rawCouponCode).toUpperCase();
  let discountAmount = 0;
  let discountType: "PERCENTAGE" | "FIXED" | null = null;

  if (couponCode) {
    const validation = await googleSheets.validateCoupon(couponCode, subtotal);
    if (!validation?.valid) {
      throw new CartValidationError(validation?.message || "Invalid coupon code");
    }

    discountAmount = toTwoDecimals(Number(validation.discountAmount || 0));
    discountType = (validation.coupon?.discountType as "PERCENTAGE" | "FIXED") || null;
  }

  const grossTotal = subtotal + shippingAmount;
  if (discountAmount > grossTotal) {
    discountAmount = grossTotal;
  }

  const totalAmount = toTwoDecimals(Math.max(0, grossTotal - discountAmount));

  return {
    items,
    itemCount,
    subtotal,
    shippingAmount,
    discountAmount,
    discountType,
    couponCode,
    totalAmount,
  };
}

export function cartItemsToOrderProducts(items: CartItem[]): OrderProduct[] {
  return toOrderProducts(items);
}
