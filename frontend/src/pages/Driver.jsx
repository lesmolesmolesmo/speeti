import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Truck, CheckCircle, MapPin, Phone, MessageCircle, 
  Navigation, Clock, ChevronRight, Check, X, Send, AlertCircle,
  Bell, RefreshCw, Power, PhoneCall, LogOut, Zap, TrendingUp,
  Timer, Euro, Star, ChevronUp, ChevronDown
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useStore, api } from '../store';

const statusConfig = {
  confirmed: { label: 'Neu', color: 'bg-amber-500' },
  picking: { label: 'Packen', color: 'bg-blue-500' },
  picked: { label: 'Bereit', color: 'bg-purple-500' },
  delivering: { label: 'Unterwegs', color: 'bg-cyan-500' },
  delivered: { label: 'Geliefert', color: 'bg-green-500' }
};

// Modern Order Card
const OrderCard = memo(({ order, onAccept, onDetails, showAccept, isOnline }) => {
  const status = statusConfig[order.status] || statusConfig.confirmed;
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Top Section */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">#{order.id}</span>
              <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${status.color}`}>
                {status.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date(order.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900">{order.total?.toFixed(2)} €</p>
            <p className="text-xs text-gray-400">{order.items?.length || 0} Artikel</p>
          </div>
        </div>

        {/* Customer */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-rose-600 rounded-full flex items-center justify-center text-white font-bold">
            {order.customer_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{order.customer_name}</p>
            <p className="text-sm text-gray-500 truncate">{order.customer_phone || 'Keine Nummer'}</p>
          </div>
          {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} className="p-2 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition-colors">
              <Phone size={18} />
            </a>
          )}
        </div>

        {/* Address */}
        <div className="flex items-start gap-2">
          <MapPin size={16} className="text-rose-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{order.street} {order.house_number}</p>
            <p className="text-xs text-gray-500">{order.postal_code} {order.city}</p>
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${order.street} ${order.house_number}, ${order.postal_code} ${order.city}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors"
          >
            <Navigation size={16} />
          </a>
        </div>
      </div>

      {/* Action Button */}
      <div className="border-t border-gray-100">
        {showAccept ? (
          <button
            onClick={() => onAccept(order.id)}
            disabled={!isOnline}
            className={`w-full py-4 font-semibold text-center transition-colors ${
              isOnline 
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600' 
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {isOnline ? 'Auftrag annehmen' : 'Erst online gehen'}
          </button>
        ) : (
          <button
            onClick={() => onDetails(order)}
            className="w-full py-4 font-semibold text-rose-500 hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
          >
            Details ansehen
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';

export default function Driver() {
  const navigate = useNavigate();
  const { user, logout } = useStore();
  
  const [isOnline, setIsOnline] = useState(() => localStorage.getItem('driverOnline') === 'true');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('available');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, earnings: 0, rating: 4.9 });

  useEffect(() => {
    if (!user || user.role !== 'driver') {
      navigate('/login?redirect=/driver');
      return;
    }
    
    loadOrders();
    
    const socket = io();
    socket.on('new-order', loadOrders);
    socket.on('order-update', loadOrders);
    
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
      
      // Calculate stats
      const today = new Date().toDateString();
      const delivered = data.filter(o => 
        o.driver_id === user?.id && 
        o.status === 'delivered' &&
        new Date(o.updated_at || o.created_at).toDateString() === today
      );
      setStats({
        today: delivered.length,
        earnings: delivered.length * 2.5,
        rating: 4.9
      });
      
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  }, [user?.id]);

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
      alert('Fehler');
    }
  };

  const pickItem = async (itemId) => {
    if (!selectedOrder) return;
    try {
      await api.patch(`/orders/${selectedOrder.id}/items/${itemId}/pick`);
      const { data } = await api.get(`/orders/${selectedOrder.id}`);
      setSelectedOrder(data);
    } catch (e) {}
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedOrder) return;
    try {
      await api.post(`/orders/${selectedOrder.id}/messages`, { message });
      setMessage('');
      const { data } = await api.get(`/orders/${selectedOrder.id}`);
      setSelectedOrder(data);
    } catch (e) {}
  };

  const openDetails = async (order) => {
    const { data } = await api.get(`/orders/${order.id}`);
    setSelectedOrder(data);
  };

  // Filter
  const availableOrders = orders.filter(o => o.status === 'confirmed' && !o.driver_id);
  const myOrders = orders.filter(o => o.driver_id === user?.id && !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders.filter(o => o.driver_id === user?.id && o.status === 'delivered').slice(0, 20);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 pt-12 pb-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500">Willkommen</p>
              <h1 className="text-xl font-bold text-gray-900">{user?.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleOnline}
                className={`px-4 py-2.5 rounded-full font-medium flex items-center gap-2 transition-all ${
                  isOnline 
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
                {isOnline ? 'Online' : 'Offline'}
              </button>
              <button onClick={logout} className="p-2.5 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200">
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package size={16} className="text-rose-500" />
                <span className="text-xs text-gray-500">Heute</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Euro size={16} className="text-green-500" />
                <span className="text-xs text-gray-500">Verdient</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.earnings.toFixed(0)}€</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Star size={16} className="text-amber-500" />
                <span className="text-xs text-gray-500">Bewertung</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.rating}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-gray-100">
          {[
            { id: 'available', label: 'Verfügbar', count: availableOrders.length },
            { id: 'active', label: 'Aktiv', count: myOrders.length },
            { id: 'done', label: 'Fertig', count: completedOrders.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3.5 text-sm font-medium relative transition-colors ${
                activeTab === tab.id ? 'text-rose-500' : 'text-gray-500'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-rose-100 text-rose-600' : 'bg-gray-100'
                }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span className="text-sm">Du bist offline</span>
          </div>
          <button onClick={toggleOnline} className="bg-green-500 text-white px-4 py-1.5 rounded-full text-sm font-medium">
            Online gehen
          </button>
        </div>
      )}

      {/* New Order Alert */}
      {availableOrders.length > 0 && activeTab !== 'available' && (
        <button
          onClick={() => setActiveTab('available')}
          className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white px-4 py-3 flex items-center justify-center gap-2"
        >
          <Bell size={18} className="animate-bounce" />
          <span className="font-medium">{availableOrders.length} neue Bestellung{availableOrders.length > 1 ? 'en' : ''}</span>
          <ChevronRight size={18} />
        </button>
      )}

      {/* Orders List */}
      <div className="p-4 space-y-4 pb-24">
        {activeTab === 'available' && availableOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            showAccept
            isOnline={isOnline}
            onAccept={acceptOrder}
            onDetails={openDetails}
          />
        ))}
        
        {activeTab === 'active' && myOrders.map(order => (
          <OrderCard key={order.id} order={order} onDetails={openDetails} />
        ))}
        
        {activeTab === 'done' && completedOrders.map(order => (
          <OrderCard key={order.id} order={order} onDetails={openDetails} />
        ))}

        {/* Empty States */}
        {activeTab === 'available' && availableOrders.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Keine neuen Bestellungen</p>
            <p className="text-sm text-gray-400 mt-1">Warte auf eingehende Aufträge</p>
          </div>
        )}
        {activeTab === 'active' && myOrders.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Keine aktiven Aufträge</p>
            <p className="text-sm text-gray-400 mt-1">Nimm einen neuen Auftrag an</p>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold">Bestellung #{selectedOrder.id}</h2>
                <p className="text-sm text-gray-500">{selectedOrder.customer_name}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            {/* Progress */}
            <div className="px-4 py-4 bg-gray-50">
              <div className="flex items-center justify-between">
                {['picking', 'picked', 'delivering', 'delivered'].map((step, i) => {
                  const stepIndex = ['picking', 'picked', 'delivering', 'delivered'].indexOf(selectedOrder.status);
                  const isActive = i <= stepIndex;
                  const isCurrent = selectedOrder.status === step;
                  return (
                    <div key={step} className="flex-1 flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isActive ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-rose-200' : ''}`}>
                        {isActive ? <Check size={14} /> : i + 1}
                      </div>
                      {i < 3 && <div className={`flex-1 h-1 mx-1 ${isActive ? 'bg-rose-500' : 'bg-gray-200'}`} />}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-2 px-1">
                <span>Packen</span>
                <span>Bereit</span>
                <span>Liefern</span>
                <span>Fertig</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Address Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{selectedOrder.street} {selectedOrder.house_number}</p>
                    <p className="text-sm text-gray-500">{selectedOrder.postal_code} {selectedOrder.city}</p>
                    {selectedOrder.instructions && (
                      <p className="text-sm text-amber-600 mt-2 bg-amber-50 px-2 py-1 rounded inline-block">
                        {selectedOrder.instructions}
                      </p>
                    )}
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${selectedOrder.street} ${selectedOrder.house_number}, ${selectedOrder.postal_code} ${selectedOrder.city}`)}`}
                    target="_blank"
                    className="p-3 bg-blue-500 text-white rounded-xl"
                  >
                    <Navigation size={20} />
                  </a>
                </div>
              </div>

              {/* Items */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold">Artikel</span>
                  <span className="text-sm text-gray-500">
                    {selectedOrder.items?.filter(i => i.picked).length}/{selectedOrder.items?.length}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {selectedOrder.items?.map(item => (
                    <div
                      key={item.id}
                      onClick={() => !item.picked && selectedOrder.status === 'picking' && pickItem(item.id)}
                      className={`flex items-center gap-3 p-4 ${
                        !item.picked && selectedOrder.status === 'picking' ? 'cursor-pointer hover:bg-gray-50' : ''
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                        item.picked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                      }`}>
                        {item.picked && <Check size={14} />}
                      </div>
                      <span className={`flex-1 ${item.picked ? 'text-gray-400 line-through' : ''}`}>
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-medium">{(item.price * item.quantity).toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-gray-50 flex justify-between items-center font-bold">
                  <span>Gesamt</span>
                  <span className="text-lg text-rose-500">{selectedOrder.total?.toFixed(2)} €</span>
                </div>
              </div>

              {/* Chat */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <span className="font-semibold">Chat mit Kunde</span>
                </div>
                <div className="p-4 min-h-[100px] max-h-[150px] overflow-y-auto bg-gray-50">
                  {selectedOrder.messages?.length > 0 ? (
                    selectedOrder.messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`mb-2 p-3 rounded-2xl text-sm max-w-[80%] ${
                          msg.sender_id === user?.id
                            ? 'bg-rose-500 text-white ml-auto rounded-br-sm'
                            : 'bg-white border border-gray-200 rounded-bl-sm'
                        }`}
                      >
                        {msg.message}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm text-center py-4">Keine Nachrichten</p>
                  )}
                </div>
                <div className="p-3 border-t border-gray-100 flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Nachricht schreiben..."
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button onClick={sendMessage} className="px-4 bg-rose-500 text-white rounded-xl">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Action Button */}
            {selectedOrder.status !== 'delivered' && (
              <div className="p-4 border-t border-gray-100 bg-white">
                {selectedOrder.status === 'picking' && (
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'picked')}
                    disabled={!selectedOrder.items?.every(i => i.picked)}
                    className={`w-full py-4 rounded-2xl font-bold text-lg ${
                      selectedOrder.items?.every(i => i.picked)
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {selectedOrder.items?.every(i => i.picked) ? 'Fertig gepackt' : 'Erst alle Artikel abhaken'}
                  </button>
                )}
                {selectedOrder.status === 'picked' && (
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'delivering')}
                    className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-bold text-lg"
                  >
                    Lieferung starten
                  </button>
                )}
                {selectedOrder.status === 'delivering' && (
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'delivered')}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold text-lg"
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
