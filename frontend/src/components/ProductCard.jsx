import { Plus, Minus, Check, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useStore } from '../store';

export default function ProductCard({ product, compact = false }) {
  const { cart, addToCart, removeFromCart } = useStore();
  const [isLiked, setIsLiked] = useState(false);
  const [imageError, setImageError] = useState(false);
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

  // Fallback image
  const fallbackImage = `https://via.placeholder.com/400x400/f3f4f6/9ca3af?text=${encodeURIComponent(product.name?.charAt(0) || 'P')}`;

  // Compact version for mobile horizontal scroll
  if (compact) {
    return (
      <motion.div
        whileTap={{ scale: 0.97 }}
        className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 w-[140px] flex-shrink-0 border border-gray-100"
      >
        {/* Image */}
        <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
          <img
            src={imageError ? fallbackImage : (product.image || fallbackImage)}
            alt={product.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          
          {/* Badge */}
          {product.featured && (
            <div className="absolute top-2 left-2">
              <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                Beliebt
              </span>
            </div>
          )}

          {/* Discount Badge */}
          {product.original_price && product.original_price > product.price && (
            <div className="absolute top-2 right-2">
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                -{Math.round((1 - product.price / product.original_price) * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <p className="text-[11px] text-gray-400 mb-0.5">{product.unit || 'Stück'}</p>
          <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight min-h-[2.5rem] mb-2">
            {product.name}
          </h3>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-base font-bold text-gray-900">
                {product.price?.toFixed(2).replace('.', ',')} €
              </p>
              {product.original_price && product.original_price > product.price && (
                <p className="text-xs text-gray-400 line-through">
                  {product.original_price?.toFixed(2).replace('.', ',')} €
                </p>
              )}
            </div>

            <AnimatePresence mode="wait">
              {quantity === 0 ? (
                <motion.button
                  key="add"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  onClick={handleAdd}
                  className="w-9 h-9 bg-[#00C853] hover:bg-[#00B84D] text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 transition-colors"
                >
                  <Plus size={20} strokeWidth={2.5} />
                </motion.button>
              ) : (
                <motion.div
                  key="counter"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1 bg-[#00C853] rounded-full px-1 py-1"
                >
                  <button
                    onClick={handleRemove}
                    className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                  >
                    <Minus size={14} strokeWidth={2.5} />
                  </button>
                  <span className="w-5 text-center text-sm font-bold text-white">{quantity}</span>
                  <button
                    onClick={handleAdd}
                    className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    );
  }

  // Full card for desktop grids
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group"
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        <img
          src={imageError ? fallbackImage : (product.image || fallbackImage)}
          alt={product.name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          <div className="flex flex-col gap-1.5">
            {product.featured && (
              <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                🔥 Beliebt
              </span>
            )}
            {product.original_price && product.original_price > product.price && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                -{Math.round((1 - product.price / product.original_price) * 100)}%
              </span>
            )}
          </div>
          
          {/* Like Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md ${
              isLiked ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-400 hover:text-red-500'
            }`}
          >
            <Heart size={18} className={isLiked ? 'fill-current' : ''} />
          </button>
        </div>

        {/* Quick Add Overlay - Desktop */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              className="w-full py-3 bg-[#00C853] hover:bg-[#00B84D] text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-xl transition-colors"
            >
              <Plus size={20} strokeWidth={2.5} />
              Hinzufügen
            </button>
          ) : (
            <div className="flex items-center justify-center gap-3 bg-white rounded-xl p-2 shadow-xl">
              <button
                onClick={handleRemove}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
              >
                <Minus size={20} />
              </button>
              <span className="w-8 text-center text-xl font-bold text-gray-900">{quantity}</span>
              <button
                onClick={handleAdd}
                className="w-10 h-10 bg-[#00C853] hover:bg-[#00B84D] text-white rounded-xl flex items-center justify-center transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">{product.unit || 'Stück'}</p>
        <h3 className="font-semibold text-gray-900 line-clamp-2 leading-snug min-h-[2.75rem] group-hover:text-[#00C853] transition-colors">
          {product.name}
        </h3>

        <div className="flex items-end justify-between mt-3">
          <div>
            <p className="text-xl font-bold text-gray-900">
              {product.price?.toFixed(2).replace('.', ',')} €
            </p>
            {product.original_price && product.original_price > product.price && (
              <p className="text-sm text-gray-400 line-through">
                {product.original_price?.toFixed(2).replace('.', ',')} €
              </p>
            )}
          </div>

          {/* Mobile add button */}
          <div className="lg:hidden">
            <AnimatePresence mode="wait">
              {quantity === 0 ? (
                <motion.button
                  key="add"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.8 }}
                  onClick={handleAdd}
                  className="w-11 h-11 bg-[#00C853] hover:bg-[#00B84D] text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/30"
                >
                  <Plus size={22} strokeWidth={2.5} />
                </motion.button>
              ) : (
                <motion.div
                  key="counter"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.8 }}
                  className="flex items-center gap-2 bg-[#00C853] rounded-full px-1.5 py-1.5"
                >
                  <button
                    onClick={handleRemove}
                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
                  >
                    <Minus size={16} strokeWidth={2.5} />
                  </button>
                  <span className="w-6 text-center font-bold text-white">{quantity}</span>
                  <button
                    onClick={handleAdd}
                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop badge */}
          {quantity > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 bg-[#00C853]/10 text-[#00C853] px-3 py-1.5 rounded-full">
              <Check size={16} strokeWidth={2.5} />
              <span className="font-bold">{quantity}×</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
