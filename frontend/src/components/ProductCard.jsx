import { Plus, Minus, Check, Heart } from "lucide-react";
import { useState, memo } from "react";
import { useStore } from "../store";
import { showToast } from "./Toast";
import ProductDetailModal from "./ProductDetailModal";

// Grundpreis berechnen (gesetzlich vorgeschrieben!)
const calcUnitPrice = (price, amount, type) => {
  if (!amount || !type || type === "stück") return null;
  // Umrechnen auf €/l oder €/kg
  const base = type === "ml" || type === "l" ? 1000 : 1000; // 1000ml = 1l, 1000g = 1kg
  const multiplier = type === "l" || type === "kg" ? 1 : base / amount;
  const unitPrice = price * multiplier;
  const unit = type === "ml" || type === "l" ? "1l" : type === "g" || type === "kg" ? "1kg" : type;
  return { price: unitPrice, unit };
};

const ProductCard = memo(function ProductCard({ product, compact = false }) {
  const cart = useStore(state => state.cart);
  const addToCart = useStore(state => state.addToCart);
  const removeFromCart = useStore(state => state.removeFromCart);
  const favorites = useStore(state => state.favorites);
  const toggleFavorite = useStore(state => state.toggleFavorite);
  const [imageError, setImageError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const inCart = cart.find(item => item.id === product.id);
  const quantity = inCart?.quantity || 0;
  const isFavorite = favorites.includes(product.id);

  const handleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
    showToast(isFavorite ? "Von Favoriten entfernt" : "Zu Favoriten hinzugefügt", "heart");
  };

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    if (quantity === 0) showToast("In den Warenkorb gelegt", "cart");
  };

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromCart(product.id);
  };

  const handleCardClick = () => setShowModal(true);

  const fallbackImage = `/placeholder-product.svg"P")}`;
  
  // Rabatt
  const hasDiscount = product.original_price && product.original_price > product.price;
  const discountPercent = hasDiscount ? Math.round((1 - product.price / product.original_price) * 100) : 0;
  
  // Grundpreis (€/l oder €/kg)
  const unitPrice = calcUnitPrice(product.price, product.unit_amount, product.unit_type);
  
  // Pfand
  const deposit = product.deposit || 0;

  // ========== COMPACT VERSION (Mobile) ==========
  if (compact) {
    return (
      <>
        <div 
          onClick={handleCardClick}
          className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow w-[140px] flex-shrink-0 border border-gray-100 cursor-pointer"
        >
          <div className="relative aspect-square bg-gray-50">
            <img
              src={imageError ? fallbackImage : (product.image || fallbackImage)}
              alt={product.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            
            {/* Discount Badge */}
            {hasDiscount && (
              <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                -{discountPercent}%
              </span>
            )}

            {/* Favorite */}
            <button
              onClick={handleFavorite}
              className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm"
            >
              <Heart size={14} className={isFavorite ? "fill-rose-500 text-rose-500" : "text-gray-400"} />
            </button>

            {/* Add Button */}
            <div className="absolute bottom-2 right-2">
              {quantity === 0 ? (
                <button onClick={handleAdd} className="w-9 h-9 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg">
                  <Plus size={20} strokeWidth={2.5} />
                </button>
              ) : (
                <div className="flex items-center gap-0.5 bg-rose-500 rounded-full p-0.5">
                  <button onClick={handleRemove} className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white">
                    <Minus size={12} strokeWidth={2.5} />
                  </button>
                  <span className="w-5 text-center text-xs font-bold text-white">{quantity}</span>
                  <button onClick={handleAdd} className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white">
                    <Plus size={12} strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Info - Flink Style */}
          <div className="p-2.5">
            {/* Preis - groß und fett */}
            <div className="flex items-baseline gap-1.5">
              <span className={`text-base font-bold ${hasDiscount ? "text-rose-600" : "text-gray-900"}`}>
                {product.price?.toFixed(2).replace(".", ",")} €
              </span>
              {hasDiscount && (
                <span className="text-xs text-gray-400 line-through">
                  {product.original_price?.toFixed(2).replace(".", ",")} €
                </span>
              )}
            </div>
            
            {/* Name */}
            <h3 className="text-xs text-gray-800 font-medium line-clamp-2 leading-tight mt-1 min-h-[2rem]">
              {product.name}
            </h3>
            
            {/* Grundpreis + Pfand - Flink Style */}
            <div className="mt-1 space-y-0.5">
              {unitPrice && (
                <p className="text-[10px] text-gray-500">
                  {unitPrice.price.toFixed(2).replace(".", ",")} € / {unitPrice.unit}
                </p>
              )}
              {deposit > 0 && (
                <p className="text-[10px] text-gray-500">
                  zzgl. Pfand {deposit.toFixed(2).replace(".", ",")} €
                </p>
              )}
              {!unitPrice && !deposit && (
                <p className="text-[10px] text-gray-400">{product.unit || "Stück"}</p>
              )}
            </div>
          </div>
        </div>
        
        <ProductDetailModal product={product} isOpen={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  // ========== FULL VERSION (Desktop) ==========
  return (
    <>
      <div 
        onClick={handleCardClick}
        className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-100 group cursor-pointer"
      >
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
            <span className="absolute top-3 left-3 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-md">
              -{discountPercent}%
            </span>
          )}

          {/* Favorite */}
          <button
            onClick={handleFavorite}
            className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform opacity-0 group-hover:opacity-100"
          >
            <Heart size={18} className={isFavorite ? "fill-rose-500 text-rose-500" : "text-gray-400"} />
          </button>

          {/* Hover Add */}
          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
            {quantity === 0 ? (
              <button onClick={handleAdd} className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg">
                <Plus size={18} /> Hinzufügen
              </button>
            ) : (
              <div className="flex items-center justify-center gap-3 bg-white rounded-xl p-2 shadow-lg">
                <button onClick={handleRemove} className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center">
                  <Minus size={18} />
                </button>
                <span className="w-6 text-center text-lg font-bold">{quantity}</span>
                <button onClick={handleAdd} className="w-9 h-9 bg-rose-500 hover:bg-rose-600 text-white rounded-lg flex items-center justify-center">
                  <Plus size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info - Flink Style */}
        <div className="p-4">
          {/* Preis - groß und fett */}
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-bold ${hasDiscount ? "text-rose-600" : "text-gray-900"}`}>
              {product.price?.toFixed(2).replace(".", ",")} €
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">
                {product.original_price?.toFixed(2).replace(".", ",")} €
              </span>
            )}
          </div>
          
          {/* Name */}
          <h3 className="font-semibold text-gray-900 line-clamp-2 leading-snug mt-1 min-h-[2.5rem] group-hover:text-rose-600 transition-colors">
            {product.name}
          </h3>
          
          {/* Grundpreis + Pfand */}
          <div className="mt-2 space-y-0.5">
            {unitPrice && (
              <p className="text-xs text-gray-500">
                {unitPrice.price.toFixed(2).replace(".", ",")} € / {unitPrice.unit}
              </p>
            )}
            {deposit > 0 && (
              <p className="text-xs text-gray-500">
                zzgl. Pfand {deposit.toFixed(2).replace(".", ",")} €
              </p>
            )}
            {!unitPrice && !deposit && (
              <p className="text-xs text-gray-400">{product.unit || "Stück"}</p>
            )}
          </div>

          {/* Mobile Add */}
          <div className="lg:hidden mt-3 flex items-center justify-between">
            {quantity === 0 ? (
              <button onClick={handleAdd} className="w-10 h-10 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md ml-auto">
                <Plus size={20} strokeWidth={2.5} />
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-rose-500 rounded-full p-1 ml-auto">
                <button onClick={handleRemove} className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-white">
                  <Minus size={14} />
                </button>
                <span className="w-5 text-center font-bold text-white text-sm">{quantity}</span>
                <button onClick={handleAdd} className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-white">
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Desktop Badge */}
          {quantity > 0 && (
            <div className="hidden lg:flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-1 rounded-full mt-3 w-fit">
              <Check size={14} strokeWidth={2.5} />
              <span className="text-xs font-bold">{quantity}× im Warenkorb</span>
            </div>
          )}
        </div>
      </div>
      
      <ProductDetailModal product={product} isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
});

export default ProductCard;
