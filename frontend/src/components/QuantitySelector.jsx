import { motion } from 'framer-motion';

const QuantitySelector = ({ quantity, onChange, min = 1, max = 10, size = 'md' }) => {
  const sz = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';
  const numW = size === 'sm' ? 'w-7' : 'w-9';

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-white p-0.5">
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
        className={`${sz} flex items-center justify-center rounded-full font-bold text-gray-500 transition-colors hover:bg-primary hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500`}
        aria-label="Decrease quantity"
      >
        &minus;
      </motion.button>
      <span className={`${numW} select-none text-center font-semibold text-gray-900`}>{quantity}</span>
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        className={`${sz} flex items-center justify-center rounded-full font-bold text-gray-500 transition-colors hover:bg-primary hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500`}
        aria-label="Increase quantity"
      >
        +
      </motion.button>
    </div>
  );
};

export default QuantitySelector;
