import { Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../store';

export default function ProductCard({ product }) {
  const { cart, addToCart, removeFromCart } = useStore();
  const cartItem = cart.find(item => item.id === product.id);
  const quantity = cartItem?.quantity || 0;

  // Placeholder image with product emoji based on category
  const getPlaceholder = () => {
    const colors = ['#E0F2FE', '#FCE7F3', '#FEF3C7', '#D1FAE5', '#EDE9FE'];
    const randomColor = colors[product.id % colors.length];
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="${encodeURIComponent(randomColor)}" width="200" height="200"/><text x="100" y="115" font-size="60" text-anchor="middle">📦</text></svg>`;
  };

  return (
    <motion.div 
      className="product-card bg-white rounded-2xl p-3 shadow-sm"
      whileTap={{ scale: 0.98 }}
    >
      {/* Image */}
      <div className="aspect-square bg-gray-100 rounded-xl mb-3 relative overflow-hidden">
        <img 
          src={product.image || getPlaceholder()} 
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {product.original_price && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            -{Math.round((1 - product.price / product.original_price) * 100)}%
          </span>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
          {product.name}
        </h3>
        <p className="text-xs text-gray-500">{product.unit_amount} {product.unit}</p>
        
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="font-bold text-gray-900">{product.price.toFixed(2)} €</span>
            {product.original_price && (
              <span className="text-xs text-gray-400 line-through ml-1">
                {product.original_price.toFixed(2)} €
              </span>
            )}
          </div>
          
          {/* Add/Remove buttons */}
          {quantity === 0 ? (
            <button
              onClick={() => addToCart(product)}
              className="w-9 h-9 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center transition-colors shadow-md shadow-primary-500/30"
            >
              <Plus size={20} />
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-primary-50 rounded-full p-1">
              <button
                onClick={() => removeFromCart(product.id)}
                className="w-7 h-7 bg-white hover:bg-gray-100 text-primary-600 rounded-full flex items-center justify-center transition-colors shadow-sm"
              >
                <Minus size={16} />
              </button>
              <span className="font-bold text-primary-600 w-5 text-center text-sm">{quantity}</span>
              <button
                onClick={() => addToCart(product)}
                className="w-7 h-7 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
