import { Plus, Minus, Check } from 'lucide-react';
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

  const fallbackImage = `https://via.placeholder.com/400x400/FDF2F8/EC4899?text=${encodeURIComponent(product.name?.charAt(0) || 'P')}`;
  
  // Rabatt berechnen
  const hasDiscount = product.original_price && product.original_price > product.price;
  const discountPercent = hasDiscount ? Math.round((1 - product.price / product.original_price) * 100) : 0;

  // Compact version für Mobile
  if (compact) {
    return (
      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow w-[130px] flex-shrink-0 border border-gray-100">
        <div className="relative aspect-square bg-gray-50">
          <img
            src={imageError ? fallbackImage : (product.image || fallbackImage)}
            alt={product.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          
          {/* Discount Badge - Flink Style */}
          {hasDiscount && (
            <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              -{discountPercent}%
            </span>
          )}

          {/* Add Button */}
          <div className="absolute bottom-2 right-2">
            {quantity === 0 ? (
              <button
                onClick={handleAdd}
                className="w-8 h-8 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            ) : (
              <div className="flex items-center gap-0.5 bg-rose-500 rounded-full p-0.5">
                <button
                  onClick={handleRemove}
                  className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white"
                >
                  <Minus size={12} strokeWidth={2.5} />
                </button>
                <span className="w-4 text-center text-xs font-bold text-white">{quantity}</span>
                <button
                  onClick={handleAdd}
                  className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white"
                >
                  <Plus size={12} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-2">
          {/* Preis */}
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-sm font-bold text-gray-900">
              {product.price?.toFixed(2).replace('.', ',')} €
            </span>
            {hasDiscount && (
              <span className="text-xs text-gray-400 line-through">
                {product.original_price?.toFixed(2).replace('.', ',')} €
              </span>
            )}
          </div>
          
          {/* Name */}
          <h3 className="text-xs text-gray-700 line-clamp-2 leading-tight min-h-[2rem]">
            {product.name}
          </h3>
          
          {/* Unit */}
          <p className="text-[10px] text-gray-400 mt-0.5">{product.unit || 'Stück'}</p>
        </div>
      </div>
    );
  }

  // Full Card für Desktop
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-100 group">
      <div className="relative aspect-square bg-gray-50">
        <img
          src={imageError ? fallbackImage : (product.image || fallbackImage)}
          alt={product.name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        
        {/* Discount Badge */}
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded shadow-md">
            -{discountPercent}%
          </span>
        )}

        {/* Hover Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg transition-colors"
            >
              <Plus size={18} /> Hinzufügen
            </button>
          ) : (
            <div className="flex items-center justify-center gap-3 bg-white rounded-lg p-2 shadow-lg">
              <button
                onClick={handleRemove}
                className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center"
              >
                <Minus size={18} />
              </button>
              <span className="w-6 text-center text-lg font-bold">{quantity}</span>
              <button
                onClick={handleAdd}
                className="w-9 h-9 bg-rose-500 hover:bg-rose-600 text-white rounded-lg flex items-center justify-center"
              >
                <Plus size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-3">
        {/* Preis */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-lg font-bold text-gray-900">
            {product.price?.toFixed(2).replace('.', ',')} €
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              {product.original_price?.toFixed(2).replace('.', ',')} €
            </span>
          )}
        </div>
        
        {/* Name */}
        <h3 className="font-medium text-gray-900 line-clamp-2 leading-snug min-h-[2.5rem] text-sm group-hover:text-rose-600 transition-colors">
          {product.name}
        </h3>
        
        {/* Unit */}
        <p className="text-xs text-gray-400 mt-1">{product.unit || 'Stück'}</p>

        {/* Mobile Add Button */}
        <div className="lg:hidden mt-2 flex items-center justify-between">
          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              className="w-10 h-10 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md ml-auto"
            >
              <Plus size={20} strokeWidth={2.5} />
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-rose-500 rounded-full p-1 ml-auto">
              <button
                onClick={handleRemove}
                className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-white"
              >
                <Minus size={14} />
              </button>
              <span className="w-5 text-center font-bold text-white text-sm">{quantity}</span>
              <button
                onClick={handleAdd}
                className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-white"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Desktop Badge */}
        {quantity > 0 && (
          <div className="hidden lg:flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-1 rounded-full mt-2 w-fit">
            <Check size={14} strokeWidth={2.5} />
            <span className="text-xs font-bold">{quantity}× im Warenkorb</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default ProductCard;
