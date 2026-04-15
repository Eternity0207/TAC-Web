const formatCurrency = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num <= 0) return '0';
  return Math.round(num).toString();
};

const getDiscountPercent = (mrp, price) => {
  const original = Number(mrp || 0);
  const discounted = Number(price || 0);
  if (!Number.isFinite(original) || !Number.isFinite(discounted) || original <= discounted || original <= 0) {
    return 0;
  }
  return Math.round(((original - discounted) / original) * 100);
};

export const getDiscountMeta = ({ mrp, price, variants }) => {
  const source = Array.isArray(variants) && variants.length
    ? variants
    : [{ mrp, price }];

  const discounts = source
    .map((variant) => getDiscountPercent(variant?.mrp, variant?.price))
    .filter((percent) => percent > 0);

  if (!discounts.length) {
    return {
      label: '',
      maxPercent: 0,
    };
  }

  const min = Math.min(...discounts);
  const max = Math.max(...discounts);
  const label = min === max ? `${max}% OFF` : `${min}-${max}% OFF`;

  return {
    label,
    maxPercent: max,
  };
};

const PriceDisplay = ({ price, mrp, variants, className = '' }) => {
  const original = Number(mrp || variants?.[0]?.mrp || 0);
  const discounted = Number(price || variants?.[0]?.price || 0);
  const showDiscount = original > discounted && discounted > 0;

  return (
    <div className={className}>
      {showDiscount ? (
        <div className="mb-1 text-sm text-gray-500">
          MRP <span className="line-through">Rs {formatCurrency(original)}</span>
        </div>
      ) : null}
      <div className="text-2xl font-extrabold text-primary">
        Rs {formatCurrency(discounted || original)}
      </div>
    </div>
  );
};

export default PriceDisplay;
