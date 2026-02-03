import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, ChevronRight, Zap, Search, Sparkles, Truck, Shield, Heart, Star, Gift, Percent, ArrowRight, TrendingUp, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, api } from '../store';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const { categories, fetchCategories } = useStore();
  const [allProducts, setAllProducts] = useState([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  const banners = [
    { title: 'Gratis Lieferung', subtitle: 'Bei Bestellungen ab 20€', bg: 'from-emerald-500 to-teal-600', icon: '🚚' },
    { title: 'Blitzschnell bei dir', subtitle: 'In nur 15-20 Minuten', bg: 'from-primary-500 to-cyan-600', icon: '⚡' },
    { title: 'Frische Garantie', subtitle: '100% Qualität oder Geld zurück', bg: 'from-orange-500 to-red-500', icon: '✨' },
    { title: 'Lokale Produkte', subtitle: 'Direkt aus dem Münsterland', bg: 'from-violet-500 to-purple-600', icon: '🏡' },
  ];

  useEffect(() => {
    fetchCategories();
    api.get('/products').then(res => setAllProducts(res.data));
    const interval = setInterval(() => setCurrentBanner(p => (p + 1) % banners.length), 5000);
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => { clearInterval(interval); window.removeEventListener('resize', handleResize); };
  }, []);

  const productsByCategory = categories.map(cat => ({
    ...cat,
    products: allProducts.filter(p => p.category_id === cat.id).slice(0, isDesktop ? 8 : 15)
  })).filter(cat => cat.products.length > 0);

  const featuredProducts = allProducts.filter(p => p.featured).slice(0, isDesktop ? 8 : 15);

  // Mobile: Horizontal scroll / Desktop: Grid
  const ProductSection = ({ title, subtitle, icon, products, link, highlight }) => {
    const scrollRef = useRef(null);

    return (
      <section className={`py-6 ${highlight ? 'bg-gradient-to-r from-primary-50 to-teal-50' : ''}`}>
        <div className="flex items-center justify-between mb-4 px-4 lg:px-0">
          <div className="flex items-center gap-3">
            {icon && <span className="text-2xl lg:text-3xl">{icon}</span>}
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {link && (
            <Link to={link} className="flex items-center gap-1 text-primary-600 font-semibold text-sm hover:underline group">
              Alle anzeigen 
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>

        {/* Mobile: Horizontal Scroll */}
        <div className="lg:hidden relative">
          <div ref={scrollRef} className="flex gap-3 overflow-x-auto hide-scrollbar px-4 pb-2">
            {products.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex-shrink-0 w-36"
              >
                <ProductCard product={product} compact />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Desktop: Grid */}
        <div className="hidden lg:grid grid-cols-2 xl:grid-cols-4 gap-4">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Different for Mobile vs Desktop */}
      <header className="bg-gradient-to-br from-primary-500 via-primary-600 to-teal-600 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-teal-400/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/3" />
        
        {/* Mobile Header */}
        <div className="lg:hidden relative pt-10 pb-6 px-4">
          <div className="max-w-lg mx-auto">
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

            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-white/80" />
              <span className="text-sm text-white/80">Lieferung nach:</span>
              <span className="text-sm font-bold text-white flex-1">Münster</span>
              <ChevronRight size={18} className="text-white/50" />
            </div>

            <Link to="/search" className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 shadow-lg hover:shadow-xl transition-all">
              <Search size={20} className="text-gray-400" />
              <span className="text-gray-400 flex-1">Suche nach Produkten...</span>
            </Link>
          </div>
        </div>

        {/* Desktop Header - Larger & More Impactful */}
        <div className="hidden lg:block relative py-12 px-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-5xl font-extrabold text-white mb-3"
                >
                  Frische Lebensmittel,<br />
                  <span className="text-teal-200">in 15 Minuten bei dir!</span>
                </motion.h1>
                <p className="text-xl text-white/80 mb-6">
                  Münsters schnellster Lieferdienst für alles, was du brauchst.
                </p>
                
                <div className="flex items-center gap-4">
                  <Link 
                    to="/search"
                    className="flex items-center gap-3 bg-white rounded-2xl pl-5 pr-3 py-4 shadow-xl hover:shadow-2xl transition-all w-96 group"
                  >
                    <Search size={22} className="text-gray-400" />
                    <span className="text-gray-400 flex-1">Was möchtest du bestellen?</span>
                    <span className="bg-primary-500 text-white px-4 py-2 rounded-xl font-semibold group-hover:bg-primary-600 transition-colors">
                      Suchen
                    </span>
                  </Link>
                  
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 flex items-center gap-3">
                    <MapPin size={22} className="text-white/80" />
                    <div>
                      <p className="text-xs text-white/60">Lieferung nach</p>
                      <p className="text-white font-bold">Münster</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="flex flex-col gap-4">
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 flex items-center gap-4"
                >
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <Clock className="text-white" size={28} />
                  </div>
                  <div className="text-white">
                    <p className="text-3xl font-bold">15-20</p>
                    <p className="text-white/70">Minuten Lieferzeit</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 flex items-center gap-4"
                >
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <Package className="text-white" size={28} />
                  </div>
                  <div className="text-white">
                    <p className="text-3xl font-bold">500+</p>
                    <p className="text-white/70">Produkte verfügbar</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Category Pills - Mobile Only */}
      <div className="lg:hidden bg-gray-50 border-b border-gray-100 sticky top-0 z-40">
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

      {/* Desktop Category Grid */}
      <div className="hidden lg:block bg-white border-b border-gray-100 py-6">
        <div className="max-w-6xl mx-auto px-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Kategorien</h3>
          <div className="grid grid-cols-5 xl:grid-cols-10 gap-3">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/category/${cat.slug}`}
                  className="flex flex-col items-center p-4 bg-gray-50 hover:bg-primary-50 border border-transparent hover:border-primary-200 rounded-2xl transition-all group"
                >
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{cat.icon}</span>
                  <span className="text-xs font-medium text-gray-600 text-center group-hover:text-primary-700">{cat.name}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:max-w-6xl lg:mx-auto lg:px-8">
        {/* Banner Carousel - Mobile */}
        <div className="lg:hidden px-4 pt-4">
          <div className="relative h-24 overflow-hidden rounded-2xl shadow-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBanner}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3 }}
                className={`absolute inset-0 bg-gradient-to-r ${banners[currentBanner].bg} p-5 flex items-center justify-between`}
              >
                <div className="text-white">
                  <p className="font-bold text-xl">{banners[currentBanner].title}</p>
                  <p className="text-white/80 text-sm">{banners[currentBanner].subtitle}</p>
                </div>
                <span className="text-5xl">{banners[currentBanner].icon}</span>
              </motion.div>
            </AnimatePresence>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {banners.map((_, i) => (
                <button key={i} onClick={() => setCurrentBanner(i)}
                  className={`h-1.5 rounded-full transition-all ${i === currentBanner ? 'bg-white w-6' : 'bg-white/40 w-1.5'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Banner Grid */}
        <div className="hidden lg:grid grid-cols-4 gap-4 py-6">
          {banners.map((banner, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-gradient-to-r ${banner.bg} rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform shadow-lg`}
            >
              <span className="text-4xl">{banner.icon}</span>
              <div className="text-white">
                <p className="font-bold">{banner.title}</p>
                <p className="text-white/80 text-sm">{banner.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <ProductSection 
            title="Aktuell beliebt" 
            subtitle="Das kaufen andere gerade"
            icon="🔥" 
            products={featuredProducts}
            link="/search?featured=1"
            highlight
          />
        )}

        {/* Deal Banner */}
        <div className="px-4 lg:px-0 py-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-5 lg:p-8 flex items-center justify-between shadow-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 lg:w-20 lg:h-20 bg-white/20 rounded-2xl flex items-center justify-center">
                <Percent className="text-white" size={32} />
              </div>
              <div className="text-white">
                <p className="font-bold text-xl lg:text-2xl">Angebote der Woche</p>
                <p className="text-white/80">Bis zu 30% sparen auf ausgewählte Produkte</p>
              </div>
            </div>
            <Link to="/search" className="bg-white text-red-500 font-bold px-6 py-3 rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2">
              Entdecken <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>

        {/* Categories with Products */}
        {productsByCategory.map((cat, idx) => (
          <div key={cat.id} className={idx % 2 === 1 ? 'bg-gray-50 lg:rounded-2xl lg:my-4' : ''}>
            <div className="lg:py-2">
              <ProductSection 
                title={cat.name} 
                icon={cat.icon} 
                products={cat.products}
                link={`/category/${cat.slug}`}
              />
            </div>
          </div>
        ))}

        {/* Trust Section */}
        <div className="bg-gray-900 lg:rounded-2xl lg:my-8 py-10">
          <div className="px-4 lg:px-8">
            <h3 className="text-white font-bold text-xl lg:text-2xl text-center mb-8">
              Warum über <span className="text-primary-400">1.000+ Kunden</span> Speeti vertrauen
            </h3>
            <div className="grid grid-cols-3 lg:grid-cols-3 gap-6 lg:gap-12">
              {[
                { icon: Truck, color: 'primary', title: 'Blitzschnell', desc: 'In nur 15-20 Minuten' },
                { icon: Shield, color: 'green', title: 'Frische garantiert', desc: 'Oder Geld zurück' },
                { icon: Heart, color: 'red', title: '100% Regional', desc: 'Aus dem Münsterland' },
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <div className={`w-16 h-16 lg:w-20 lg:h-20 bg-${item.color}-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <item.icon className={`text-${item.color}-400`} size={32} />
                  </div>
                  <p className="text-white font-semibold lg:text-lg">{item.title}</p>
                  <p className="text-gray-400 text-sm mt-1">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="bg-gray-100 lg:bg-white lg:border lg:border-gray-200 lg:rounded-2xl py-8 lg:my-8">
          <div className="px-4 lg:px-8">
            <div className="flex justify-around lg:justify-center lg:gap-16 mb-6">
              {[
                { value: '1.000+', label: 'Zufriedene Kunden' },
                { value: '500+', label: 'Frische Produkte' },
                { value: '4.9', label: 'Sterne Bewertung', star: true },
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <p className="text-3xl lg:text-4xl font-bold text-gray-900 flex items-center justify-center gap-1">
                    {stat.star && <Star size={24} className="text-yellow-400 fill-yellow-400" />}
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>
            <div className="text-center text-sm text-gray-500 lg:flex lg:justify-center lg:gap-8">
              <p>🕐 Täglich 08:00 - 22:00 Uhr</p>
              <p className="mt-1 lg:mt-0">📍 Liefergebiet: Ganz Münster</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white py-6 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="lg:flex lg:justify-between lg:items-center">
            <p className="text-center lg:text-left text-sm text-gray-400">
              © 2024 Speeti • Made with ❤️ in Münster
            </p>
            <div className="hidden lg:flex gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-primary-500">Impressum</a>
              <a href="#" className="hover:text-primary-500">Datenschutz</a>
              <a href="#" className="hover:text-primary-500">AGB</a>
              <a href="#" className="hover:text-primary-500">Kontakt</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
