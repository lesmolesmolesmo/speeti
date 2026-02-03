import { useEffect, useState } from 'react';
import { CheckCircle, ShoppingBag } from 'lucide-react';

// Global toast state
let toastListeners = [];
let toastId = 0;

export function showToast(message, type = 'success') {
  const id = ++toastId;
  toastListeners.forEach(listener => listener({ id, message, type }));
  return id;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const listener = (toast) => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 2500);
    };
    
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-down min-w-[200px]"
          style={{
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          {toast.type === 'cart' ? (
            <ShoppingBag size={18} className="text-rose-400" />
          ) : (
            <CheckCircle size={18} className="text-green-400" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
