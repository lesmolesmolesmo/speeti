import { useEffect, useState, useRef, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, ChevronRight, Search, Truck, ChevronLeft, Star, Zap, Gift, Percent, Shield, Headphones } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { useStore, api } from '../store';
import ProductCard from '../components/ProductCard';

// Hero Slides Data
const heroSlides = [
  {
    id: 1,
    title: "Blitzschnell bei dir! ⚡",
    subtitle: "Lieferung in 15-20 Minuten",
    bg: "from-rose-500 to-pink-600",
    image: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400&h=300&fit=crop",
    cta: "Jetzt bestellen",
    link: "/search"
  },
  {
    id: 2,
    title: "WELCOME10",
    subtitle: "10% Rabatt auf deine erste Bestellung",
    bg: "from-violet-500 to-purple-600",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=300&fit=crop",
    cta: "Code einlösen",
    link: "/cart",
    badge: "Neukunden"
  },
  {
    id: 3,
    title: "Kostenlose Lieferung",
    subtitle: "Ab 20€ Bestellwert",
    bg: "from-emerald-500 to-teal-600",
    image: "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400&h=300&fit=crop",
    cta: "Mehr erfahren",
    link: "/search"
  }
];

// Feature Cards
const features = [
  { icon: Zap, title: "15 Min", subtitle: "Lieferung", color: "bg-amber-100 text-amber-600" },
  { icon: Shield, title: "Sicher", subtitle: "Bezahlen", color: "bg-green-100 text-green-600" },
  { icon: Headphones, title: "24/7", subtitle: "Support", color: "bg-blue-100 text-blue-600" },
  { icon: Gift, title: "Promo", subtitle: "Codes", color: "bg-purple-100 text-purple-600" },
];

