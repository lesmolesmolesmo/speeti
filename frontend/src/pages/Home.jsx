import { useEffect, useState, useRef, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, ChevronRight, Search, Truck, ChevronLeft, Menu } from 'lucide-react';
import { useStore, api } from '../store';
import ProductCard from '../components/ProductCard';

// ProductRow als separate Komponente
const ProductRow = memo(({ title, products, link }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction * 300, behavior: 'smooth' });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-3 px-4 lg:px-0">
        <h2 className="text-base lg:text-lg font-bold text-gray-900">{title}</h2>
        {link && (
          <Link to={link} className="text-rose-500 font-semibold text-sm flex items-center gap-1 hover:underline">
            Alle ansehen <ChevronRight size={16} />
          </Link>
        )}
      </div>

      <div className="relative group">
        <button
          onClick={() => scroll(-1)}
          className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full items-center justify-center text-gray-600 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={() => scroll(1)}
          className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full items-center justify-center text-gray-600 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight size={24} />
        </button>

        <div 
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-4 lg:px-0 pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product) => (
            <div key={product.id} className="flex-shrink-0">
              <ProductCard product={product} compact />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

ProductRow.displayName = 'ProductRow';

export default function Home() {
  const { categories, fetchCategories } = useStore();
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (dataLoaded) return;
    
    Promise.all([
      fetchCategories(),
      api.get('/products')
    ]).then(([_, productsRes]) => {
      setAllProducts(productsRes.data);
      setLoading(false);
      setDataLoaded(true);
    }).catch(() => setLoading(false));
  }, [dataLoaded, fetchCategories]);

  const productsByCategory = useMemo(() => {
    return categories.map(cat => ({
      ...cat,
      products: allProducts.filter(p => p.category_id === cat.id).slice(0, 12)
    })).filter(cat => cat.products.length > 0);
  }, [categories, allProducts]);

  const featuredProducts = useMemo(() => {
    return allProducts.filter(p => p.featured).slice(0, 12);
  }, [allProducts]);

  // Angebote (alle Produkte mit original_price)
  const dealProducts = useMemo(() => {
    return allProducts.filter(p => p.original_price && p.original_price > p.price).slice(0, 12);
  }, [allProducts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Flink Style */}
      <header className="bg-white border-b border-gray-100">
        {/* Mobile */}
        <div className="lg:hidden">
          {/* Logo Row */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-2xl font-extrabold text-rose-500">Speeti</span>
            <Link to="/search" className="p-2 hover:bg-gray-100 rounded-full">
              <Search size={24} className="text-gray-600" />
            </Link>
          </div>
          
          {/* Address Bar */}
          <div className="px-4 pb-3">
            <button className="w-full flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-100 rounded-full text-left">
              <MapPin size={18} className="text-rose-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 flex-1">Gib deine Lieferadresse ein</span>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden lg:block py-4 px-8">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-8">
              <span className="text-3xl font-extrabold text-rose-500">Speeti</span>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 border border-rose-100 rounded-full hover:bg-rose-100 transition-colors">
                <MapPin size={18} className="text-rose-500" />
                <span className="text-sm text-gray-700">Gib hier deine Lieferadresse ein</span>
              </button>
            </div>
            
            <div className="flex items-center gap-6">
              <Link to="/search" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <Search size={20} />
              </Link>
              <Link to="/profile" className="text-gray-700 font-medium hover:text-rose-500">Profil</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Categories Bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-1 px-4 lg:px-0 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <button className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              <Menu size={18} />
              <span className="text-sm font-medium">Kategorien</span>
            </button>
            <div className="w-px h-6 bg-gray-200 mx-2" />
            {categories.slice(0, 8).map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="flex-shrink-0 px-3 py-2 text-sm font-medium text-gray-600 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors whitespace-nowrap"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto">
        {/* Angebote Section - Flink Style */}
        {dealProducts.length > 0 && (
          <section className="py-4">
            <div className="flex items-center justify-between mb-3 px-4 lg:px-0">
              <h2 className="text-base lg:text-lg font-bold text-gray-900">Angebote</h2>
              <Link to="/search?deals=1" className="text-rose-500 font-semibold text-sm flex items-center gap-1">
                Alle ansehen <ChevronRight size={16} />
              </Link>
            </div>
            <div 
              className="flex gap-3 overflow-x-auto px-4 lg:px-0 pb-2"
              style={{ scrollbarWidth: 'none' }}
            >
              {dealProducts.map((product) => (
                <div key={product.id} className="flex-shrink-0">
                  <ProductCard product={product} compact />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Promo Banner - Flink Style */}
        <div className="px-4 lg:px-0 py-4">
          <div className="bg-[#002B5C] rounded-2xl overflow-hidden flex flex-col lg:flex-row">
            <div className="p-6 lg:p-8 lg:w-1/2">
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                Ready fürs Game?
              </h2>
              <p className="text-white/80 mb-4">
                Deine MVPs: Snacks, Getränke & mehr.
              </p>
              <Link 
                to="/category/snacks-susses"
                className="inline-block bg-rose-500 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-rose-600 transition-colors"
              >
                Alles ansehen
              </Link>
            </div>
            <div className="lg:w-1/2 h-40 lg:h-auto bg-gradient-to-r from-[#002B5C] to-[#003366]">
              <img 
                src="https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=600&h=300&fit=crop"
                alt="Snacks"
                className="w-full h-full object-cover mix-blend-overlay opacity-80"
              />
            </div>
          </div>
        </div>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <ProductRow 
            title="Beliebt in deiner Gegend" 
            products={featuredProducts}
            link="/search?featured=1"
          />
        )}

        {/* Second Promo Banner */}
        <div className="px-4 lg:px-0 py-4">
          <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-6 flex items-center justify-between">
            <div className="text-white">
              <p className="text-sm font-medium opacity-80">Gratis Lieferung</p>
              <p className="text-xl font-bold">Ab 20€ Bestellwert</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Truck size={32} className="text-white" />
            </div>
          </div>
        </div>

        {/* Categories with Products */}
        {productsByCategory.map((cat) => (
          <ProductRow 
            key={cat.id}
            title={cat.name}
            products={cat.products}
            link={`/category/${cat.slug}`}
          />
        ))}

        {/* Delivery Info Banner */}
        <div className="px-4 lg:px-0 py-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin size={24} className="text-rose-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Gib deine Adresse ein, um Produkte in deiner Nähe zu sehen.</p>
            </div>
            <Link 
              to="/profile"
              className="bg-rose-500 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-rose-600 transition-colors whitespace-nowrap"
            >
              Adresse hinzufügen
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="py-8 px-4 text-center border-t border-gray-200 bg-white">
          <p className="text-sm text-gray-400">
            Täglich 08:00 - 22:00 Uhr · Münster
          </p>
          <p className="text-sm text-gray-400 mt-1">
            © 2024 Speeti
          </p>
        </div>
      </main>
    </div>
  );
}
