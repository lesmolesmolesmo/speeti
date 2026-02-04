import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Heart, Leaf, AlertTriangle, Package, Scale, Share2, ChevronRight } from 'lucide-react';
import { useStore, api } from '../store';
import { showToast } from '../components/Toast';
import { Helmet } from 'react-helmet-async';

export default function Product() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const cart = useStore(state => state.cart);
  const addToCart = useStore(state => state.addToCart);
  const removeFromCart = useStore(state => state.removeFromCart);
  const favorites = useStore(state => state.favorites);
  const toggleFavorite = useStore(state => state.toggleFavorite);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        // Try slug first, then id
        let res;
        if (isNaN(slug)) {
          res = await api.get(`/products/slug/${slug}`);
        } else {
          res = await api.get(`/products/${slug}`);
        }
        setProduct(res.data);
      } catch (e) {
        setError('Produkt nicht gefunden');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error || 'Produkt nicht gefunden'}</p>
          <Link to="/" className="text-rose-500 font-medium">Zurück zum Shop</Link>
        </div>
      </div>
    );
  }

  const inCart = cart.find(item => item.id === product.id);
  const quantity = inCart?.quantity || 0;
  const isFavorite = favorites.includes(product.id);
  
  const fallbackImage = `/placeholder-product.svg'P')}`;
  
  const hasDiscount = product.original_price && product.original_price > product.price;
  const discountPercent = hasDiscount ? Math.round((1 - product.price / product.original_price) * 100) : 0;

  const handleAdd = () => {
    addToCart(product);
    if (quantity === 0) showToast('In den Warenkorb gelegt', 'cart');
  };

  const handleRemove = () => removeFromCart(product.id);

  const handleFavorite = () => {
    toggleFavorite(product.id);
    showToast(isFavorite ? 'Von Favoriten entfernt' : 'Zu Favoriten hinzugefügt', 'heart');
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: product.name,
        text: `${product.name} für nur ${product.price.toFixed(2)}€ bei Speeti!`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link kopiert!', 'check');
    }
  };

  const nutritionItems = [
    { label: 'Kalorien', value: product.nutrition_calories, unit: 'kcal' },
    { label: 'Fett', value: product.nutrition_fat, unit: 'g' },
    { label: 'Kohlenhydrate', value: product.nutrition_carbs, unit: 'g' },
    { label: 'Eiweiß', value: product.nutrition_protein, unit: 'g' },
    { label: 'Zucker', value: product.nutrition_sugar, unit: 'g' },
    { label: 'Salz', value: product.nutrition_salt, unit: 'g' },
  ].filter(n => n.value);

  // Schema.org structured data
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || `${product.name} - Jetzt bei Speeti bestellen und in 15 Minuten geliefert bekommen.`,
    "image": product.image?.startsWith('http') ? product.image : `https://speeti.de${product.image}`,
    "brand": product.brand ? { "@type": "Brand", "name": product.brand } : undefined,
    "sku": product.sku || product.id.toString(),
    "gtin13": product.ean || undefined,
    "offers": {
      "@type": "Offer",
      "url": `https://speeti.de/produkt/${product.slug || product.id}`,
      "priceCurrency": "EUR",
      "price": product.price,
      "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "availability": product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "Speeti"
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>{product.name} kaufen | Speeti Münster</title>
        <meta name="description" content={product.description || `${product.name} online bestellen bei Speeti. Lieferung in 15 Minuten nach Münster. ${product.price.toFixed(2)}€`} />
        <meta name="keywords" content={`${product.name}, ${product.brand || ''}, kaufen, bestellen, Münster, Lieferservice, Speeti`} />
        <link rel="canonical" href={`https://speeti.de/produkt/${product.slug || product.id}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${product.name} | Speeti`} />
        <meta property="og:description" content={product.description || `Jetzt ${product.name} bestellen - in 15 Min geliefert!`} />
        <meta property="og:image" content={product.image?.startsWith('http') ? product.image : `https://speeti.de${product.image}`} />
        <meta property="og:url" content={`https://speeti.de/produkt/${product.slug || product.id}`} />
        <meta property="og:type" content="product" />
        <meta property="product:price:amount" content={product.price} />
        <meta property="product:price:currency" content="EUR" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.name} | Speeti`} />
        <meta name="twitter:description" content={`${product.price.toFixed(2)}€ - Jetzt bestellen!`} />
        
        {/* Schema.org */}
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>

      <div className="min-h-screen bg-white pb-32">
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-lg z-10 border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft size={24} />
            </button>
            <div className="flex gap-2">
              <button onClick={handleShare} className="p-2 hover:bg-gray-100 rounded-full">
                <Share2 size={20} />
              </button>
              <button onClick={handleFavorite} className="p-2 hover:bg-gray-100 rounded-full">
                <Heart size={20} className={isFavorite ? 'fill-rose-500 text-rose-500' : ''} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Image */}
          <div className="aspect-square lg:aspect-video bg-gray-100 relative">
            <img
              src={imageError ? fallbackImage : (product.image || fallbackImage)}
              alt={product.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover lg:object-contain"
            />
            {hasDiscount && (
              <span className="absolute top-4 left-4 bg-rose-500 text-white font-bold px-4 py-2 rounded-xl shadow-lg">
                -{discountPercent}%
              </span>
            )}
          </div>

          {/* Content */}
          <div className="p-4 lg:p-8">
            {/* Breadcrumb */}
            <nav className="text-sm text-gray-500 mb-4">
              <Link to="/" className="hover:text-rose-500">Home</Link>
              <ChevronRight size={14} className="inline mx-1" />
              <Link to={`/category/${product.category_slug}`} className="hover:text-rose-500">{product.category_name}</Link>
              <ChevronRight size={14} className="inline mx-1" />
              <span className="text-gray-700">{product.name}</span>
            </nav>

            {product.brand && <p className="text-rose-500 font-semibold">{product.brand}</p>}
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">{product.name}</h1>
            
            <p className="text-gray-500 mt-2">
              {product.unit_amount !== '1' && `${product.unit_amount} `}{product.unit || 'Stück'}
              {product.weight && ` · ${product.weight}${product.weight_unit || 'g'}`}
            </p>

            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-3xl font-black">{product.price?.toFixed(2).replace('.', ',')} €</span>
              {hasDiscount && (
                <span className="text-xl text-gray-400 line-through">{product.original_price?.toFixed(2).replace('.', ',')} €</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">inkl. MwSt.</p>

            {product.description && (
              <p className="text-gray-600 mt-6 leading-relaxed">{product.description}</p>
            )}

            {/* Info Sections */}
            <div className="mt-8 space-y-3">
              {product.ingredients && (
                <details className="bg-gray-50 rounded-xl">
                  <summary className="flex items-center gap-2 cursor-pointer p-4 font-medium">
                    <Leaf size={18} className="text-green-500" /> Zutaten
                  </summary>
                  <p className="px-4 pb-4 text-gray-600">{product.ingredients}</p>
                </details>
              )}

              {nutritionItems.length > 0 && (
                <details className="bg-gray-50 rounded-xl">
                  <summary className="flex items-center gap-2 cursor-pointer p-4 font-medium">
                    <Scale size={18} className="text-blue-500" /> Nährwerte pro 100g
                  </summary>
                  <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                    {nutritionItems.map((n, i) => (
                      <div key={i} className="flex justify-between bg-white rounded-lg p-2">
                        <span className="text-gray-500">{n.label}</span>
                        <span className="font-medium">{n.value}{n.unit}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {product.allergens && (
                <details className="bg-amber-50 rounded-xl">
                  <summary className="flex items-center gap-2 cursor-pointer p-4 font-medium text-amber-700">
                    <AlertTriangle size={18} className="text-amber-500" /> Allergene
                  </summary>
                  <p className="px-4 pb-4 text-amber-700">{product.allergens}</p>
                </details>
              )}

              {product.origin && (
                <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl text-gray-600">
                  <Package size={18} /> Herkunft: <span className="font-medium">{product.origin}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Add to Cart */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-8 lg:pb-4 z-20">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            {quantity > 0 ? (
              <>
                <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1.5">
                  <button onClick={handleRemove} className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Minus size={20} />
                  </button>
                  <span className="w-8 text-center text-xl font-bold">{quantity}</span>
                  <button onClick={handleAdd} className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex-1 text-right">
                  <p className="text-sm text-gray-500">Gesamt</p>
                  <p className="text-2xl font-black">{(product.price * quantity).toFixed(2).replace('.', ',')} €</p>
                </div>
              </>
            ) : (
              <button
                onClick={handleAdd}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30 text-lg"
              >
                <Plus size={22} /> In den Warenkorb · {product.price?.toFixed(2).replace('.', ',')} €
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