// ProductRow Component
const ProductRow = memo(({ title, products, link, icon: Icon }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction * 300, behavior: 'smooth' });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-3 px-4 lg:px-0">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          {Icon && <Icon size={20} className="text-rose-500" />}
          {title}
        </h2>
        {link && (
          <Link to={link} className="text-rose-500 font-semibold text-sm flex items-center gap-1 hover:underline">
            Alle <ChevronRight size={16} />
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
          className="flex gap-3 overflow-x-auto px-4 lg:px-0 pb-2 scrollbar-hide"
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
  const { categories, fetchCategories, selectedAddress, user } = useStore();
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

  const dealProducts = useMemo(() => {
    return allProducts.filter(p => p.original_price && p.original_price > p.price).slice(0, 12);
  }, [allProducts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Lädt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white sticky top-0 z-30 border-b border-gray-100">
        <div className="px-4 py-3">
          {/* Location */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
                <MapPin size={16} className="text-rose-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Lieferung nach</p>
                <p className="text-sm font-semibold text-gray-900">
                  {selectedAddress ? `${selectedAddress.street} ${selectedAddress.house_number}` : 'Münster'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
              <Clock size={14} />
              <span className="font-medium">15-20 min</span>
            </div>
          </div>

          {/* Search */}
          <Link 
            to="/search" 
            className="flex items-center gap-3 bg-gray-100 rounded-xl px-4 py-3 text-gray-500"
          >
            <Search size={20} />
            <span>Was suchst du?</span>
          </Link>
        </div>
      </header>

      {/* Desktop Search Header */}
      <div className="hidden lg:block py-4">
        <div className="max-w-4xl mx-auto px-4">
          <Link 
            to="/search" 
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-6 py-4 text-gray-500 hover:border-rose-300 transition-colors shadow-sm"
          >
            <Search size={24} className="text-gray-400" />
            <span className="text-lg">Was suchst du heute?</span>
          </Link>
        </div>
      </div>

      {/* Hero Slider */}
      <section className="px-4 lg:px-0 lg:max-w-4xl lg:mx-auto py-4">
        <Swiper
          modules={[Autoplay, Pagination, Navigation]}
          spaceBetween={16}
          slidesPerView={1}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          navigation
          loop
          className="rounded-2xl overflow-hidden hero-swiper"
        >
          {heroSlides.map((slide) => (
            <SwiperSlide key={slide.id}>
              <Link to={slide.link}>
                <div className={`relative bg-gradient-to-r ${slide.bg} p-6 lg:p-8 min-h-[180px] lg:min-h-[220px] flex items-center`}>
                  {slide.badge && (
                    <span className="absolute top-4 left-4 bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full">
                      {slide.badge}
                    </span>
                  )}
                  <div className="flex-1 text-white pr-4">
                    <h2 className="text-2xl lg:text-3xl font-bold mb-2">{slide.title}</h2>
                    <p className="text-white/90 mb-4">{slide.subtitle}</p>
                    <span className="inline-flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors">
                      {slide.cta} <ChevronRight size={16} />
                    </span>
                  </div>
                  <div className="hidden sm:block w-32 h-32 lg:w-40 lg:h-40 rounded-2xl overflow-hidden shadow-2xl">
                    <img src={slide.image} alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* Features Row */}
      <section className="px-4 lg:px-0 lg:max-w-4xl lg:mx-auto py-2">
        <div className="grid grid-cols-4 gap-2 lg:gap-4">
          {features.map((f, i) => (
            <div key={i} className="bg-white rounded-xl p-3 lg:p-4 text-center shadow-sm">
              <div className={`w-10 h-10 lg:w-12 lg:h-12 ${f.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                <f.icon size={20} />
              </div>
              <p className="font-bold text-xs lg:text-sm text-gray-900">{f.title}</p>
              <p className="text-[10px] lg:text-xs text-gray-500">{f.subtitle}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Welcome Banner for logged in users */}
      {user && (
        <section className="px-4 lg:px-0 lg:max-w-4xl lg:mx-auto py-4">
          <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-4 text-white">
            <p className="text-rose-100 text-sm">Willkommen zurück,</p>
            <p className="text-xl font-bold">{user.name}! 👋</p>
          </div>
        </section>
      )}

      {/* Category Pills */}
      <section className="py-4">
        <div className="flex gap-2 overflow-x-auto px-4 lg:px-0 lg:max-w-4xl lg:mx-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="flex-shrink-0 flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 hover:border-rose-300 hover:bg-rose-50 transition-colors shadow-sm"
            >
              <span className="text-lg">{cat.icon}</span>
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Deals Slider */}
      {dealProducts.length > 0 && (
        <section className="py-4 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="lg:max-w-4xl lg:mx-auto">
            <div className="flex items-center justify-between mb-3 px-4 lg:px-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Percent size={20} className="text-orange-500" />
                Angebote 🔥
              </h2>
              <Link to="/search?deals=true" className="text-orange-500 font-semibold text-sm flex items-center gap-1">
                Alle <ChevronRight size={16} />
              </Link>
            </div>
            <Swiper
              modules={[Navigation]}
              spaceBetween={12}
              slidesPerView="auto"
              navigation
              className="px-4 lg:px-0 deals-swiper"
            >
              {dealProducts.map((product) => (
                <SwiperSlide key={product.id} style={{ width: 'auto' }}>
                  <ProductCard product={product} compact />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>
      )}

      {/* Main Content */}
      <div className="lg:max-w-4xl lg:mx-auto">
        {/* Featured */}
        {featuredProducts.length > 0 && (
          <ProductRow 
            title="Beliebt" 
            products={featuredProducts} 
            link="/search?featured=true"
            icon={Star}
          />
        )}

        {/* Categories with Products */}
        {productsByCategory.map((category) => (
          <ProductRow
            key={category.id}
            title={`${category.icon} ${category.name}`}
            products={category.products}
            link={`/category/${category.slug}`}
          />
        ))}
      </div>

      {/* Promo Banner */}
      <section className="px-4 lg:px-0 lg:max-w-4xl lg:mx-auto py-6">
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-6 text-white text-center">
          <Gift size={32} className="mx-auto mb-3 opacity-90" />
          <h3 className="text-xl font-bold mb-2">Hast du einen Promo-Code?</h3>
          <p className="text-violet-100 mb-4 text-sm">Gib ihn beim Checkout ein und spare!</p>
          <Link 
            to="/cart" 
            className="inline-flex items-center gap-2 bg-white text-violet-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors"
          >
            Zum Warenkorb <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Trust Section */}
      <section className="px-4 lg:px-0 lg:max-w-4xl lg:mx-auto py-6 pb-24 lg:pb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 text-center mb-4">Warum Speeti?</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Truck size={24} className="text-rose-500" />
              </div>
              <p className="text-xs text-gray-600 font-medium">Blitzschnelle<br/>Lieferung</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star size={24} className="text-rose-500" />
              </div>
              <p className="text-xs text-gray-600 font-medium">Top bewertete<br/>Fahrer</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Shield size={24} className="text-rose-500" />
              </div>
              <p className="text-xs text-gray-600 font-medium">100% sichere<br/>Zahlung</p>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Swiper Styles */}
      <style>{`
        .hero-swiper .swiper-pagination-bullet {
          background: white;
          opacity: 0.5;
        }
        .hero-swiper .swiper-pagination-bullet-active {
          opacity: 1;
        }
        .hero-swiper .swiper-button-next,
        .hero-swiper .swiper-button-prev {
          color: white;
          background: rgba(0,0,0,0.3);
          width: 40px;
          height: 40px;
          border-radius: 50%;
        }
        .hero-swiper .swiper-button-next::after,
        .hero-swiper .swiper-button-prev::after {
          font-size: 16px;
        }
        .deals-swiper .swiper-button-next,
        .deals-swiper .swiper-button-prev {
          color: #f97316;
          background: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .deals-swiper .swiper-button-next::after,
        .deals-swiper .swiper-button-prev::after {
          font-size: 14px;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
