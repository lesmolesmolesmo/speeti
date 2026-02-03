import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, ChevronRight, ChevronLeft, Zap, Search, Sparkles, Truck, Shield, Heart, Star, Gift, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, api } from '../store';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const { categories, fetchCategories } = useStore();
  const [allProducts, setAllProducts] = useState([]);
  const [currentBanner, setCurrentBanner] = useState(0);

  const banners = [
    { 
      title: 'Gratis Lieferung', 
      subtitle: 'Bei Bestellungen ab 20€', 
      bg: 'bg-gradient-to-r from-emerald-500 to-teal-600',
      icon: '🚚'
    },
    { 
      title: 'Blitzschnell bei dir', 
      subtitle: 'In nur 15-20 Minuten', 
      bg: 'bg-gradient-to-r from-primary-500 to-cyan-600',
      icon: '⚡'
    },
    { 
      title: 'Frische Garantie', 
      subtitle: '100% Qualität oder Geld zurück', 
      bg: 'bg-gradient-to-r from-orange-500 to-red-500',
      icon: '✨'
    },
    { 
      title: 'Lokale Produkte', 
      subtitle: 'Direkt aus dem Münsterland', 
      bg: 'bg-gradient-to-r from-violet-500 to-purple-600',
      icon: '🏡'
    },
  ];

  useEffect(() => {
    fetchCategories();
    api.get('/products').then(res => setAllProducts(res.data));
    const interval = setInterval(() => setCurrentBanner(p => (p + 1) % banners.length), 5000);
    return () => clearInterval(interval);
  }, []);

  const productsByCategory = categories.map(cat => ({
    ...cat,
    products: allProducts.filter(p => p.category_id === cat.id).slice(0, 15)
  })).filter(cat => cat.products.length > 0);

  const featuredProducts = allProducts.filter(p => p.featured).slice(0, 15);

  // Horizontal scroll component
  const ProductRow = ({ title, subtitle, icon, products, link }) => {
    const scrollRef = useRef(null);

    return (
      <section className="py-5">
        <div className="flex items-center justify-between mb-4 px-4">
          <div>
            <div className="flex items-center gap-2">
              {icon && <span className="text-2xl">{icon}</span>}
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            </div>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {link && (
            <Link to={link} className="flex items-center gap-1 text-primary-600 font-semibold text-sm hover:underline">
              Alle anzeigen <ChevronRight size={18} />
            </Link>
          )}
        </div>

        <div className="relative">
          <div ref={scrollRef} className="flex gap-4 overflow-x-auto hide-scrollbar px-4 pb-2">
            {products.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <ProductCard product={product} compact />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary-500 via-primary-600 to-teal-600 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-teal-400/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/3" />
        
        <div className="relative pt-10 pb-6 px-4">
          <div className="max-w-lg mx-auto">
            {/* Top Row */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                  <Zap className="text-primary-500" size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-white">Speeti</h1>
                  <p className="text-xs text-white/70 flex items-center gap-1">
                    <Sparkles size={10} /> Münsters schnellster Lieferdienst
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl px-4 py-2 shadow-lg">
                <div className="flex items-center gap-1.5 text-gray-900">
                  <Clock size={16} className="text-primary-500" />
                  <span className="text-lg font-bold">15-20</span>
                  <span className="text-sm text-gray-500">Min</span>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-white/80" />
              <span className="text-sm text-white/80">Lieferung nach:</span>
              <span className="text-sm font-bold text-white flex-1">Münster</span>
              <ChevronRight size={18} className="text-white/50" />
            </div>

            {/* Search */}
            <Link to="/search" className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 shadow-lg hover:shadow-xl transition-all">
              <Search size={20} className="text-gray-400" />
              <span className="text-gray-400 flex-1">Suche nach Produkten...</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Category Pills */}
      <div className="bg-gray-50 border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 py-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 rounded-full text-sm font-medium text-gray-700 transition-all shadow-sm"
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="whitespace-nowrap">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Banner Carousel */}
        <div className="px-4 pt-4">
          <div className="relative h-24 overflow-hidden rounded-2xl shadow-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBanner}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3 }}
                className={`absolute inset-0 ${banners[currentBanner].bg} p-5 flex items-center justify-between`}
              >
                <div className="text-white">
                  <p className="font-bold text-xl">{banners[currentBanner].title}</p>
                  <p className="text-white/80 text-sm">{banners[currentBanner].subtitle}</p>
                </div>
                <span className="text-5xl">{banners[currentBanner].icon}</span>
              </motion.div>
            </AnimatePresence>
            {/* Dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentBanner(i)}
                  className={`h-1.5 rounded-full transition-all ${i === currentBanner ? 'bg-white w-6' : 'bg-white/40 w-1.5'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <ProductRow 
            title="Aktuell beliebt" 
            subtitle="Das kaufen andere gerade"
            icon="🔥" 
            products={featuredProducts}
            link="/search?featured=1"
          />
        )}

        {/* Deal Banner */}
        <div className="px-4 pb-2">
          <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Percent className="text-white" size={24} />
              </div>
              <div className="text-white">
                <p className="font-bold">Angebote der Woche</p>
                <p className="text-xs text-white/80">Bis zu 30% sparen</p>
              </div>
            </div>
            <Link to="/search" className="bg-white text-red-500 text-sm font-bold px-4 py-2 rounded-xl hover:bg-red-50 transition-colors">
              Entdecken
            </Link>
          </div>
        </div>

        {/* Categories with Products */}
        {productsByCategory.map((cat, idx) => (
          <div key={cat.id} className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
            <ProductRow 
              title={cat.name} 
              icon={cat.icon} 
              products={cat.products}
              link={`/category/${cat.slug}`}
            />
          </div>
        ))}

        {/* Trust Section */}
        <div className="bg-gray-900 py-8">
          <div className="px-4">
            <h3 className="text-white font-bold text-lg text-center mb-6">Warum Speeti wählen?</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Truck className="text-primary-400" size={28} />
                </div>
                <p className="text-white text-sm font-semibold">Blitzschnell</p>
                <p className="text-gray-400 text-xs mt-1">15-20 Minuten</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Shield className="text-green-400" size={28} />
                </div>
                <p className="text-white text-sm font-semibold">Frisch garantiert</p>
                <p className="text-gray-400 text-xs mt-1">Oder Geld zurück</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Heart className="text-red-400" size={28} />
                </div>
                <p className="text-white text-sm font-semibold">Regional</p>
                <p className="text-gray-400 text-xs mt-1">Aus Münster</p>
              </div>
            </div>
          </div>
        </div>

        {/* App Promo */}
        <div className="bg-gradient-to-r from-primary-600 to-teal-600 py-8">
          <div className="px-4 text-center">
            <p className="text-white/80 text-sm mb-2">Noch einfacher bestellen?</p>
            <p className="text-white font-bold text-xl mb-4">Die Speeti App kommt bald! 📱</p>
            <button className="bg-white text-primary-600 font-bold px-8 py-3 rounded-xl hover:bg-primary-50 transition-colors shadow-lg">
              Benachrichtige mich
            </button>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="bg-gray-100 py-8">
          <div className="px-4">
            <div className="flex justify-around mb-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">1.000+</p>
                <p className="text-sm text-gray-500">Kunden</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">500+</p>
                <p className="text-sm text-gray-500">Produkte</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-1">
                  <Star size={20} className="text-yellow-400 fill-yellow-400" /> 4.9
                </p>
                <p className="text-sm text-gray-500">Bewertung</p>
              </div>
            </div>
            <div className="text-center text-sm text-gray-500">
              <p>🕐 Täglich 08:00 - 22:00 Uhr</p>
              <p className="mt-1">📍 Liefergebiet: Ganz Münster</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white py-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-400">
            © 2024 Speeti • Made with ❤️ in Münster
          </p>
        </div>
      </div>
    </div>
  );
}
