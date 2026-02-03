import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Package, Clock, CheckCircle, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../store';

const statusConfig = {
  pending: { label: 'Wartend', color: 'yellow', icon: Clock },
  confirmed: { label: 'Bestätigt', color: 'blue', icon: Package },
  picking: { label: 'Wird gepackt', color: 'blue', icon: Package },
  picked: { label: 'Bereit', color: 'purple', icon: Package },
  delivering: { label: 'Unterwegs', color: 'primary', icon: Truck },
  delivered: { label: 'Geliefert', color: 'green', icon: CheckCircle },
  cancelled: { label: 'Storniert', color: 'red', icon: Clock }
};

export default function Orders() {
  const { orders, fetchOrders } = useStore();

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Meine Bestellungen</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package size={64} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Noch keine Bestellungen</h2>
            <p className="text-gray-500 mb-6">Bestelle jetzt und lass dir alles liefern</p>
            <Link 
              to="/"
              className="inline-block bg-primary-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary-600 transition-colors"
            >
              Jetzt bestellen
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, i) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/orders/${order.id}`}
                    className="block bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full bg-${status.color}-100 flex items-center justify-center`}>
                          <StatusIcon size={16} className={`text-${status.color}-600`} />
                        </div>
                        <span className={`text-sm font-medium text-${status.color}-600`}>{status.label}</span>
                      </div>
                      <ChevronRight size={20} className="text-gray-400" />
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex -space-x-2">
                        {order.items?.slice(0, 3).map((item, j) => (
                          <div key={j} className="w-10 h-10 bg-gray-100 rounded-lg border-2 border-white overflow-hidden">
                            {item.image ? (
                              <img src={item.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                            )}
                          </div>
                        ))}
                        {order.items?.length > 3 && (
                          <div className="w-10 h-10 bg-gray-200 rounded-lg border-2 border-white flex items-center justify-center text-xs font-bold text-gray-600">
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">
                          {order.items?.length || 0} Artikel
                        </p>
                      </div>
                      <span className="font-bold text-gray-900">{order.total?.toFixed(2)} €</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>#{order.id}</span>
                      <span>{new Date(order.created_at).toLocaleDateString('de-DE', { 
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}</span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
