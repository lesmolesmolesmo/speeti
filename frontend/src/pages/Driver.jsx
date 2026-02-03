import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Truck, CheckCircle, MapPin, Phone, MessageCircle, 
  Navigation, Clock, ChevronRight, Check, X, Send, AlertCircle,
  Home, List, User as UserIcon, Zap, Bell, RefreshCw, Copy,
  ExternalLink, ChevronDown, Route, Timer, DollarSign, Star,
  PhoneCall, MessageSquare, Camera, CheckSquare, Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { useStore, api } from '../store';

const statusConfig = {
  confirmed: { label: 'Bestätigt', color: 'blue', next: 'picking', action: 'Annehmen & Packen' },
  picking: { label: 'Wird gepackt', color: 'indigo', next: 'picked', action: 'Fertig gepackt' },
  picked: { label: 'Bereit', color: 'purple', next: 'delivering', action: 'Lieferung starten' },
  delivering: { label: 'Unterwegs', color: 'primary', next: 'delivered', action: 'Als geliefert markieren' },
  delivered: { label: 'Geliefert', color: 'green', next: null, action: null }
};

export default function Driver() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState('available');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [message, setMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [todayStats, setTodayStats] = useState({ delivered: 0, earnings: 0, rating: 4.9 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'driver') {
      navigate('/login?redirect=/driver');
      return;
    }
    loadOrders();
    
    const s = io();
    s.on('new-order', () => { loadOrders(); playSound(); });
    s.on('order-update', () => loadOrders());
    setSocket(s);
    
    // Refresh every 15 seconds
    const interval = setInterval(loadOrders, 15000);
    
    return () => { s.disconnect(); clearInterval(interval); };
  }, [user]);

  const playSound = () => {
    // Would play notification sound
  };

  const loadOrders = async () => {
    setIsRefreshing(true);
    try {
      const { data } = await api.get('/orders');
      setOrders(data);
      // Calculate today's stats
      const today = new Date().toDateString();
      const todayDelivered = data.filter(o => o.driver_id === user?.id && o.status === 'delivered' && new Date(o.delivered_at).toDateString() === today);
      setTodayStats({
        delivered: todayDelivered.length,
        earnings: todayDelivered.reduce((sum, o) => sum + 2.5, 0), // €2.50 per delivery
        rating: 4.9
      });
    } catch (e) {
      console.error(e);
    }
    setIsRefreshing(false);
  };

  const loadOrderDetails = async (orderId) => {
    const { data } = await api.get(`/orders/${orderId}`);
    setSelectedOrder(data);
  };

  const updateStatus = async (orderId, status) => {
    await api.patch(`/orders/${orderId}/status`, { status });
    loadOrders();
    if (selectedOrder?.id === orderId) {
      loadOrderDetails(orderId);
    }
  };

  const pickItem = async (orderId, itemId) => {
    await api.patch(`/orders/${orderId}/items/${itemId}/pick`);
    loadOrderDetails(orderId);
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedOrder) return;
    await api.post(`/orders/${selectedOrder.id}/messages`, { message });
    setMessage('');
    loadOrderDetails(selectedOrder.id);
  };

  const availableOrders = orders.filter(o => o.status === 'confirmed' && !o.driver_id);
  const myOrders = orders.filter(o => o.driver_id === user?.id && !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders.filter(o => o.driver_id === user?.id && o.status === 'delivered');

  // ============ ORDER CARD ============
  const OrderCard = ({ order, showAccept }) => {
    const status = statusConfig[order.status];
    const itemCount = order.items?.length || 0;
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">#{order.id}</span>
              {order.status === 'confirmed' && !order.driver_id && (
                <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full animate-pulse">
                  <Bell size={10} /> Neu
                </span>
              )}
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold bg-${status?.color}-100 text-${status?.color}-700`}>
              {status?.label}
            </span>
          </div>

          {/* Customer Info */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <UserIcon size={18} className="text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{order.customer_name}</p>
              <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1 text-sm text-primary-600">
                <Phone size={12} /> {order.customer_phone || 'Keine Nummer'}
              </a>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-gray-900">{order.total?.toFixed(2)}€</p>
              <p className="text-xs text-gray-400">{itemCount} Artikel</p>
            </div>
          </div>

          {/* Address - FULL */}
          <div className="bg-gray-50 rounded-xl p-3 mb-3">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-primary-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{order.street} {order.house_number}</p>
                <p className="text-sm text-gray-600">{order.postal_code} {order.city}</p>
                {order.instructions && (
                  <p className="text-xs text-primary-600 mt-1 bg-primary-50 px-2 py-1 rounded inline-block">
                    📝 {order.instructions}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${order.street} ${order.house_number}, ${order.postal_code} ${order.city}`); }}
                  className="p-2 hover:bg-gray-200 rounded-lg text-gray-500"
                  title="Kopieren"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {new Date(order.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
            </span>
            <span className="flex items-center gap-1">
              <Package size={12} />
              {order.items?.length || 0} Artikel
            </span>
            <span className="flex items-center gap-1">
              <DollarSign size={12} />
              {order.payment_method === 'cash' ? 'Bar' : 'Karte'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 p-3 bg-gray-50 flex gap-2">
          {showAccept ? (
            <button
              onClick={() => updateStatus(order.id, 'picking')}
              className="flex-1 bg-primary-500 text-white font-semibold py-3 rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
            >
              <Zap size={18} /> Annehmen & Packen
            </button>
          ) : (
            <>
              <button
                onClick={() => { setSelectedOrder(order); loadOrderDetails(order.id); }}
                className="flex-1 bg-white border border-gray-200 font-medium py-2.5 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                Details <ChevronRight size={16} />
              </button>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${order.street} ${order.house_number}, ${order.postal_code} ${order.city}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 bg-blue-500 text-white rounded-xl flex items-center justify-center hover:bg-blue-600"
              >
                <Navigation size={18} />
              </a>
              <a href={`tel:${order.customer_phone}`} className="px-4 bg-green-500 text-white rounded-xl flex items-center justify-center hover:bg-green-600">
                <PhoneCall size={18} />
              </a>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  // ============ ORDER DETAIL VIEW ============
  const OrderDetailView = () => {
    if (!selectedOrder) return null;

    const status = statusConfig[selectedOrder.status];
    const allPicked = selectedOrder.items?.every(i => i.picked);
    const canProceed = selectedOrder.status !== 'picking' || allPicked;

    return (
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="fixed inset-0 bg-gray-50 z-50 flex flex-col"
      >
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-4 flex items-center gap-4">
          <button onClick={() => setSelectedOrder(null)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <X size={24} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg">Bestellung #{selectedOrder.id}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full bg-${status?.color}-100 text-${status?.color}-700`}>
                {status?.label}
              </span>
            </div>
            <p className="text-sm text-gray-500">{selectedOrder.customer_name}</p>
          </div>
          <a href={`tel:${selectedOrder.customer_phone}`} className="p-3 bg-green-500 text-white rounded-xl">
            <PhoneCall size={20} />
          </a>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Progress Steps */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              {Object.entries(statusConfig).slice(0, -1).map(([key, val], i) => {
                const isActive = Object.keys(statusConfig).indexOf(selectedOrder.status) >= i;
                const isCurrent = selectedOrder.status === key;
                return (
                  <div key={key} className="flex-1 flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isActive ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'
                    } ${isCurrent ? 'ring-4 ring-primary-200 scale-110' : ''}`}>
                      {isActive ? <Check size={14} /> : i + 1}
                    </div>
                    {i < 3 && <div className={`flex-1 h-1 mx-1 ${isActive ? 'bg-primary-500' : 'bg-gray-200'}`} />}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 px-1">
              <span>Angenommen</span>
              <span>Gepackt</span>
              <span>Unterwegs</span>
              <span>Geliefert</span>
            </div>
          </div>

          {/* Customer & Address */}
          <div className="bg-white rounded-2xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="text-primary-500" size={18} /> Lieferadresse
            </h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-bold text-lg">{selectedOrder.street} {selectedOrder.house_number}</p>
              <p className="text-gray-600">{selectedOrder.postal_code} {selectedOrder.city}</p>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="font-medium">{selectedOrder.customer_name}</p>
                <p className="text-sm text-gray-500">{selectedOrder.customer_phone}</p>
              </div>
              {selectedOrder.instructions && (
                <div className="mt-3 p-3 bg-primary-50 rounded-lg">
                  <p className="text-sm text-primary-800">
                    <strong>📝 Hinweis:</strong> {selectedOrder.instructions}
                  </p>
                </div>
              )}
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex gap-2 mt-4">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${selectedOrder.street} ${selectedOrder.house_number}, ${selectedOrder.postal_code} ${selectedOrder.city}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white py-3 rounded-xl font-medium hover:bg-blue-600"
              >
                <Navigation size={18} /> Google Maps
              </a>
              <a
                href={`https://waze.com/ul?q=${encodeURIComponent(`${selectedOrder.street} ${selectedOrder.house_number}, ${selectedOrder.postal_code} ${selectedOrder.city}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-cyan-500 text-white py-3 rounded-xl font-medium hover:bg-cyan-600"
              >
                <Route size={18} /> Waze
              </a>
            </div>
          </div>

          {/* Items - Picking Mode */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package className="text-primary-500" size={18} /> Artikel
              </h3>
              <span className="text-sm text-gray-500">
                {selectedOrder.items?.filter(i => i.picked).length || 0}/{selectedOrder.items?.length || 0} gepackt
              </span>
            </div>
            
            <div className="space-y-2">
              {selectedOrder.items?.map(item => (
                <div 
                  key={item.id}
                  onClick={() => !item.picked && selectedOrder.status === 'picking' && pickItem(selectedOrder.id, item.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    item.picked 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    item.picked ? 'bg-green-500 text-white' : 'bg-gray-100'
                  }`}>
                    {item.picked ? <Check size={16} /> : <Square size={16} className="text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${item.picked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {item.quantity}× {item.name}
                    </p>
                    <p className="text-xs text-gray-500">{item.unit}</p>
                  </div>
                  <span className="font-semibold text-gray-900">{(item.price * item.quantity).toFixed(2)}€</span>
                </div>
              ))}
            </div>

            {/* Order Total */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Zwischensumme</span>
                <span>{selectedOrder.subtotal?.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Lieferung</span>
                <span>{selectedOrder.delivery_fee?.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Gesamt</span>
                <span className="text-primary-600">{selectedOrder.total?.toFixed(2)}€</span>
              </div>
              <div className="mt-2 text-center">
                <span className={`text-sm px-3 py-1 rounded-full ${selectedOrder.payment_method === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {selectedOrder.payment_method === 'cash' ? '💵 Barzahlung' : '💳 Kartenzahlung'}
                </span>
              </div>
            </div>
          </div>

          {/* Chat */}
          <div className="bg-white rounded-2xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MessageCircle className="text-primary-500" size={18} /> Chat mit Kunde
            </h3>
            
            <div className="max-h-40 overflow-y-auto space-y-2 mb-4 bg-gray-50 rounded-xl p-3 min-h-[80px]">
              {selectedOrder.messages?.length > 0 ? selectedOrder.messages.map(msg => (
                <div 
                  key={msg.id}
                  className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.sender_id === user?.id 
                      ? 'ml-auto bg-primary-500 text-white rounded-br-md' 
                      : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                  }`}
                >
                  <p className="text-[10px] opacity-70 mb-0.5">{msg.sender_name}</p>
                  {msg.message}
                </div>
              )) : (
                <p className="text-gray-400 text-sm text-center py-4">Noch keine Nachrichten</p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Nachricht schreiben..."
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button onClick={sendMessage} className="px-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600">
                <Send size={18} />
              </button>
            </div>

            {/* Quick Messages */}
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {['Bin gleich da! 🚗', 'Suche Parkplatz', 'Stehe vor der Tür', 'Brauche 5 Min'].map(msg => (
                <button
                  key={msg}
                  onClick={() => { setMessage(msg); }}
                  className="flex-shrink-0 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-full hover:bg-gray-200"
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Action */}
        {status?.next && (
          <div className="p-4 bg-white border-t border-gray-200">
            <button
              onClick={() => updateStatus(selectedOrder.id, status.next)}
              disabled={!canProceed}
              className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                canProceed 
                  ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/30' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {!canProceed ? (
                <>
                  <AlertCircle size={22} /> Erst alle Artikel abhaken
                </>
              ) : (
                <>
                  {status.next === 'picked' && <CheckCircle size={22} />}
                  {status.next === 'delivering' && <Truck size={22} />}
                  {status.next === 'delivered' && <Star size={22} />}
                  {status.action}
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  // ============ MAIN RENDER ============
  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary-600 to-teal-500 pt-10 pb-6 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />
        <div className="max-w-lg mx-auto relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-primary-100 text-sm">Hallo,</p>
              <h1 className="text-2xl font-bold text-white">{user?.name || 'Fahrer'} 👋</h1>
            </div>
            <button 
              onClick={loadOrders}
              className={`p-3 bg-white/20 rounded-xl ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={20} className="text-white" />
            </button>
          </div>
          
          {/* Today's Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{todayStats.delivered}</p>
              <p className="text-xs text-white/80">Lieferungen</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{todayStats.earnings.toFixed(0)}€</p>
              <p className="text-xs text-white/80">Verdient</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white flex items-center justify-center gap-1">
                <Star size={16} className="text-yellow-300 fill-yellow-300" /> {todayStats.rating}
              </p>
              <p className="text-xs text-white/80">Bewertung</p>
            </div>
          </div>
        </div>
      </header>

      {/* Pending Alert */}
      {availableOrders.length > 0 && activeTab !== 'available' && (
        <div className="bg-yellow-500 text-yellow-900 px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <Bell size={16} className="animate-bounce" /> {availableOrders.length} neue Bestellung(en)!
          </span>
          <button onClick={() => setActiveTab('available')} className="text-sm font-bold underline">
            Anzeigen
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex">
            {[
              { id: 'available', label: 'Verfügbar', count: availableOrders.length },
              { id: 'active', label: 'Meine', count: myOrders.length },
              { id: 'completed', label: 'Fertig', count: completedOrders.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-primary-500 text-primary-600' 
                    : 'border-transparent text-gray-500'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-primary-100 text-primary-600' : 'bg-gray-100'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {activeTab === 'available' && availableOrders.map(order => (
            <OrderCard key={order.id} order={order} showAccept />
          ))}
          {activeTab === 'active' && myOrders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
          {activeTab === 'completed' && completedOrders.slice(0, 10).map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
        </AnimatePresence>

        {/* Empty States */}
        {activeTab === 'available' && availableOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Keine neuen Bestellungen</p>
            <p className="text-sm text-gray-400 mt-1">Warte auf eingehende Bestellungen...</p>
          </div>
        )}
        {activeTab === 'active' && myOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Keine aktiven Lieferungen</p>
            <p className="text-sm text-gray-400 mt-1">Nimm eine Bestellung an, um loszulegen!</p>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          <button onClick={() => setActiveTab('available')} className={`flex flex-col items-center ${activeTab === 'available' ? 'text-primary-600' : 'text-gray-400'}`}>
            <Home size={22} />
            <span className="text-[10px] mt-0.5">Home</span>
          </button>
          <button onClick={() => setActiveTab('active')} className={`flex flex-col items-center relative ${activeTab === 'active' ? 'text-primary-600' : 'text-gray-400'}`}>
            <Truck size={22} />
            <span className="text-[10px] mt-0.5">Aktiv</span>
            {myOrders.length > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {myOrders.length}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab('completed')} className={`flex flex-col items-center ${activeTab === 'completed' ? 'text-primary-600' : 'text-gray-400'}`}>
            <CheckCircle size={22} />
            <span className="text-[10px] mt-0.5">Fertig</span>
          </button>
          <button className="flex flex-col items-center text-gray-400">
            <UserIcon size={22} />
            <span className="text-[10px] mt-0.5">Profil</span>
          </button>
        </div>
      </nav>

      {/* Order Detail Overlay */}
      <AnimatePresence>
        {selectedOrder && <OrderDetailView />}
      </AnimatePresence>
    </div>
  );
}
