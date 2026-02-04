import { useState, useEffect } from 'react';
import { X, Plus, Minus, Heart, Leaf, AlertTriangle, Package, Scale } from 'lucide-react';
import { useStore } from '../store';
import { showToast } from './Toast';

export default function ProductDetailModal({ product, isOpen, onClose }) {
  const cart = useStore(state => state.cart);
  const addToCart = useStore(state => state.addToCart);
  const removeFromCart = useStore(state => state.removeFromCart);
  const favorites = useStore(state => state.favorites);
  const toggleFavorite = useStore(state => state.toggleFavorite);
  const [imageError, setImageError] = useState(false);
  
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  if (!isOpen || !product) return null;
  
  const inCart = cart.find(item => item.id === product.id);
  const quantity = inCart?.quantity || 0;
  const isFavorite = favorites.includes(product.id);
  
  const fallbackImage = `/placeholder-product.svg'P')}`;
  
  const hasDiscount = product.original_price && product.original_price > product.price;
  const discountPercent = hasDiscount ? Math.round((1 - product.price / product.original_price) * 100) : 0;

  const handleAdd = () => {
    addToCart(product);
    if (quantity === 0) {
      showToast('In den Warenkorb gelegt', 'cart');
    }
  };

  const handleRemove = () => {
    removeFromCart(product.id);
  };

  const handleFavorite = (e) => {
    e.stopPropagation();
    toggleFavorite(product.id);
    showToast(isFavorite ? 'Von Favoriten entfernt' : 'Zu Favoriten hinzugefügt', 'heart');
  };

  // Parse nutrition info
  const nutritionItems = [
    { label: 'Kalorien', value: product.nutrition_calories, unit: 'kcal' },
    { label: 'Fett', value: product.nutrition_fat, unit: 'g' },
    { label: 'Kohlenhydrate', value: product.nutrition_carbs, unit: 'g' },
    { label: 'Eiweiß', value: product.nutrition_protein, unit: 'g' },
    { label: 'Zucker', value: product.nutrition_sugar, unit: 'g' },
    { label: 'Salz', value: product.nutrition_salt, unit: 'g' },
  ].filter(n => n.value);

  return (
    <>
      {/* Full screen overlay - z-index 100 to be above everything */}
      <div 
        className="fixed inset-0 bg-black/70 z-[100]"
        onClick={onClose}
      />
      
      {/* Modal - Full screen on mobile */}
      <div className="fixed inset-0 z-[101] flex flex-col bg-white lg:inset-4 lg:m-auto lg:max-w-lg lg:max-h-[90vh] lg:rounded-2xl lg:overflow-hidden">
        
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <h2 className="font-bold text-lg text-gray-900">Produktdetails</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          >
            <X size={20} className="text-gray-700" />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Image */}
          <div className="relative h-56 bg-gray-100">
            <img
              src={imageError ? fallbackImage : (product.image || fallbackImage)}
              alt={product.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
            
            {/* Discount Badge */}
            {hasDiscount && (
              <span className="absolute top-3 left-3 bg-rose-500 text-white text-sm font-bold px-3 py-1 rounded-lg shadow">
                -{discountPercent}%
              </span>
            )}
            
            {/* Favorite Button */}
            <button
              onClick={handleFavorite}
              className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
            >
              <Heart 
                size={20} 
                className={isFavorite ? 'fill-rose-500 text-rose-500' : 'text-gray-400'} 
              />
            </button>
          </div>
          
          {/* Details */}
          <div className="p-4">
            {/* Brand */}
            {product.brand && (
              <p className="text-rose-500 font-semibold text-sm">{product.brand}</p>
            )}
            
            {/* Name */}
            <h1 className="text-xl font-bold text-gray-900 mt-1">{product.name}</h1>
            
            {/* Unit & Weight */}
            <p className="text-gray-500 text-sm mt-1">
              {product.unit_amount && product.unit_amount !== '1' ? `${product.unit_amount} ` : ''}
              {product.unit || 'Stück'}
              {product.weight && ` · ${product.weight}${product.weight_unit || 'g'}`}
            </p>
            
            {/* Price */}
            <div className="flex items-baseline gap-3 mt-3">
              <span className="text-2xl font-black text-gray-900">
                {product.price?.toFixed(2).replace('.', ',')} €
              </span>
              {hasDiscount && (
                <span className="text-lg text-gray-400 line-through">
                  {product.original_price?.toFixed(2).replace('.', ',')} €
                </span>
              )}
            </div>
            
            {/* Description */}
            {product.description && (
              <p className="text-gray-600 text-sm mt-3 leading-relaxed">{product.description}</p>
            )}
            
            {/* Info Sections */}
            {(product.ingredients || nutritionItems.length > 0 || product.allergens || product.origin) && (
              <div className="mt-4 space-y-2 border-t pt-4">
                {/* Ingredients */}
                {product.ingredients && (
                  <details className="group bg-gray-50 rounded-xl">
                    <summary className="flex items-center gap-2 cursor-pointer p-3 text-sm font-medium text-gray-700">
                      <Leaf size={16} className="text-green-500" />
                      Zutaten
                    </summary>
                    <p className="px-3 pb-3 text-sm text-gray-600">{product.ingredients}</p>
                  </details>
                )}
                
                {/* Nutrition */}
                {nutritionItems.length > 0 && (
                  <details className="group bg-gray-50 rounded-xl">
                    <summary className="flex items-center gap-2 cursor-pointer p-3 text-sm font-medium text-gray-700">
                      <Scale size={16} className="text-blue-500" />
                      Nährwerte pro 100g
                    </summary>
                    <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                      {nutritionItems.map((n, i) => (
                        <div key={i} className="flex justify-between text-sm bg-white rounded-lg px-2 py-1">
                          <span className="text-gray-500">{n.label}</span>
                          <span className="font-medium text-gray-700">{n.value}{n.unit}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                
                {/* Allergens */}
                {product.allergens && (
                  <details className="group bg-amber-50 rounded-xl">
                    <summary className="flex items-center gap-2 cursor-pointer p-3 text-sm font-medium text-amber-700">
                      <AlertTriangle size={16} className="text-amber-500" />
                      Allergene
                    </summary>
                    <p className="px-3 pb-3 text-sm text-amber-700">{product.allergens}</p>
                  </details>
                )}
                
                {/* Origin */}
                {product.origin && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-sm text-gray-600">
                    <Package size={16} className="text-gray-400" />
                    Herkunft: <span className="font-medium">{product.origin}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Fixed Footer - Add to Cart */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4 pb-8 lg:pb-4">
          {quantity > 0 ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1.5">
                <button
                  onClick={handleRemove}
                  className="w-11 h-11 bg-white hover:bg-gray-50 rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                >
                  <Minus size={20} />
                </button>
                <span className="w-8 text-center text-xl font-bold">{quantity}</span>
                <button
                  onClick={handleAdd}
                  className="w-11 h-11 bg-white hover:bg-gray-50 rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="flex-1 text-right">
                <p className="text-sm text-gray-500">Gesamt</p>
                <p className="text-2xl font-black text-gray-900">{(product.price * quantity).toFixed(2).replace('.', ',')} €</p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="w-full bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30 transition-all text-lg"
            >
              <Plus size={22} />
              In den Warenkorb · {product.price?.toFixed(2).replace('.', ',')} €
            </button>
          )}
        </div>
      </div>
    </>
  );
}
