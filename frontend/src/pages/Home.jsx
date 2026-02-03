import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, ChevronRight, ChevronLeft, Zap, Search, Sparkles, Percent, Truck, Shield, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, api } from '../store';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const { categories, fetchCategories } = useStore();
  const [allProducts, setAllProducts] = useState([]);
  const [currentPromo, setCurrentPromo] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);

  const promos = [
    { title: 'Gratis Lieferung', subtitle: 'Ab 20€ Bestellwert', bg: 'bg-gradient-to-r from-emerald-500 to-teal-500', icon: '🚚' },
    { title: 'Blitzschnell', subtitle: 'In 15-20 Minuten bei dir', bg: 'bg-gradient-to-r from-primary-500 to-cyan-500', icon: '⚡' },
    { title: 'Frische Garantie', subtitle: '100% Qualität oder Geld zurück', bg: 'bg-gradient-to-r from-orange-500 to-amber-500', icon: '✨' },
    { title: 'Lokale Produkte', subtitle: 'Direkt aus dem Münsterland', bg: 'bg-gradient-to-r from-violet-500 to-purple-500', icon: '🏡' },
  ];

  const tips = [
    '💡 Wusstest du? Wir liefern auch an Sonn- und Feiertagen!',
    '🌿 Tipp: Probiere unsere Bio-Produkte aus der Region',
    '❄️ Unsere Kühlkette ist garantiert - immer frisch!',
    '🎁 Spare bei größeren Bestellungen - ab 50€ extra Rabatt',
  ];

  useEffect(() => {
    fetchCategories();
    api.get('/products').then(res => setAllProducts(res.data));
    
    const promoInterval = setInterval(() => setCurrentPromo(p => (p + 1) % promos.length), 4000);
    const tipInterval = setInterval(() => setCurrentTip(p => (p + 1) % tips.length), 6000);
    return () => { clearInterval(promoInterval); clearInterval(tipInterval); };
  }, []);

  const productsByCategory = categories.map(cat => ({
    ...cat,
    products: allProducts.filter(p => p.category_id === cat.id).slice(0, 12)
  })).filter(cat => cat.products.length > 0);

  const featuredProducts = allProducts.filter(p => p.featured).slice(0, 12);
  const cheapProducts = [...allProducts].sort((a, b) => a.price - b.price).slice(0, 12);

  const ScrollRow = ({ title, subtitle, icon, products, seeAllLink, bgColor }) => {
    const scrollRef = useRef(null);
    const scroll = (dir) => scrollRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' });

    return (
      <section className={`py-4 ${bgColor || ''}`}>
        <div className="flex items-center justify-between mb-3 px-4">
          <div>
            <div className="flex items-center gap-2">
              {icon && <span className="text-xl">{icon}</span>}
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            </div>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {seeAllLink && (
            <Link to={seeAllLink} className="text-primary-600 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              Mehr <ChevronRight size={16} />
            </Link>
          )}
        </div>

        <div className="relative group">
          <button onClick={() => scroll(-1)} className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/90 shadow-lg rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft size={18} /></button>
          <button onClick={() => scroll(1)} className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/90 shadow-lg rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight size={18} /></button>

          <div ref={scrollRef} className="flex gap-3 overflow-x-auto hide-scrollbar px-4 pb-2">
            {products.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
                <ProductCard product={product} compact />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary-600 via-primary-500 to-teal-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/3" />
        
        <div className="relative pt-10 pb-5 px-4">
          <div className="max-w-lg mx-auto">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <Zap className="text-primary-500" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-white">Speeti</h1>
                  <p className="text-[10px] text-white/70 flex items-center gap-1"><Sparkles size={10} /> Münsters schnellster Lieferdienst</p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5">
                  <div className="flex items-center gap-1 text-white">
                    <Clock size={14} />
                    <span className="text-sm font-bold">15-20</span>
                    <span className="text-xs">Min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-3 py-2 mb-4">
              <MapPin size={16} className="text-white/80" />
              <span className="text-sm text-white/90">Lieferung nach:</span>
              <span className="text-sm font-bold text-white">Ganz Münster</span>
              <ChevronRight size={16} className="text-white/60 ml-auto" />
            </div>

            {/* Search */}
            <Link to="/search" className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-lg hover:shadow-xl transition-all">
              <Search size={20} className="text-gray-400" />
              <span className="text-gray-400 flex-1 text-sm">Suche nach Produkten...</span>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-md">⌘K</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Category Bar - Sticky */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex gap-1 overflow-x-auto hide-scrollbar px-3 py-2">
            {categories.map((cat) => (
              <Link key={cat.id} to={`/category/${cat.slug}`}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-primary-100 hover:text-primary-700 rounded-lg text-xs font-medium text-gray-700 transition-all"
              >
                <span className="text-base">{cat.icon}</span>
                <span className="whitespace-nowrap">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Promo Carousel */}
      <div className="bg-white">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="relative h-20 overflow-hidden rounded-xl">
            <AnimatePresence mode="wait">
              <motion.div key={currentPromo} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className={`absolute inset-0 ${promos[currentPromo].bg} p-4 flex items-center justify-between`}
              >
                <div className="text-white">
                  <p className="font-bold text-lg">{promos[currentPromo].title}</p>
                  <p className="text-white/80 text-xs">{promos[currentPromo].subtitle}</p>
                </div>
                <span className="text-4xl">{promos[currentPromo].icon}</span>
              </motion.div>
            </AnimatePresence>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {promos.map((_, i) => (
                <button key={i} onClick={() => setCurrentPromo(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentPromo ? 'bg-white w-4' : 'bg-white/40'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tip Banner */}
      <div className="bg-amber-50 border-y border-amber-100">
        <div className="max-w-lg mx-auto px-4 py-2">
          <AnimatePresence mode="wait">
            <motion.p key={currentTip} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs text-amber-800 text-center font-medium"
            >
              {tips[currentTip]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Featured */}
      {featuredProducts.length > 0 && (
        <div className="bg-white">
          <ScrollRow title="Aktuell beliebt" subtitle="Das kaufen andere gerade" icon="🔥" products={featuredProducts} seeAllLink="/search" />
        </div>
      )}

      {/* Deals Banner */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 py-3">
        <div className="max-w-lg mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <Percent className="animate-pulse" size={24} />
            <div>
              <p className="font-bold text-sm">Angebote der Woche</p>
              <p className="text-[10px] text-white/80">Bis zu 30% sparen</p>
            </div>
          </div>
          <Link to="/search" className="bg-white text-red-500 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
            Entdecken
          </Link>
        </div>
      </div>

      {/* Budget Friendly */}
      <div className="bg-green-50">
        <ScrollRow title="Günstige Schnäppchen" subtitle="Kleine Preise, große Freude" icon="💰" products={cheapProducts} seeAllLink="/search" />
      </div>

      {/* Categories with Products */}
      {productsByCategory.map((cat, idx) => (
        <div key={cat.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
          <ScrollRow title={cat.name} icon={cat.icon} products={cat.products} seeAllLink={`/category/${cat.slug}`} />
        </div>
      ))}

      {/* Trust Section */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 py-6">
        <div className="max-w-lg mx-auto px-4">
          <h3 className="text-white font-bold text-center mb-4">Warum Speeti?</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <Truck className="mx-auto text-primary-400 mb-2" size={24} />
              <p className="text-white text-xs font-medium">Schnelle Lieferung</p>
              <p className="text-gray-400 text-[10px]">15-20 Minuten</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <Shield className="mx-auto text-green-400 mb-2" size={24} />
              <p className="text-white text-xs font-medium">Frische Garantie</p>
              <p className="text-gray-400 text-[10px]">Oder Geld zurück</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <Heart className="mx-auto text-red-400 mb-2" size={24} />
              <p className="text-white text-xs font-medium">Lokal & Fair</p>
              <p className="text-gray-400 text-[10px]">Aus der Region</p>
            </div>
          </div>
        </div>
      </div>

      {/* App Download CTA */}
      <div className="bg-primary-500 py-5">
        <div className="max-w-lg mx-auto px-4 text-center">
          <p className="text-white/80 text-xs mb-1">Noch schneller bestellen?</p>
          <p className="text-white font-bold mb-3">Speeti App kommt bald! 📱</p>
          <button className="bg-white text-primary-600 text-sm font-bold px-6 py-2 rounded-xl hover:bg-primary-50 transition-colors">
            Benachrichtige mich
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-gray-900 py-6">
        <div className="max-w-lg mx-auto px-4">
          <div className="grid grid-cols-2 gap-4 text-center mb-4">
            <div>
              <p className="text-2xl font-bold text-white">1.000+</p>
              <p className="text-xs text-gray-400">Zufriedene Kunden</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">500+</p>
              <p className="text-xs text-gray-400">Produkte</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
            <span>🕐 Täglich 08:00 - 22:00</span>
            <span>•</span>
            <span>📍 Münster</span>
          </div>
          <p className="text-center text-gray-600 text-[10px] mt-4">
            © 2024 Speeti • Made with ❤️ in Münster
          </p>
        </div>
      </div>
    </div>
  );
}
