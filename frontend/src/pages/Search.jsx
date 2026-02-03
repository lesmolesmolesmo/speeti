import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, X, ArrowLeft, Filter, SlidersHorizontal, Grid, LayoutList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../store';
import ProductCard from '../components/ProductCard';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await api.get('/products', { params: { search: query } });
        let filtered = res.data;
        
        // Sort
        if (sortBy === 'price-low') {
          filtered = [...filtered].sort((a, b) => a.price - b.price);
        } else if (sortBy === 'price-high') {
          filtered = [...filtered].sort((a, b) => b.price - a.price);
        } else if (sortBy === 'name') {
          filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        }
        
        setProducts(filtered);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchProducts();
  }, [query, sortBy]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams({ q: query });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="lg:hidden p-2 hover:bg-gray-100 rounded-xl">
              <ArrowLeft size={24} />
            </Link>
            
            <form onSubmit={handleSearch} className="flex-1 relative">
              <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Suche nach Produkten..."
                className="w-full pl-12 pr-12 py-3.5 bg-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setSearchParams({}); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
                >
                  <X size={18} className="text-gray-400" />
                </button>
              )}
            </form>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center justify-between mt-4 gap-4">
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="name">Name A-Z</option>
                <option value="price-low">Preis: Niedrig → Hoch</option>
                <option value="price-high">Preis: Hoch → Niedrig</option>
              </select>
            </div>

            {/* View Toggle (Desktop) */}
            <div className="hidden lg:flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutList size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Results */}
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
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <SearchIcon size={48} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Keine Produkte gefunden</h2>
            <p className="text-gray-500 mb-6">
              {query 
                ? `Für "${query}" haben wir leider keine Treffer.`
                : 'Gib einen Suchbegriff ein, um Produkte zu finden.'
              }
            </p>
            <Link 
              to="/"
              className="inline-flex items-center gap-2 bg-primary-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary-600 transition-colors"
            >
              Alle Produkte ansehen
            </Link>
          </motion.div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {products.length} {products.length === 1 ? 'Produkt' : 'Produkte'} gefunden
              {query && ` für "${query}"`}
            </p>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <AnimatePresence>
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
                </AnimatePresence>
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-4">
                <AnimatePresence>
                  {products.map((product, i) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-all"
                    >
                      <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                          src={product.image || 'https://via.placeholder.com/100'}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                        {product.unit && <p className="text-sm text-gray-400 mt-1">{product.unit}</p>}
                        <p className="text-xl font-bold text-primary-600 mt-2">
                          {product.price?.toFixed(2)}€
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
