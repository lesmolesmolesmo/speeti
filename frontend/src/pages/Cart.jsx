import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';

export default function Cart() {
  const { cart, addToCart, removeFromCart, clearCart, getCartTotal } = useStore();
  const subtotal = getCartTotal();
  const deliveryFee = subtotal >= 20 ? 0 : 2.99;
  const total = subtotal + deliveryFee;

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Warenkorb</h1>
          </div>
        </header>
        
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <ShoppingBag size={80} className="text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Dein Warenkorb ist leer</h2>
          <p className="text-gray-500 mb-6 text-center">Füge Produkte hinzu und bestelle in wenigen Minuten</p>
          <Link 
            to="/"
            className="bg-primary-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary-600 transition-colors"
          >
            Jetzt einkaufen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-48">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Warenkorb</h1>
          </div>
          <button 
            onClick={clearCart}
            className="text-red-500 text-sm font-medium hover:text-red-600"
          >
            Leeren
          </button>
        </div>
      </header>

      {/* Cart Items */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <AnimatePresence>
          {cart.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
            >
              <div className="flex gap-4">
                {/* Image */}
                <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{item.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{item.unit_amount} {item.unit}</p>
                  <p className="font-bold text-gray-900 mt-2">{item.price.toFixed(2)} €</p>
                </div>

                {/* Quantity */}
                <div className="flex flex-col items-end justify-between">
                  <button 
                    onClick={() => {
                      for (let i = 0; i < item.quantity; i++) removeFromCart(item.id);
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                  
                  <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-7 h-7 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center transition-colors shadow-sm"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-bold text-sm w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => addToCart(item)}
                      className="w-7 h-7 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Summary & Checkout */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 safe-bottom">
        <div className="max-w-lg mx-auto px-4 py-4">
          {/* Summary */}
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Zwischensumme</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Lieferung</span>
              <span className={deliveryFee === 0 ? 'text-green-500 font-medium' : ''}>
                {deliveryFee === 0 ? 'Gratis' : `${deliveryFee.toFixed(2)} €`}
              </span>
            </div>
            {deliveryFee > 0 && (
              <p className="text-xs text-gray-400">Noch {(20 - subtotal).toFixed(2)}€ bis zur kostenlosen Lieferung</p>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t">
              <span>Gesamt</span>
              <span>{total.toFixed(2)} €</span>
            </div>
          </div>

          {/* Checkout Button */}
          <Link
            to="/checkout"
            className="block w-full bg-primary-500 hover:bg-primary-600 text-white text-center font-semibold py-4 rounded-2xl transition-colors shadow-lg shadow-primary-500/30"
          >
            Zur Kasse ({total.toFixed(2)} €)
          </Link>
        </div>
      </div>
    </div>
  );
}
