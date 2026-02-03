import { Link } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Trash2, ArrowLeft, ArrowRight, ShoppingCart, Sparkles, Truck, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';

export default function Cart() {
  const { cart, addToCart, removeFromCart, clearCart } = useStore();
  
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal >= 20 ? 0 : 2.99;
  const total = subtotal + deliveryFee;

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart size={48} className="text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Dein Warenkorb ist leer</h1>
          <p className="text-gray-500 mb-8">
            Entdecke unsere frischen Produkte und füge sie deinem Warenkorb hinzu!
          </p>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-8 py-4 rounded-xl transition-colors shadow-lg shadow-primary-500/30"
          >
            <ShoppingBag size={20} />
            Jetzt einkaufen
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="lg:hidden p-2 hover:bg-gray-100 rounded-xl">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Warenkorb</h1>
              <p className="text-sm text-gray-500">{cart.length} {cart.length === 1 ? 'Artikel' : 'Artikel'}</p>
            </div>
          </div>
          <button
            onClick={clearCart}
            className="text-red-500 hover:text-red-600 text-sm font-medium flex items-center gap-1"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Leeren</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cart.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 lg:w-28 lg:h-28 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                      <img
                        src={item.image || 'https://via.placeholder.com/100'}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 lg:text-lg line-clamp-2">{item.name}</h3>
                      {item.unit && <p className="text-sm text-gray-400 mt-1">{item.unit}</p>}
                      
                      <div className="flex items-end justify-between mt-3">
                        <p className="text-xl lg:text-2xl font-bold text-primary-600">
                          {(item.price * item.quantity).toFixed(2)}€
                        </p>
                        
                        <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-9 h-9 lg:w-10 lg:h-10 bg-white hover:bg-gray-50 rounded-lg flex items-center justify-center shadow-sm transition-colors"
                          >
                            {item.quantity === 1 ? <Trash2 size={16} className="text-red-500" /> : <Minus size={18} />}
                          </button>
                          <span className="w-8 text-center font-bold text-lg">{item.quantity}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="w-9 h-9 lg:w-10 lg:h-10 bg-primary-500 hover:bg-primary-600 text-white rounded-lg flex items-center justify-center shadow-sm transition-colors"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Continue Shopping */}
            <Link
              to="/"
              className="flex items-center justify-center gap-2 text-primary-600 hover:text-primary-700 font-medium py-4"
            >
              <ArrowLeft size={18} />
              Weiter einkaufen
            </Link>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Bestellübersicht</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Zwischensumme</span>
                  <span className="font-medium">{subtotal.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Truck size={14} />
                    Lieferung
                  </span>
                  <span className={`font-medium ${deliveryFee === 0 ? 'text-green-600' : ''}`}>
                    {deliveryFee === 0 ? 'Gratis!' : `${deliveryFee.toFixed(2)}€`}
                  </span>
                </div>
                
                {subtotal < 20 && (
                  <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 mt-3">
                    <p className="text-xs text-primary-700">
                      <Sparkles size={12} className="inline mr-1" />
                      Noch <strong>{(20 - subtotal).toFixed(2)}€</strong> bis zur Gratis-Lieferung!
                    </p>
                    <div className="mt-2 h-2 bg-primary-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (subtotal / 20) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Gesamt</span>
                    <span className="text-2xl font-bold text-primary-600">{total.toFixed(2)}€</span>
                  </div>
                </div>
              </div>

              <Link
                to="/checkout"
                className="mt-6 w-full py-4 bg-gradient-to-r from-primary-500 to-teal-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary-500/30 transition-all"
              >
                Zur Kasse
                <ArrowRight size={18} />
              </Link>

              {/* Delivery Info */}
              <div className="mt-6 flex items-center gap-3 text-sm text-gray-500">
                <Clock size={16} className="text-primary-500" />
                <span>Lieferung in 15-20 Minuten</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
