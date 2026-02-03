import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, ChevronRight, Zap, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore, api } from '../store';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const { categories, fetchCategories } = useStore();
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    fetchCategories();
    api.get('/products', { params: { featured: 1 } }).then(res => setFeatured(res.data));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary-500 to-primary-600 text-white pt-12 pb-8 px-4 rounded-b-3xl">
        <div className="max-w-lg mx-auto">
          {/* Location */}
          <div className="flex items-center gap-2 mb-6">
            <MapPin size={18} className="text-primary-200" />
            <span className="text-sm text-primary-100">Lieferung nach</span>
            <button className="flex items-center gap-1 font-semibold">
              Münster <ChevronRight size={16} />
            </button>
          </div>

          {/* Logo & Time */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-extrabold flex items-center gap-2">
                <Zap className="text-yellow-300" /> Speeti
              </h1>
              <p className="text-primary-100 text-sm mt-1">Blitzschnell bei dir</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-2xl px-4 py-2 text-center">
              <div className="flex items-center gap-2">
                <Clock size={18} />
                <span className="font-bold">15-20</span>
              </div>
              <span className="text-xs text-primary-100">Minuten</span>
            </div>
          </div>

          {/* Search */}
          <Link 
            to="/search"
            className="flex items-center gap-3 bg-white/20 backdrop-blur rounded-2xl px-4 py-3 text-primary-100 hover:bg-white/30 transition-colors"
          >
            <Search size={20} />
            <span>Was suchst du?</span>
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
        {/* Categories */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Kategorien</h2>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/category/${cat.slug}`}
                  className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: cat.color + '20' }}
                  >
                    {cat.icon}
                  </div>
                  <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                    {cat.name}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        {featured.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">🔥 Beliebt</h2>
              <Link to="/search" className="text-primary-600 text-sm font-medium">Alle anzeigen</Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {featured.slice(0, 6).map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Promo Banner */}
        <section>
          <div className="bg-gradient-to-r from-accent-500 to-accent-600 rounded-2xl p-6 text-white">
            <h3 className="text-xl font-bold mb-2">Gratis Lieferung 🎉</h3>
            <p className="text-accent-100 text-sm mb-4">Bei deiner ersten Bestellung ab 20€</p>
            <Link 
              to="/search"
              className="inline-flex items-center gap-2 bg-white text-accent-600 font-semibold px-4 py-2 rounded-xl hover:bg-accent-50 transition-colors"
            >
              Jetzt shoppen <ChevronRight size={18} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
