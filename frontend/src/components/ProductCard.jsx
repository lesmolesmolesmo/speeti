import { Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';

// Curated product images - high quality, white/clean backgrounds
const productImages = {
  // Obst & Gemüse
  'bananen': 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400&h=400&fit=crop&crop=center',
  'äpfel': 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=400&h=400&fit=crop&crop=center',
  'tomaten': 'https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=400&h=400&fit=crop&crop=center',
  'gurke': 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=400&h=400&fit=crop&crop=center',
  'paprika': 'https://images.unsplash.com/photo-1592838064575-70ed626d3a0e?w=400&h=400&fit=crop&crop=center',
  'avocado': 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=400&fit=crop&crop=center',
  'zitrone': 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=400&h=400&fit=crop&crop=center',
  'karotte': 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=400&fit=crop&crop=center',
  
  // Milch & Käse
  'milch': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop&crop=center',
  'vollmilch': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop&crop=center',
  'käse': 'https://images.unsplash.com/photo-1618164436241-4473940d1f5c?w=400&h=400&fit=crop&crop=center',
  'gouda': 'https://images.unsplash.com/photo-1618164436241-4473940d1f5c?w=400&h=400&fit=crop&crop=center',
  'butter': 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=400&fit=crop&crop=center',
  'joghurt': 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=400&h=400&fit=crop&crop=center',
  'mozzarella': 'https://images.unsplash.com/photo-1631379578550-7038263db699?w=400&h=400&fit=crop&crop=center',
  'sahne': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=400&fit=crop&crop=center',
  'frischkäse': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=400&fit=crop&crop=center',
  
  // Fleisch
  'hähnchen': 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=400&fit=crop&crop=center',
  'hackfleisch': 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=400&fit=crop&crop=center',
  'würstchen': 'https://images.unsplash.com/photo-1612871689353-ccd2e5b031d2?w=400&h=400&fit=crop&crop=center',
  'wiener': 'https://images.unsplash.com/photo-1612871689353-ccd2e5b031d2?w=400&h=400&fit=crop&crop=center',
  'salami': 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=400&h=400&fit=crop&crop=center',
  'schinken': 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=400&h=400&fit=crop&crop=center',
  
  // Brot
  'brot': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop&crop=center',
  'vollkornbrot': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop&crop=center',
  'brötchen': 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400&h=400&fit=crop&crop=center',
  'croissant': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop&crop=center',
  'toast': 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=400&h=400&fit=crop&crop=center',
  'laugenstange': 'https://images.unsplash.com/photo-1600398138360-766a6a53a42f?w=400&h=400&fit=crop&crop=center',
  
  // Getränke
  'coca-cola': 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop&crop=center',
  'cola': 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop&crop=center',
  'wasser': 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop&crop=center',
  'mineralwasser': 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop&crop=center',
  'orangensaft': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop&crop=center',
  'saft': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop&crop=center',
  'bier': 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=400&fit=crop&crop=center',
  'pils': 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=400&fit=crop&crop=center',
  'red bull': 'https://images.unsplash.com/photo-1613931372008-fbf97549b3ed?w=400&h=400&fit=crop&crop=center',
  'energy': 'https://images.unsplash.com/photo-1613931372008-fbf97549b3ed?w=400&h=400&fit=crop&crop=center',
  'apfelschorle': 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=400&fit=crop&crop=center',
  'schorle': 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=400&fit=crop&crop=center',
  
  // Snacks
  'chips': 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=400&h=400&fit=crop&crop=center',
  'schokolade': 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400&h=400&fit=crop&crop=center',
  'milka': 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400&h=400&fit=crop&crop=center',
  'gummibärchen': 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=400&h=400&fit=crop&crop=center',
  'haribo': 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=400&h=400&fit=crop&crop=center',
  'kekse': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&h=400&fit=crop&crop=center',
  'nüsse': 'https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=400&h=400&fit=crop&crop=center',
  'eis': 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&h=400&fit=crop&crop=center',
  'ben & jerry': 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&h=400&fit=crop&crop=center',
  
  // Tiefkühl
  'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop&crop=center',
  'pommes': 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=400&h=400&fit=crop&crop=center',
  'fischstäbchen': 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=400&h=400&fit=crop&crop=center',
  'spinat': 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=400&fit=crop&crop=center',
  'nuggets': 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=400&fit=crop&crop=center',
  
  // Haushalt
  'toilettenpapier': 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=400&h=400&fit=crop&crop=center',
  'küchentücher': 'https://images.unsplash.com/photo-1583845112239-97ef1341b271?w=400&h=400&fit=crop&crop=center',
  'spülmittel': 'https://images.unsplash.com/photo-1622398925373-3f91b1e275f2?w=400&h=400&fit=crop&crop=center',
  'müllbeutel': 'https://images.unsplash.com/photo-1610141142896-1d1e6e5f6517?w=400&h=400&fit=crop&crop=center',
  
  // Drogerie
  'shampoo': 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400&h=400&fit=crop&crop=center',
  'duschgel': 'https://images.unsplash.com/photo-1556227702-d1e4e7b5c232?w=400&h=400&fit=crop&crop=center',
  'zahnpasta': 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=400&h=400&fit=crop&crop=center',
  'deo': 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&h=400&fit=crop&crop=center',
  'seife': 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400&h=400&fit=crop&crop=center',
  
  // Baby
  'windeln': 'https://images.unsplash.com/photo-1584839404042-8bc22a0a4b1a?w=400&h=400&fit=crop&crop=center',
  'pampers': 'https://images.unsplash.com/photo-1584839404042-8bc22a0a4b1a?w=400&h=400&fit=crop&crop=center',
  'babybrei': 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&h=400&fit=crop&crop=center',
  'feuchttücher': 'https://images.unsplash.com/photo-1584839404042-8bc22a0a4b1a?w=400&h=400&fit=crop&crop=center',
};

// Fallback gradient backgrounds by category
const categoryGradients = {
  'obst': 'from-green-100 to-green-200',
  'gemüse': 'from-green-100 to-green-200',
  'milch': 'from-blue-100 to-blue-200',
  'käse': 'from-yellow-100 to-yellow-200',
  'fleisch': 'from-red-100 to-red-200',
  'wurst': 'from-red-100 to-red-200',
  'brot': 'from-amber-100 to-amber-200',
  'getränke': 'from-cyan-100 to-cyan-200',
  'snacks': 'from-purple-100 to-purple-200',
  'süß': 'from-pink-100 to-pink-200',
  'tiefkühl': 'from-sky-100 to-sky-200',
  'haushalt': 'from-gray-100 to-gray-200',
  'drogerie': 'from-teal-100 to-teal-200',
  'baby': 'from-rose-100 to-rose-200',
};

const getProductImage = (name, categoryName = '') => {
  const nameLower = name.toLowerCase();
  
  // Try exact matches first
  for (const [key, url] of Object.entries(productImages)) {
    if (nameLower.includes(key)) return url;
  }
  
  return null;
};

const getCategoryGradient = (categoryName = '') => {
  const catLower = categoryName.toLowerCase();
  for (const [key, gradient] of Object.entries(categoryGradients)) {
    if (catLower.includes(key)) return gradient;
  }
  return 'from-gray-100 to-gray-200';
};

export default function ProductCard({ product, compact = false }) {
  const { cart, addToCart, removeFromCart } = useStore();
  const cartItem = cart.find(item => item.id === product.id);
  const quantity = cartItem?.quantity || 0;
  const imageUrl = product.image || getProductImage(product.name, product.category_name);
  const gradient = getCategoryGradient(product.category_name);

  // Compact card for horizontal scrolling
  if (compact) {
    return (
      <motion.div 
        className="flex-shrink-0 w-[140px] bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        whileTap={{ scale: 0.97 }}
      >
        {/* Image Container */}
        <div className={`relative aspect-square bg-gradient-to-br ${gradient}`}>
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl opacity-60">📦</span>
            </div>
          )}
          
          {/* Add Button */}
          <AnimatePresence>
            {quantity === 0 ? (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                className="absolute top-2 right-2 w-8 h-8 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
              >
                <Plus size={18} strokeWidth={2.5} />
              </motion.button>
            ) : (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 flex items-center bg-primary-500 rounded-full shadow-lg"
              >
                <button onClick={(e) => { e.stopPropagation(); removeFromCart(product.id); }} className="w-7 h-7 text-white flex items-center justify-center hover:bg-primary-600 rounded-l-full">
                  <Minus size={14} />
                </button>
                <span className="text-white font-bold text-sm px-1 min-w-[20px] text-center">{quantity}</span>
                <button onClick={(e) => { e.stopPropagation(); addToCart(product); }} className="w-7 h-7 text-white flex items-center justify-center hover:bg-primary-600 rounded-r-full">
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
        <div className="p-3">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>
          <p className="text-xs text-gray-400 mt-1">{product.unit_amount} {product.unit}</p>
          <p className="font-bold text-gray-900 mt-1">{product.price.toFixed(2)} €</p>
        </div>
      </motion.div>
    );
  }

  // Full card (grid view)
  return (
    <motion.div 
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all"
      whileTap={{ scale: 0.98 }}
    >
      {/* Image */}
      <div className={`relative aspect-square bg-gradient-to-br ${gradient}`}>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-60">📦</span>
          </div>
        )}
        
        {/* Add Button */}
        <AnimatePresence>
          {quantity === 0 ? (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={(e) => { e.stopPropagation(); addToCart(product); }}
              className="absolute top-3 right-3 w-10 h-10 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
            >
              <Plus size={22} strokeWidth={2.5} />
            </motion.button>
          ) : (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-3 right-3 flex items-center bg-primary-500 rounded-full shadow-lg"
            >
              <button onClick={(e) => { e.stopPropagation(); removeFromCart(product.id); }} className="w-9 h-9 text-white flex items-center justify-center hover:bg-primary-600 rounded-l-full transition-colors">
                <Minus size={18} />
              </button>
              <span className="text-white font-bold min-w-[28px] text-center">{quantity}</span>
              <button onClick={(e) => { e.stopPropagation(); addToCart(product); }} className="w-9 h-9 text-white flex items-center justify-center hover:bg-primary-600 rounded-r-full transition-colors">
                <Plus size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Discount Badge */}
        {product.original_price && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow">
            -{Math.round((1 - product.price / product.original_price) * 100)}%
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 leading-tight line-clamp-2 min-h-[2.75rem]">
          {product.name}
        </h3>
        <p className="text-sm text-gray-400 mt-1">{product.unit_amount} {product.unit}</p>
        
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          <div>
            <span className="font-bold text-lg text-gray-900">{product.price.toFixed(2)} €</span>
            {product.original_price && (
              <span className="text-sm text-gray-400 line-through ml-2">
                {product.original_price.toFixed(2)} €
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
