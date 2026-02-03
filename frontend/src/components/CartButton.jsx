import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';

export default function CartButton() {
  const location = useLocation();
  const { cart, getCartTotal, getCartCount } = useStore();
  
  const count = getCartCount();
  const total = getCartTotal();
  
  // Don't show on cart/checkout pages
  if (['/cart', '/checkout'].includes(location.pathname) || count === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto"
      >
        <Link
          to="/cart"
          className="flex items-center justify-between bg-primary-600 text-white rounded-2xl p-4 shadow-lg shadow-primary-600/30 hover:bg-primary-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingBag size={24} />
              <span className="absolute -top-2 -right-2 bg-accent-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {count}
              </span>
            </div>
            <span className="font-semibold">Warenkorb ansehen</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-bold">{total.toFixed(2)} €</span>
            <ChevronRight size={20} />
          </div>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
