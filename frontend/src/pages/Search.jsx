import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search as SearchIcon, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../store';
import ProductCard from '../components/ProductCard';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim()) {
        setLoading(true);
        const { data } = await api.get('/products', { params: { search: query } });
        setResults(data);
        setLoading(false);
      } else {
        // Show all products when no search
        const { data } = await api.get('/products');
        setResults(data);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <header className="bg-white sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </Link>
          
          <div className="flex-1 relative">
            <SearchIcon size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Produkt suchen..."
              className="w-full pl-10 pr-10 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Results */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-4">
              {query ? `${results.length} Ergebnisse für "${query}"` : `${results.length} Produkte`}
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {results.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>

            {results.length === 0 && query && (
              <div className="text-center py-12">
                <p className="text-4xl mb-4">🔍</p>
                <p className="text-gray-500">Keine Produkte gefunden</p>
                <p className="text-gray-400 text-sm mt-1">Versuche einen anderen Suchbegriff</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
