import { Plus, Minus, Check, Heart } from 'lucide-react';
import { useState, memo } from 'react';
import { useStore } from '../store';

const ProductCard = memo(function ProductCard({ product, compact = false }) {
  const { cart, addToCart, removeFromCart } = useStore();
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

  const fallbackImage = `https://via.placeholder.com/400x400/f3f4f6/9ca3af?text=${encodeURIComponent(product.name?.charAt(0) || 'P')}`;

  // Compact version for mobile
  if (compact) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow w-[140px] flex-shrink-0 border border-gray-100">
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          <img
            src={imageError ? fallbackImage : (product.image || fallbackImage)}
            alt={product.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          
          {product.featured && (
            <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Beliebt
            </span>
          )}
        </div>

        <div className="p-3">
          <p className="text-[11px] text-gray-400 mb-0.5">{product.unit || 'Stück'}</p>
          <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight min-h-[2.5rem] mb-2">
            {product.name}
          </h3>

          <div className="flex items-end justify-between">
            <p className="text-base font-bold text-gray-900">
              {product.price?.toFixed(2).replace('.', ',')} €
            </p>

            {quantity === 0 ? (
              <button
                onClick={handleAdd}
                className="w-9 h-9 bg-[#00C853] hover:bg-[#00B84D] text-white rounded-full flex items-center justify-center shadow-md transition-colors"
              >
                <Plus size={20} strokeWidth={2.5} />
              </button>
            ) : (
              <div className="flex items-center gap-0.5 bg-[#00C853] rounded-full p-0.5">
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
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full card for desktop
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-100 group">
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <img
          src={imageError ? fallbackImage : (product.image || fallbackImage)}
          alt={product.name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        
        {product.featured && (
          <span className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
            🔥 Beliebt
          </span>
        )}

        {/* Desktop hover overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              className="w-full py-3 bg-[#00C853] hover:bg-[#00B84D] text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg transition-colors"
            >
              <Plus size={20} /> Hinzufügen
            </button>
          ) : (
            <div className="flex items-center justify-center gap-3 bg-white rounded-xl p-2 shadow-lg">
              <button
                onClick={handleRemove}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
              >
                <Minus size={20} />
              </button>
              <span className="w-8 text-center text-xl font-bold">{quantity}</span>
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

      <div className="p-4">
        <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">{product.unit || 'Stück'}</p>
        <h3 className="font-semibold text-gray-900 line-clamp-2 leading-snug min-h-[2.75rem] group-hover:text-[#00C853] transition-colors">
          {product.name}
        </h3>

        <div className="flex items-end justify-between mt-3">
          <p className="text-xl font-bold text-gray-900">
            {product.price?.toFixed(2).replace('.', ',')} €
          </p>

          {/* Mobile button */}
          <div className="lg:hidden">
            {quantity === 0 ? (
              <button
                onClick={handleAdd}
                className="w-11 h-11 bg-[#00C853] hover:bg-[#00B84D] text-white rounded-full flex items-center justify-center shadow-md"
              >
                <Plus size={22} strokeWidth={2.5} />
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-[#00C853] rounded-full p-1">
                <button
                  onClick={handleRemove}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white"
                >
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center font-bold text-white">{quantity}</span>
                <button
                  onClick={handleAdd}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
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
    </div>
  );
});

export default ProductCard;
