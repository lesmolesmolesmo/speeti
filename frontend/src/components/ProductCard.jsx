import { Plus, Minus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';

// Real product images from Unsplash (free to use)
const productImages = {
  'bio bananen': 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200&h=200&fit=crop',
  'äpfel': 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=200&h=200&fit=crop',
  'tomaten': 'https://images.unsplash.com/photo-1546470427-227c7369a9a5?w=200&h=200&fit=crop',
  'gurke': 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=200&h=200&fit=crop',
  'paprika': 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=200&h=200&fit=crop',
  'avocado': 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=200&h=200&fit=crop',
  'zitronen': 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=200&h=200&fit=crop',
  'karotten': 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=200&h=200&fit=crop',
  'milch': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop',
  'vollmilch': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop',
  'gouda': 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop',
  'butter': 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200&h=200&fit=crop',
  'joghurt': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&h=200&fit=crop',
  'mozzarella': 'https://images.unsplash.com/photo-1626957341926-98752fc2ba90?w=200&h=200&fit=crop',
  'sahne': 'https://images.unsplash.com/photo-1587657565520-6c0f0d7e93b9?w=200&h=200&fit=crop',
  'frischkäse': 'https://images.unsplash.com/photo-1559561853-08451507cbe7?w=200&h=200&fit=crop',
  'hähnchen': 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200&h=200&fit=crop',
  'hackfleisch': 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=200&h=200&fit=crop',
  'würstchen': 'https://images.unsplash.com/photo-1612871689353-ccd2e5b031d2?w=200&h=200&fit=crop',
  'salami': 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=200&h=200&fit=crop',
  'schinken': 'https://images.unsplash.com/photo-1624174503860-478619028ab3?w=200&h=200&fit=crop',
  'brot': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop',
  'vollkornbrot': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop',
  'brötchen': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&h=200&fit=crop',
  'croissant': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&h=200&fit=crop',
  'toast': 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=200&h=200&fit=crop',
  'coca-cola': 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200&h=200&fit=crop',
  'cola': 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200&h=200&fit=crop',
  'mineralwasser': 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=200&h=200&fit=crop',
  'wasser': 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=200&h=200&fit=crop',
  'orangensaft': 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=200&h=200&fit=crop',
  'bier': 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200&h=200&fit=crop',
  'red bull': 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=200&h=200&fit=crop',
  'apfelschorle': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=200&h=200&fit=crop',
  'chips': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&h=200&fit=crop',
  'schokolade': 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200&h=200&fit=crop',
  'milka': 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200&h=200&fit=crop',
  'gummibärchen': 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=200&h=200&fit=crop',
  'kekse': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200&h=200&fit=crop',
  'nüsse': 'https://images.unsplash.com/photo-1536816579748-4ecb3f03d72a?w=200&h=200&fit=crop',
  'eis': 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=200&h=200&fit=crop',
  'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop',
  'pommes': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=200&h=200&fit=crop',
  'fischstäbchen': 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=200&h=200&fit=crop',
  'spinat': 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=200&h=200&fit=crop',
  'nuggets': 'https://images.unsplash.com/photo-1562967914-608f82629710?w=200&h=200&fit=crop',
  'toilettenpapier': 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=200&h=200&fit=crop',
  'küchentücher': 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=200&h=200&fit=crop',
  'spülmittel': 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=200&h=200&fit=crop',
  'shampoo': 'https://images.unsplash.com/photo-1556227702-d1e4e7b5c232?w=200&h=200&fit=crop',
  'duschgel': 'https://images.unsplash.com/photo-1556227702-d1e4e7b5c232?w=200&h=200&fit=crop',
  'zahnpasta': 'https://images.unsplash.com/photo-1559591937-abc00541cd69?w=200&h=200&fit=crop',
  'windeln': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=200&fit=crop',
};

const getProductImage = (name) => {
  const nameLower = name.toLowerCase();
  for (const [key, url] of Object.entries(productImages)) {
    if (nameLower.includes(key)) return url;
  }
  return null;
};

export default function ProductCard({ product, compact = false }) {
  const { cart, addToCart, removeFromCart } = useStore();
  const cartItem = cart.find(item => item.id === product.id);
  const quantity = cartItem?.quantity || 0;
  const imageUrl = product.image || getProductImage(product.name);

  if (compact) {
    // Horizontal compact card for scrollable rows
    return (
      <motion.div 
        className="flex-shrink-0 w-36 bg-white rounded-2xl p-3 shadow-sm border border-gray-100"
        whileTap={{ scale: 0.98 }}
      >
        {/* Image */}
        <div className="relative aspect-square bg-gray-50 rounded-xl mb-2 overflow-hidden">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-gray-100 to-gray-200">
              📦
            </div>
          )}
          
          {/* Add Button */}
          <AnimatePresence>
            {quantity === 0 ? (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                onClick={() => addToCart(product)}
                className="absolute top-2 right-2 w-8 h-8 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary-500/30"
              >
                <Plus size={18} />
              </motion.button>
            ) : (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 flex items-center bg-primary-500 rounded-full shadow-lg"
              >
                <button
                  onClick={() => removeFromCart(product.id)}
                  className="w-7 h-7 text-white flex items-center justify-center"
                >
                  <Minus size={14} />
                </button>
                <span className="text-white font-bold text-sm px-1">{quantity}</span>
                <button
                  onClick={() => addToCart(product)}
                  className="w-7 h-7 text-white flex items-center justify-center"
                >
                  <Plus size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Discount Badge */}
          {product.original_price && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              -{Math.round((1 - product.price / product.original_price) * 100)}%
            </span>
          )}
        </div>

        {/* Info */}
        <h3 className="font-medium text-gray-900 text-xs leading-tight line-clamp-2 mb-1">
          {product.name}
        </h3>
        <p className="text-[10px] text-gray-400 mb-1">{product.unit_amount} {product.unit}</p>
        <p className="font-bold text-gray-900 text-sm">{product.price.toFixed(2)} €</p>
      </motion.div>
    );
  }

  // Full card (grid view)
  return (
    <motion.div 
      className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
      whileTap={{ scale: 0.98 }}
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-50 rounded-xl mb-3 overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-gray-100 to-gray-200">
            📦
          </div>
        )}
        
        {/* Add Button - Flaschenpost Style */}
        <AnimatePresence>
          {quantity === 0 ? (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={() => addToCart(product)}
              className="absolute top-2 right-2 w-9 h-9 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary-500/30 transition-transform hover:scale-110"
            >
              <Plus size={20} strokeWidth={2.5} />
            </motion.button>
          ) : (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-2 right-2 flex items-center bg-primary-500 rounded-full shadow-lg shadow-primary-500/30"
            >
              <button
                onClick={() => removeFromCart(product.id)}
                className="w-8 h-8 text-white flex items-center justify-center hover:bg-primary-600 rounded-l-full transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="text-white font-bold text-sm min-w-[24px] text-center">{quantity}</span>
              <button
                onClick={() => addToCart(product)}
                className="w-8 h-8 text-white flex items-center justify-center hover:bg-primary-600 rounded-r-full transition-colors"
              >
                <Plus size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Discount Badge */}
        {product.original_price && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
            -{Math.round((1 - product.price / product.original_price) * 100)}%
          </span>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        <p className="text-xs text-gray-400">{product.unit_amount} {product.unit}</p>
        
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="font-bold text-gray-900 text-base">{product.price.toFixed(2)} €</span>
            {product.original_price && (
              <span className="text-xs text-gray-400 line-through ml-2">
                {product.original_price.toFixed(2)} €
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
