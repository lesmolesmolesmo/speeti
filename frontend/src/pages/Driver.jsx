import { useState, useEffect, useCallback, memo, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Package, Truck, CheckCircle, MapPin, Phone, MessageCircle, 
  Navigation, Clock, ChevronRight, Check, X, Send, AlertCircle,
  Bell, RefreshCw, LogOut, Euro, Star, User, Headphones,
  Map, Coffee, Zap, ChevronDown, Menu
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useStore, api } from '../store';

// Lazy load map for performance
const MiniMap = lazy(() => import('../components/MiniMap'));

const statusConfig = {
  confirmed: { label: 'Neu', color: 'bg-amber-500', icon: '🆕' },
  picking: { label: 'Packen', color: 'bg-blue-500', icon: '📦' },
  picked: { label: 'Bereit', color: 'bg-purple-500', icon: '✅' },
  delivering: { label: 'Unterwegs', color: 'bg-rose-500', icon: '🚴' },
  delivered: { label: 'Geliefert', color: 'bg-green-500', icon: '🎉' }
};

// Compact Order Card for List
const OrderCard = memo(({ order, onAccept, onDetails, showAccept, isOnline }) => {
  const status = statusConfig[order.status] || statusConfig.confirmed;
  const itemCount = order.items?.length || 0;
  
  return (
    <div 
      onClick={() => !showAccept && onDetails(order)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{status.icon}</span>
            <div>
              <span className="font-bold text-gray-900">#{order.id}</span>
              <span className={`ml-2 text-xs font-medium text-white px-2 py-0.5 rounded-full ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-gray-900">{order.total?.toFixed(2)} €</p>
            <p className="text-xs text-gray-400">{itemCount} Artikel</p>
          </div>
        </div>

        {/* Customer */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-rose-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {order.customer_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{order.customer_name}</p>
            <p className="text-xs text-gray-500 truncate">{order.street} {order.house_number}</p>
          </div>
          {order.customer_phone && (
            <a 
              href={`tel:${order.customer_phone}`}
              onClick={(e) => e.stopPropagation()}
              className="w-10 h-10 bg-green-500 text-white rounded-xl flex items-center justify-center"
            >
              <Phone size={18} />
            </a>
          )}
        </div>

        {/* Time */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock size={14} />
          <span>{new Date(order.created_at).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })} Uhr</span>
          {order.instructions && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-rose-500 truncate">📝 {order.instructions}</span>
            </>
          )}
        </div>
      </div>

      {/* Accept Button */}
      {showAccept && (
        <button
          onClick={(e) => { e.stopPropagation(); onAccept(order.id); }}
          disabled={!isOnline}
          className={`w-full py-4 font-bold text-center transition-all ${
            isOnline 
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white' 
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          {isOnline ? '🚀 Auftrag annehmen' : '⏸️ Erst online gehen'}
        </button>
      )}
    </div>
  );
});

OrderCard.displayName = 'OrderCard';

export default function Driver() {
  const navigate = useNavigate();
  const user = useStore(state => state.user);
  const logout = useStore(state => state.logout);
  const _hasHydrated = useStore(state => state._hasHydrated);
  
  const [isOnline, setIsOnline] = useState(() => localStorage.getItem('driverOnline') === 'true');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('available');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, earnings: 0, rating: 4.9 });
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return <div className='min-h-screen flex items-center justify-center'><div className='w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin'></div></div>;
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
      
      const today = new Date().toDateString();
      const delivered = data.filter(o => 
        o.driver_id === user?.id && 
        o.status === 'delivered' &&
        new Date(o.delivered_at || o.created_at).toDateString() === today
      );
      setStats({
        today: delivered.length,
        earnings: delivered.reduce((sum, o) => sum + (o.total * 0.1), 0), // 10% commission
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
      // Open the order detail
      const { data } = await api.get(`/orders/${orderId}`);
      setSelectedOrder(data);
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
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Lädt Bestellungen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-br from-rose-500 to-pink-600 text-white pt-safe">
        <div className="px-4 pt-4 pb-6">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Truck size={24} />
              </div>
              <div>
                <p className="text-rose-100 text-sm">Willkommen zurück</p>
                <h1 className="text-xl font-bold">{user?.name}</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Online Toggle */}
              <button
                onClick={toggleOnline}
                className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${
                  isOnline 
                    ? 'bg-green-400 text-green-900 shadow-lg shadow-green-500/30' 
                    : 'bg-white/20 text-white'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-900 animate-pulse' : 'bg-white/50'}`} />
                {isOnline ? 'Online' : 'Offline'}
              </button>
              
              {/* Menu */}
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <Package size={20} className="mx-auto mb-1 opacity-80" />
              <p className="text-2xl font-bold">{stats.today}</p>
              <p className="text-xs text-rose-100">Heute</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <Euro size={20} className="mx-auto mb-1 opacity-80" />
              <p className="text-2xl font-bold">{stats.earnings.toFixed(0)}€</p>
              <p className="text-xs text-rose-100">Verdient</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <Star size={20} className="mx-auto mb-1 opacity-80" />
              <p className="text-2xl font-bold">{stats.rating}</p>
              <p className="text-xs text-rose-100">Bewertung</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/10 mx-4 rounded-t-xl overflow-hidden">
          {[
            { id: 'available', label: 'Verfügbar', count: availableOrders.length, icon: '📋' },
            { id: 'active', label: 'Aktiv', count: myOrders.length, icon: '🚴' },
            { id: 'done', label: 'Fertig', count: completedOrders.length, icon: '✅' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium relative transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-gray-900' 
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-rose-100 text-rose-600' : 'bg-white/20'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Menu Dropdown */}
      {showMenu && (
        <div className="absolute top-20 right-4 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 w-56">
          <Link 
            to="/support" 
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            onClick={() => setShowMenu(false)}
          >
            <Headphones size={20} className="text-gray-400" />
            <span>Support</span>
          </Link>
          <button 
            onClick={() => { logout(); navigate('/'); }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-red-500"
          >
            <LogOut size={20} />
            <span>Abmelden</span>
          </button>
        </div>
      )}

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee size={18} />
            <span className="text-sm">Du bist offline - Zeit für eine Pause? ☕</span>
          </div>
          <button 
            onClick={toggleOnline}
            className="bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium"
          >
            Online gehen
          </button>
        </div>
      )}

      {/* New Order Alert */}
      {availableOrders.length > 0 && activeTab !== 'available' && (
        <button
          onClick={() => setActiveTab('available')}
          className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-3 flex items-center justify-center gap-2 shadow-lg"
        >
          <Bell size={18} className="animate-bounce" />
          <span className="font-bold">{availableOrders.length} neue Bestellung{availableOrders.length > 1 ? 'en' : ''}!</span>
          <ChevronRight size={18} />
        </button>
      )}

      {/* Orders List */}
      <div className="p-4 space-y-4 pb-8">
        {activeTab === 'available' && (
          availableOrders.length > 0 ? (
            availableOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                showAccept
                isOnline={isOnline}
                onAccept={acceptOrder}
                onDetails={openDetails}
              />
            ))
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-5xl">😴</span>
              </div>
              <p className="text-gray-600 font-medium">Keine neuen Bestellungen</p>
              <p className="text-sm text-gray-400 mt-1">Warte auf eingehende Aufträge</p>
            </div>
          )
        )}
        
        {activeTab === 'active' && (
          myOrders.length > 0 ? (
            myOrders.map(order => (
              <OrderCard key={order.id} order={order} onDetails={openDetails} />
            ))
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-5xl">🚴</span>
              </div>
              <p className="text-gray-600 font-medium">Keine aktiven Aufträge</p>
              <p className="text-sm text-gray-400 mt-1">Nimm einen neuen Auftrag an</p>
            </div>
          )
        )}
        
        {activeTab === 'done' && (
          completedOrders.length > 0 ? (
            completedOrders.map(order => (
              <OrderCard key={order.id} order={order} onDetails={openDetails} />
            ))
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-5xl">📭</span>
              </div>
              <p className="text-gray-600 font-medium">Noch keine Lieferungen</p>
              <p className="text-sm text-gray-400 mt-1">Deine abgeschlossenen Aufträge erscheinen hier</p>
            </div>
          )
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50">
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
            {/* Handle */}
            <div className="sticky top-0 bg-white pt-3 pb-2 z-10">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto" />
            </div>

            {/* Header */}
            <div className="px-4 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{statusConfig[selectedOrder.status]?.icon}</span>
                    <h2 className="text-xl font-bold">Bestellung #{selectedOrder.id}</h2>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">{selectedOrder.customer_name}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)} 
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="px-4 py-4 bg-gray-50">
              <div className="flex items-center justify-between">
                {['picking', 'picked', 'delivering', 'delivered'].map((step, i) => {
                  const stepIndex = ['picking', 'picked', 'delivering', 'delivered'].indexOf(selectedOrder.status);
                  const isActive = i <= stepIndex;
                  const isCurrent = selectedOrder.status === step;
                  const labels = ['Packen', 'Bereit', 'Liefern', 'Fertig'];
                  
                  return (
                    <div key={step} className="flex-1 flex items-center">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          isActive ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-400'
                        } ${isCurrent ? 'ring-4 ring-rose-200 scale-110' : ''}`}>
                          {isActive ? <Check size={18} /> : i + 1}
                        </div>
                        <span className={`text-xs mt-1 ${isActive ? 'text-rose-600 font-medium' : 'text-gray-400'}`}>
                          {labels[i]}
                        </span>
                      </div>
                      {i < 3 && (
                        <div className={`flex-1 h-1 mx-2 rounded ${isActive && i < stepIndex ? 'bg-rose-500' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Customer Contact */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-rose-400 to-rose-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {selectedOrder.customer_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{selectedOrder.customer_name}</p>
                    <p className="text-sm text-gray-500">{selectedOrder.customer_phone || 'Keine Nummer'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {selectedOrder.customer_phone && (
                    <a
                      href={`tel:${selectedOrder.customer_phone}`}
                      className="flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl font-medium"
                    >
                      <Phone size={18} /> Anrufen
                    </a>
                  )}
                  <button
                    onClick={() => document.getElementById('chat-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex items-center justify-center gap-2 py-3 bg-rose-500 text-white rounded-xl font-medium"
                  >
                    <MessageCircle size={18} /> Chat
                  </button>
                </div>
              </div>

              {/* Address with Map */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {/* Mini Map */}
                <Suspense fallback={
                  <div className="h-[150px] bg-gray-100 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                  </div>
                }>
                  <MiniMap 
                    address={{
                      street: selectedOrder.street,
                      house_number: selectedOrder.house_number,
                      postal_code: selectedOrder.postal_code,
                      city: selectedOrder.city || 'Münster',
                      lat: selectedOrder.lat,
                      lng: selectedOrder.lng
                    }}
                    height={150}
                  />
                </Suspense>

                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin size={18} className="text-rose-500" />
                        <span className="font-bold">Lieferadresse</span>
                      </div>
                      <p className="font-medium text-gray-900">{selectedOrder.street} {selectedOrder.house_number}</p>
                      <p className="text-gray-500">{selectedOrder.postal_code} {selectedOrder.city || 'Münster'}</p>
                      {selectedOrder.instructions && (
                        <div className="mt-2 p-2 bg-amber-50 rounded-lg">
                          <p className="text-sm text-amber-700">📝 {selectedOrder.instructions}</p>
                        </div>
                      )}
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${selectedOrder.street} ${selectedOrder.house_number}, ${selectedOrder.postal_code} ${selectedOrder.city || 'Münster'}`)}`}
                      target="_blank"
                      className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center flex-shrink-0"
                    >
                      <Navigation size={22} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-bold">Artikel abhaken</span>
                  <span className="text-sm text-gray-500">
                    {selectedOrder.items?.filter(i => i.picked).length}/{selectedOrder.items?.length} ✓
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {selectedOrder.items?.map(item => (
                    <div
                      key={item.id}
                      onClick={() => !item.picked && selectedOrder.status === 'picking' && pickItem(item.id)}
                      className={`flex items-center gap-4 p-4 ${
                        !item.picked && selectedOrder.status === 'picking' ? 'cursor-pointer active:bg-gray-50' : ''
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                        item.picked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                      }`}>
                        {item.picked && <Check size={16} />}
                      </div>
                      <div className="flex-1">
                        <span className={`font-medium ${item.picked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {item.quantity}x {item.name}
                        </span>
                      </div>
                      <span className="font-medium text-gray-500">{(item.price * item.quantity).toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-gray-50 flex justify-between items-center">
                  <span className="font-bold">Gesamt</span>
                  <span className="text-xl font-bold text-rose-500">{selectedOrder.total?.toFixed(2)} €</span>
                </div>
              </div>

              {/* Chat */}
              <div id="chat-section" className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <span className="font-bold">💬 Chat mit Kunde</span>
                </div>
                <div className="p-4 min-h-[120px] max-h-[200px] overflow-y-auto bg-gray-50">
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
                    <p className="text-gray-400 text-sm text-center py-4">Noch keine Nachrichten</p>
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
                  <button 
                    onClick={sendMessage} 
                    disabled={!message.trim()}
                    className="px-4 bg-rose-500 text-white rounded-xl disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {selectedOrder.status !== 'delivered' && (
              <div className="sticky bottom-0 p-4 bg-white border-t border-gray-200">
                {selectedOrder.status === 'picking' && (
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'picked')}
                    disabled={!selectedOrder.items?.every(i => i.picked)}
                    className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 ${
                      selectedOrder.items?.every(i => i.picked)
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {selectedOrder.items?.every(i => i.picked) ? (
                      <><Check size={22} /> Fertig gepackt</>
                    ) : (
                      'Erst alle Artikel abhaken'
                    )}
                  </button>
                )}
                {selectedOrder.status === 'picked' && (
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'delivering')}
                    className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
                  >
                    <Navigation size={22} /> Lieferung starten
                  </button>
                )}
                {selectedOrder.status === 'delivering' && (
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'delivered')}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={22} /> Als geliefert markieren
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
