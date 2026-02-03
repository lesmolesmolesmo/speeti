import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { useStore } from '../store';

export default function CartButton() {
  const location = useLocation();
  const { cart, getCartTotal, getCartCount } = useStore();
  
  const count = getCartCount();
  const total = getCartTotal();
  
  // Nicht auf Cart/Checkout Seiten zeigen
  if (['/cart', '/checkout'].includes(location.pathname) || count === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto lg:hidden">
      <Link
        to="/cart"
        className="flex items-center justify-between bg-rose-500 text-white rounded-2xl p-4 shadow-lg hover:bg-rose-600 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingBag size={24} />
            <span className="absolute -top-2 -right-2 bg-white text-rose-500 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {count}
            </span>
          </div>
          <span className="font-semibold">Warenkorb ansehen</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="font-bold">{total.toFixed(2).replace('.', ',')} €</span>
          <ChevronRight size={20} />
        </div>
      </Link>
    </div>
  );
}
