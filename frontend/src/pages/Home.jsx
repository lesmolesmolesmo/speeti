import { useEffect, useState, useRef, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, ChevronRight, Zap, Search, Truck, Shield, Star, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore, api } from '../store';
import ProductCard from '../components/ProductCard';

// ProductRow als separate Komponente AUSSERHALB von Home (verhindert Re-Renders)
const ProductRow = memo(({ title, products, link, showAll = true }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction * 300, behavior: 'smooth' });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4 px-4 lg:px-0">
        <h2 className="text-lg lg:text-xl font-bold text-gray-900">{title}</h2>
        {showAll && link && (
          <Link 
            to={link} 
            className="text-[#00C853] font-semibold text-sm flex items-center gap-1 hover:underline"
          >
            Alle anzeigen <ChevronRight size={16} />
          </Link>
        )}
      </div>

      <div className="relative group">
        {/* Desktop Scroll Buttons */}
        <button
          onClick={() => scroll(-1)}
          className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full items-center justify-center text-gray-600 hover:text-gray-900 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={() => scroll(1)}
          className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full items-center justify-center text-gray-600 hover:text-gray-900 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight size={24} />
        </button>

        {/* Products Scroll */}
        <div 
          ref={scrollRef}
          className="flex gap-3 lg:gap-4 overflow-x-auto scrollbar-hide px-4 lg:px-0 pb-2"
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

  // Nur einmal laden
  useEffect(() => {
    if (dataLoaded) return;
    
    Promise.all([
      fetchCategories(),
      api.get('/products')
    ]).then(([_, productsRes]) => {
      setAllProducts(productsRes.data);
      setLoading(false);
      setDataLoaded(true);
    }).catch(() => {
      setLoading(false);
    });
  }, [dataLoaded]);

  // Memoize um Re-Renders zu vermeiden
  const productsByCategory = useMemo(() => {
    return categories.map(cat => ({
      ...cat,
      products: allProducts.filter(p => p.category_id === cat.id).slice(0, 12)
    })).filter(cat => cat.products.length > 0);
  }, [categories, allProducts]);

  const featuredProducts = useMemo(() => {
    return allProducts.filter(p => p.featured).slice(0, 12);
  }, [allProducts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00C853] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Lädt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="bg-[#00C853]">
        {/* Mobile Header */}
        <div className="lg:hidden px-4 pt-12 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <Zap className="text-[#00C853]" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white">Speeti</h1>
                <div className="flex items-center gap-1 text-white/80 text-xs">
                  <MapPin size={10} />
                  <span>Münster</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl px-3 py-2 shadow-lg">
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-[#00C853]" />
                <span className="text-sm font-bold text-gray-900">15-20 min</span>
              </div>
            </div>
          </div>

          <Link 
            to="/search" 
            className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-lg"
          >
            <Search size={20} className="text-gray-400" />
            <span className="text-gray-400 flex-1">Was möchtest du bestellen?</span>
          </Link>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block py-16 px-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="max-w-xl">
                <h1 className="text-5xl font-extrabold text-white leading-tight mb-4">
                  Lebensmittel in<br />
                  <span className="text-white/90">15 Minuten geliefert</span>
                </h1>
                <p className="text-white/80 text-lg mb-8">
                  Frische Produkte direkt zu dir nach Hause.
                </p>
                
                <Link 
                  to="/search"
                  className="inline-flex items-center gap-4 bg-white rounded-2xl pl-5 pr-3 py-4 shadow-xl hover:shadow-2xl transition-shadow w-full max-w-md"
                >
                  <Search size={22} className="text-gray-400" />
                  <span className="text-gray-400 flex-1">Was möchtest du bestellen?</span>
                  <span className="bg-[#00C853] text-white px-5 py-2.5 rounded-xl font-semibold">
                    Suchen
                  </span>
                </Link>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Clock className="text-white" size={24} />
                  </div>
                  <div className="text-white">
                    <p className="text-2xl font-bold">15-20</p>
                    <p className="text-white/70 text-sm">Minuten Lieferzeit</p>
                  </div>
                </div>
                
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Truck className="text-white" size={24} />
                  </div>
                  <div className="text-white">
                    <p className="text-2xl font-bold">Gratis</p>
                    <p className="text-white/70 text-sm">Ab 20€ Bestellwert</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Categories */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div 
            className="flex gap-2 overflow-x-auto px-4 lg:px-0 py-3"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-[#00C853]/10 border border-gray-100 hover:border-[#00C853]/30 rounded-full text-sm font-medium text-gray-700 hover:text-[#00C853] transition-colors"
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="whitespace-nowrap">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        
        {/* Promo Banners - Desktop */}
        <div className="hidden lg:grid grid-cols-3 gap-4 py-6 px-0">
          <div className="bg-gradient-to-r from-[#00C853] to-[#00E676] rounded-2xl p-6 text-white">
            <Truck size={32} className="mb-3" />
            <h3 className="font-bold text-lg">Gratis Lieferung</h3>
            <p className="text-white/80 text-sm">Ab 20€ Bestellwert</p>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white">
            <Zap size={32} className="mb-3" />
            <h3 className="font-bold text-lg">Blitzlieferung</h3>
            <p className="text-white/80 text-sm">In nur 15-20 Minuten</p>
          </div>
          
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-6 text-white">
            <Shield size={32} className="mb-3" />
            <h3 className="font-bold text-lg">Frischegarantie</h3>
            <p className="text-white/80 text-sm">100% Qualität oder Geld zurück</p>
          </div>
        </div>

        {/* Mobile Promo */}
        <div className="lg:hidden px-4 py-4">
          <div className="bg-gradient-to-r from-[#00C853] to-[#00E676] rounded-2xl p-4 flex items-center justify-between">
            <div className="text-white">
              <p className="font-bold">Gratis Lieferung 🚚</p>
              <p className="text-white/80 text-sm">Ab 20€ Bestellwert</p>
            </div>
            <Link to="/search" className="bg-white text-[#00C853] font-bold px-4 py-2 rounded-xl text-sm">
              Bestellen
            </Link>
          </div>
        </div>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <ProductRow 
            title="🔥 Beliebt in deiner Gegend" 
            products={featuredProducts}
            link="/search?featured=1"
          />
        )}

        {/* Categories with Products */}
        {productsByCategory.map((cat) => (
          <ProductRow 
            key={cat.id}
            title={`${cat.icon} ${cat.name}`}
            products={cat.products}
            link={`/category/${cat.slug}`}
          />
        ))}

        {/* Trust Section */}
        <div className="bg-gray-900 lg:rounded-2xl lg:mx-0 lg:my-6 py-10">
          <div className="px-4 max-w-4xl mx-auto">
            <h3 className="text-white font-bold text-xl text-center mb-8">
              Warum <span className="text-[#00C853]">10.000+</span> Kunden Speeti vertrauen
            </h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-[#00C853]/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Truck className="text-[#00C853]" size={26} />
                </div>
                <p className="text-white font-semibold">15-20 Min</p>
                <p className="text-gray-400 text-xs mt-1">Blitzschnell</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-[#00C853]/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Shield className="text-[#00C853]" size={26} />
                </div>
                <p className="text-white font-semibold">Frischegarantie</p>
                <p className="text-gray-400 text-xs mt-1">Geld zurück</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-[#00C853]/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Star className="text-[#00C853]" size={26} />
                </div>
                <p className="text-white font-semibold">4.9 Sterne</p>
                <p className="text-gray-400 text-xs mt-1">1.000+ Bewertungen</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="py-8 px-4">
          <div className="text-center text-sm text-gray-400">
            <p>🕐 Täglich 08:00 - 22:00 • 📍 Münster</p>
            <p className="mt-2">© 2024 Speeti</p>
          </div>
        </div>
      </div>
    </div>
  );
}
