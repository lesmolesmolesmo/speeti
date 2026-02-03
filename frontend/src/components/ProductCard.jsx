import { Plus, Minus, Check, ShoppingCart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';

export default function ProductCard({ product, compact = false }) {
  const { cart, addToCart, removeFromCart } = useStore();
  const inCart = cart.find(item => item.id === product.id);
  const quantity = inCart?.quantity || 0;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
  };

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromCart(product.id);
  };

  // Compact version for mobile horizontal scroll
  if (compact) {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 w-36 flex-shrink-0 group hover:shadow-md transition-all"
      >
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <img
            src={product.image || 'https://via.placeholder.com/200?text=Produkt'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {product.featured && (
            <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              🔥 Beliebt
            </span>
          )}
        </div>

        <div className="p-3">
          <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight mb-1 min-h-[2.5rem]">
            {product.name}
          </h3>
          {product.unit && (
            <p className="text-xs text-gray-400 mb-2">{product.unit}</p>
          )}

          <div className="flex items-end justify-between">
            <p className="text-lg font-bold text-primary-600">
              {product.price?.toFixed(2)}€
            </p>

            <AnimatePresence mode="wait">
              {quantity === 0 ? (
                <motion.button
                  key="add"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  onClick={handleAdd}
                  className="w-8 h-8 bg-primary-500 hover:bg-primary-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-md shadow-primary-500/30"
                >
                  <Plus size={18} />
                </motion.button>
              ) : (
                <motion.div
                  key="counter"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-1 bg-primary-500 rounded-xl p-0.5"
                >
                  <button
                    onClick={handleRemove}
                    className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-5 text-center text-sm font-bold text-white">{quantity}</span>
                  <button
                    onClick={handleAdd}
                    className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white"
                  >
                    <Plus size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    );
  }

  // Full version for desktop grids
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl hover:border-primary-200 transition-all duration-300"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={product.image || 'https://via.placeholder.com/300?text=Produkt'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.featured && (
            <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              🔥 Beliebt
            </span>
          )}
          {product.discount > 0 && (
            <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              -{product.discount}%
            </span>
          )}
        </div>

        {/* Quick Add Overlay (Desktop) */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-xl shadow-primary-500/30 transition-all"
            >
              <ShoppingCart size={18} />
              In den Warenkorb
            </button>
          ) : (
            <div className="flex items-center justify-center gap-3 bg-white rounded-xl p-2 shadow-xl">
              <button
                onClick={handleRemove}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
              >
                <Minus size={18} />
              </button>
              <span className="w-8 text-center text-xl font-bold text-gray-900">{quantity}</span>
              <button
                onClick={handleAdd}
                className="w-10 h-10 bg-primary-500 hover:bg-primary-600 text-white rounded-xl flex items-center justify-center transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-2 leading-snug mb-1 min-h-[2.75rem] group-hover:text-primary-600 transition-colors">
          {product.name}
        </h3>
        
        {product.unit && (
          <p className="text-sm text-gray-400 mb-3">{product.unit}</p>
        )}

        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-primary-600">
              {product.price?.toFixed(2)}€
            </p>
            {product.originalPrice && product.originalPrice > product.price && (
              <p className="text-sm text-gray-400 line-through">
                {product.originalPrice?.toFixed(2)}€
              </p>
            )}
          </div>

          {/* Mobile add button (when not hovering) */}
          <div className="lg:hidden">
            <AnimatePresence mode="wait">
              {quantity === 0 ? (
                <motion.button
                  key="add"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  onClick={handleAdd}
                  className="w-10 h-10 bg-primary-500 hover:bg-primary-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-primary-500/30"
                >
                  <Plus size={20} />
                </motion.button>
              ) : (
                <motion.div
                  key="counter"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-2 bg-primary-500 rounded-xl p-1"
                >
                  <button
                    onClick={handleRemove}
                    className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-6 text-center font-bold text-white">{quantity}</span>
                  <button
                    onClick={handleAdd}
                    className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white"
                  >
                    <Plus size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop: Badge showing quantity if in cart */}
          {quantity > 0 && (
            <div className="hidden lg:flex items-center gap-1 bg-primary-100 text-primary-600 px-3 py-1.5 rounded-full">
              <Check size={16} />
              <span className="font-semibold">{quantity}x</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
