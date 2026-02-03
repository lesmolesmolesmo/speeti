import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import ProductCard from '../components/ProductCard';

export default function Category() {
  const { slug } = useParams();
  const { categories, products, fetchProducts } = useStore();
  
  const category = categories.find(c => c.slug === slug);

  useEffect(() => {
    fetchProducts(slug);
  }, [slug]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{category?.icon}</span>
            <h1 className="text-xl font-bold text-gray-900">{category?.name || 'Kategorie'}</h1>
          </div>
        </div>
      </header>

      {/* Products Grid */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <p className="text-gray-500 text-sm mb-4">{products.length} Produkte</p>
        
        <div className="grid grid-cols-2 gap-3">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">Keine Produkte gefunden</p>
          </div>
        )}
      </div>
    </div>
  );
}
