import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { useStore, api } from '../store';
import ProductCard from '../components/ProductCard';

export default function Category() {
  const { slug } = useParams();
  const { categories, fetchCategories } = useStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  // Fetch categories if not loaded
  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [categories.length, fetchCategories]);

  // Find category by slug - memoized to prevent unnecessary rerenders
  const category = useMemo(() => {
    return categories.find(c => c.slug === slug);
  }, [categories, slug]);

  // Fetch products when slug or sortBy changes
  useEffect(() => {
    // Wait for categories to be loaded
    if (categories.length === 0) return;
    
    // Find category fresh from the current categories
    const cat = categories.find(c => c.slug === slug);
    if (!cat) {
      setLoading(false);
      setProducts([]);
      return;
    }

    setLoading(true);
    api.get(`/products?category=${cat.id}`)
      .then(res => {
        let sorted = res.data;
        if (sortBy === 'name') {
          sorted = [...sorted].sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'price-low') {
          sorted = [...sorted].sort((a, b) => a.price - b.price);
        } else if (sortBy === 'price-high') {
          sorted = [...sorted].sort((a, b) => b.price - a.price);
        }
        setProducts(sorted);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [slug, sortBy, categories.length]);

  // Loading state while fetching categories
  if (categories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Kategorie nicht gefunden</h1>
          <Link to="/" className="text-rose-500 hover:underline">Zurück zur Startseite</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Improved mobile layout */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-3">
          {/* Top row: Back + Category name + Icon */}
          <div className="flex items-center gap-3 mb-2">
            <Link to="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-xl flex-shrink-0">
              <ArrowLeft size={22} />
            </Link>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-2xl flex-shrink-0">{category.icon || '📦'}</span>
              <h1 className="text-lg font-bold text-gray-900 truncate">{category.name}</h1>
            </div>
          </div>
          
          {/* Bottom row: Product count + Sort */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{products.length} Produkte</p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="newest">Neueste</option>
              <option value="name">Name A-Z</option>
              <option value="price-low">Preis ↑</option>
              <option value="price-high">Preis ↓</option>
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
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  cat.slug === slug
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-base">{cat.icon || '📦'}</span>
                <span className="whitespace-nowrap text-xs">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl mb-4 block">{category.icon || '📦'}</span>
            <p className="text-gray-500 font-medium">Noch keine Produkte</p>
            <p className="text-gray-400 text-sm mt-1">Produkte werden bald hinzugefügt</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
