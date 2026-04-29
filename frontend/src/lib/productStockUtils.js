const normalizeStatus = (value) => String(value || '').trim().toUpperCase();

const parseQuantity = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.floor(numeric));
};

export const getProductStockInfo = (product, variant = null) => {
  const status = normalizeStatus(variant?.stockStatus || product?.stockStatus);
  const quantityLeft = parseQuantity(
    variant?.stockQuantity ??
      variant?.inventoryQuantity ??
      variant?.remainingQuantity ??
      product?.stockQuantity ??
      product?.inventoryQuantity ??
      product?.remainingQuantity
  );

  const isOutOfStock =
    status === 'OUT_OF_STOCK' ||
    status === 'DEPLETED' ||
    (quantityLeft !== null && quantityLeft <= 0);

  const hasLimitedStock = !isOutOfStock && quantityLeft !== null;
  const shouldShow = isOutOfStock || hasLimitedStock;

  return {
    status,
    quantityLeft,
    isOutOfStock,
    hasLimitedStock,
    shouldShow,
    label: isOutOfStock
      ? 'Out of stock'
      : hasLimitedStock
        ? `Only ${quantityLeft} left`
        : '',
  };
};
