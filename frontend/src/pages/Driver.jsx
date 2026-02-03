import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Truck, CheckCircle, MapPin, Phone, MessageCircle, 
  Navigation, Clock, ChevronRight, Check, X, Send, AlertCircle,
  Bell, RefreshCw, Power, PhoneCall, Square, LogOut, Route
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useStore, api } from '../store';

const statusLabels = {
  confirmed: { label: 'Neu', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  picking: { label: 'Wird gepackt', bg: 'bg-blue-100', text: 'text-blue-700' },
  picked: { label: 'Bereit', bg: 'bg-purple-100', text: 'text-purple-700' },
  delivering: { label: 'Unterwegs', bg: 'bg-cyan-100', text: 'text-cyan-700' },
  delivered: { label: 'Geliefert', bg: 'bg-green-100', text: 'text-green-700' }
};

// Einfache Order Card ohne Animationen
const OrderCard = memo(({ order, onAccept, onDetails, onNavigate, onCall, showAccept }) => {
  const status = statusLabels[order.status] || statusLabels.confirmed;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">#{order.id}</span>
            {order.status === 'confirmed' && !order.driver_id && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Bell size={10} /> Neu
              </span>
            )}
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.bg} ${status.text}`}>
            {status.label}
          </span>
        </div>

        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Package size={18} className="text-pink-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">{order.customer_name}</p>
            <p className="text-sm text-gray-500">{order.customer_phone || '-'}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{order.total?.toFixed(2)} €</p>
            <p className="text-xs text-gray-400">{order.items?.length || 0} Artikel</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <MapPin size={14} className="text-pink-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">{order.street} {order.house_number}</p>
              <p className="text-xs text-gray-500">{order.postal_code} {order.city}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 p-3 bg-gray-50 flex gap-2">
        {showAccept ? (
          <button
            onClick={() => onAccept(order.id)}
            className="flex-1 bg-pink-500 text-white font-semibold py-2.5 rounded-lg hover:bg-pink-600 transition-colors"
          >
            Annehmen
          </button>
        ) : (
          <>
            <button
              onClick={() => onDetails(order)}
              className="flex-1 bg-white border border-gray-200 font-medium py-2 rounded-lg hover:bg-gray-50"
            >
              Details
            </button>
            <button
              onClick={() => onNavigate(order)}
              className="px-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Navigation size={18} />
            </button>
            <a
              href={`tel:${order.customer_phone}`}
              className="px-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
            >
              <PhoneCall size={18} />
            </a>
          </>
        )}
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';

export default function Driver() {
  const navigate = useNavigate();
  const { user, logout } = useStore();
  
  const [isOnline, setIsOnline] = useState(() => {
    const saved = localStorage.getItem('driverOnline');
    return saved === 'true';
  });
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('available');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Einmaliges Laden
  useEffect(() => {
    if (!user || user.role !== 'driver') {
      navigate('/login?redirect=/driver');
      return;
    }
    
    loadOrders();
    
    const socket = io();
    socket.on('new-order', loadOrders);
    socket.on('order-update', loadOrders);
    
    // Alle 30 Sekunden aktualisieren (nicht 10)
    const interval = setInterval(loadOrders, 30000);
    
    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [user, navigate]);

  const loadOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/orders');
      setOrders(data);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  const toggleOnline = () => {
    const newState = !isOnline;
    setIsOnline(newState);
    localStorage.setItem('driverOnline', String(newState));
  };

  const acceptOrder = async (orderId) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: 'picking' });
      loadOrders();
    } catch (e) {
      alert('Fehler beim Annehmen');
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      loadOrders();
      if (selectedOrder?.id === orderId) {
        const { data } = await api.get(`/orders/${orderId}`);
        setSelectedOrder(data);
      }
    } catch (e) {
      alert('Fehler beim Aktualisieren');
    }
  };

  const pickItem = async (itemId) => {
    if (!selectedOrder) return;
    try {
      await api.patch(`/orders/${selectedOrder.id}/items/${itemId}/pick`);
      const { data } = await api.get(`/orders/${selectedOrder.id}`);
      setSelectedOrder(data);
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedOrder) return;
    try {
      await api.post(`/orders/${selectedOrder.id}/messages`, { message });
      setMessage('');
      const { data } = await api.get(`/orders/${selectedOrder.id}`);
      setSelectedOrder(data);
    } catch (e) {
      console.error(e);
    }
  };

  const openNavigation = (order) => {
    const addr = `${order.street} ${order.house_number}, ${order.postal_code} ${order.city}`;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, '_blank');
  };

  const openDetails = async (order) => {
    try {
      const { data } = await api.get(`/orders/${order.id}`);
      setSelectedOrder(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Filter
  const availableOrders = orders.filter(o => o.status === 'confirmed' && !o.driver_id);
  const myOrders = orders.filter(o => o.driver_id === user?.id && !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders.filter(o => o.driver_id === user?.id && o.status === 'delivered').slice(0, 20);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4 pt-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-pink-100 text-sm">Hallo,</p>
            <h1 className="text-xl font-bold">{user?.name || 'Fahrer'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleOnline}
              className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
                isOnline ? 'bg-green-500' : 'bg-white/20'
              }`}
            >
              <Power size={18} />
              {isOnline ? 'Online' : 'Offline'}
            </button>
            <button onClick={logout} className="p-2 bg-white/20 rounded-lg">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{myOrders.length}</p>
            <p className="text-xs text-pink-100">Aktiv</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{completedOrders.length}</p>
            <p className="text-xs text-pink-100">Heute</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{availableOrders.length}</p>
            <p className="text-xs text-pink-100">Verfügbar</p>
          </div>
        </div>
      </header>

      {/* Offline Warning */}
      {!isOnline && (
        <div className="bg-gray-800 text-white px-4 py-2 text-sm flex items-center justify-between">
          <span>Du bist offline. Gehe online um Aufträge anzunehmen.</span>
          <button onClick={toggleOnline} className="bg-green-500 px-3 py-1 rounded text-sm font-medium">
            Online gehen
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="flex">
          {[
            { id: 'available', label: 'Verfügbar', count: availableOrders.length },
            { id: 'active', label: 'Meine', count: myOrders.length },
            { id: 'done', label: 'Fertig', count: completedOrders.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-pink-100 text-pink-600' : 'bg-gray-100'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Orders */}
      <div className="p-4 space-y-3 pb-20">
        {activeTab === 'available' && availableOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            showAccept={isOnline}
            onAccept={acceptOrder}
            onDetails={openDetails}
            onNavigate={openNavigation}
          />
        ))}
        
        {activeTab === 'active' && myOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onDetails={openDetails}
            onNavigate={openNavigation}
          />
        ))}
        
        {activeTab === 'done' && completedOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onDetails={openDetails}
            onNavigate={openNavigation}
          />
        ))}

        {/* Empty States */}
        {activeTab === 'available' && availableOrders.length === 0 && (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Keine neuen Bestellungen</p>
          </div>
        )}
        {activeTab === 'active' && myOrders.length === 0 && (
          <div className="text-center py-12">
            <Truck size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Keine aktiven Lieferungen</p>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center lg:justify-center">
          <div className="bg-white w-full lg:w-[500px] lg:rounded-xl max-h-[90vh] overflow-y-auto rounded-t-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">Bestellung #{selectedOrder.id}</h2>
                <p className="text-sm text-gray-500">{selectedOrder.customer_name}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Address */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin size={16} className="text-pink-500" /> Lieferadresse
                </h3>
                <p className="font-medium">{selectedOrder.street} {selectedOrder.house_number}</p>
                <p className="text-gray-500">{selectedOrder.postal_code} {selectedOrder.city}</p>
                {selectedOrder.instructions && (
                  <p className="mt-2 text-sm bg-yellow-50 text-yellow-800 p-2 rounded">{selectedOrder.instructions}</p>
                )}
                <button
                  onClick={() => openNavigation(selectedOrder)}
                  className="mt-3 w-full bg-blue-500 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Navigation size={18} /> Navigation starten
                </button>
              </div>

              {/* Items */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Package size={16} className="text-pink-500" /> Artikel
                  <span className="text-sm text-gray-400 ml-auto">
                    {selectedOrder.items?.filter(i => i.picked).length}/{selectedOrder.items?.length} gepackt
                  </span>
                </h3>
                <div className="space-y-2">
                  {selectedOrder.items?.map(item => (
                    <div
                      key={item.id}
                      onClick={() => !item.picked && selectedOrder.status === 'picking' && pickItem(item.id)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        item.picked ? 'bg-green-50' : 'bg-white hover:bg-pink-50'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${
                        item.picked ? 'bg-green-500 text-white' : 'border border-gray-300'
                      }`}>
                        {item.picked && <Check size={14} />}
                      </div>
                      <span className={item.picked ? 'line-through text-gray-400' : ''}>
                        {item.quantity}× {item.name}
                      </span>
                      <span className="ml-auto font-medium">{(item.price * item.quantity).toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between font-bold">
                  <span>Gesamt</span>
                  <span className="text-pink-600">{selectedOrder.total?.toFixed(2)} €</span>
                </div>
              </div>

              {/* Chat */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MessageCircle size={16} className="text-pink-500" /> Chat mit Kunde
                </h3>
                <div className="bg-white rounded-lg p-2 min-h-[80px] max-h-[150px] overflow-y-auto mb-2">
                  {selectedOrder.messages?.length > 0 ? (
                    selectedOrder.messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`mb-2 p-2 rounded-lg text-sm ${
                          msg.sender_id === user?.id
                            ? 'bg-pink-500 text-white ml-8'
                            : 'bg-gray-100 mr-8'
                        }`}
                      >
                        {msg.message}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm text-center py-4">Keine Nachrichten</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Nachricht..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <button onClick={sendMessage} className="px-4 bg-pink-500 text-white rounded-lg">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Action Button */}
            {selectedOrder.status !== 'delivered' && (
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
                {selectedOrder.status === 'picking' && (
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'picked')}
                    disabled={!selectedOrder.items?.every(i => i.picked)}
                    className={`w-full py-3 rounded-xl font-bold ${
                      selectedOrder.items?.every(i => i.picked)
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {selectedOrder.items?.every(i => i.picked) ? 'Fertig gepackt' : 'Erst alle Artikel abhaken'}
                  </button>
                )}
                {selectedOrder.status === 'picked' && (
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'delivering')}
                    className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold"
                  >
                    Lieferung starten
                  </button>
                )}
                {selectedOrder.status === 'delivering' && (
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'delivered')}
                    className="w-full py-3 bg-green-500 text-white rounded-xl font-bold"
                  >
                    Als geliefert markieren
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
