import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, ChevronRight } from "lucide-react";
import { useStore } from "../store";
import { useEffect, useState, useRef } from "react";

export default function CartButton() {
  const location = useLocation();
  const cart = useStore(state => state.cart);
  const getCartTotal = useStore(state => state.getCartTotal);
  const getCartCount = useStore(state => state.getCartCount);
  const [animate, setAnimate] = useState(false);
  const prevCountRef = useRef(0);
  
  const count = getCartCount();
  const total = getCartTotal();

  // Animation wenn Anzahl steigt - using ref to avoid infinite loop
  useEffect(() => {
    if (count > prevCountRef.current && count > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 300);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = count;
  }, [count]);
  
  // Nicht auf Cart/Checkout Seiten zeigen
  if (["/cart", "/checkout"].includes(location.pathname) || count === 0) {
    return null;
  }

  return (
    <div className={`fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto lg:hidden transition-transform ${animate ? "scale-105" : "scale-100"}`}>
      <Link
        to="/cart"
        className={`flex items-center justify-between bg-rose-500 text-white rounded-2xl p-4 shadow-xl transition-all ${animate ? "ring-4 ring-rose-300" : ""}`}
      >
        <div className="flex items-center gap-3">
          <div className={`relative ${animate ? "animate-bounce" : ""}`}>
            <ShoppingBag size={24} />
            <span className={`absolute -top-2 -right-2 bg-white text-rose-500 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center transition-transform ${animate ? "scale-125" : "scale-100"}`}>
              {count}
            </span>
          </div>
          <span className="font-semibold">Warenkorb ansehen</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="font-bold">{total.toFixed(2).replace(".", ",")} €</span>
          <ChevronRight size={20} />
        </div>
      </Link>
    </div>
  );
}
