import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore, api } from '../store';
import ProductCard from '../components/ProductCard';

export default function Category() {
  const { slug } = useParams();
  const { categories } = useStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('name');

  const category = categories.find(c => c.slug === slug);

  useEffect(() => {
    if (category) {
      setLoading(true);
      api.get(`/products?category=${category.id}`)
        .then(res => {
          let sorted = res.data;
          if (sortBy === 'price-low') {
            sorted = [...sorted].sort((a, b) => a.price - b.price);
          } else if (sortBy === 'price-high') {
            sorted = [...sorted].sort((a, b) => b.price - a.price);
          }
          setProducts(sorted);
        })
        .finally(() => setLoading(false));
    }
  }, [category, sortBy]);

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Kategorie nicht gefunden</h1>
          <Link to="/" className="text-primary-600 hover:underline">Zurück zur Startseite</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="lg:hidden p-2 hover:bg-gray-100 rounded-xl">
                <ArrowLeft size={24} />
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{category.icon}</span>
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900">{category.name}</h1>
                  <p className="text-sm text-gray-500">{products.length} Produkte</p>
                </div>
              </div>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="name">Name A-Z</option>
              <option value="price-low">Preis: Niedrig → Hoch</option>
              <option value="price-high">Preis: Hoch → Niedrig</option>
            </select>
          </div>
        </div>
      </header>

      {/* Category Pills */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar py-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  cat.slug === slug
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="whitespace-nowrap">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">Keine Produkte in dieser Kategorie.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <ProductCard product={product} compact={window.innerWidth < 1024} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
