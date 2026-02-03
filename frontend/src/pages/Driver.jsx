import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Truck, CheckCircle, MapPin, Phone, MessageCircle, 
  Navigation, Clock, ChevronRight, Check, X, Send, AlertCircle,
  Home, List, User as UserIcon, Zap, Bell, RefreshCw, Copy,
  ExternalLink, Route, Timer, DollarSign, Star, Play, Pause,
  PhoneCall, Square, Power, MapPinned, ArrowRight, ChevronDown,
  ChevronUp, Layers, RotateCcw, Menu, Settings, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { useStore, api } from '../store';

const statusConfig = {
  confirmed: { label: 'Neu', color: 'yellow', icon: Bell },
  picking: { label: 'Wird gepackt', color: 'indigo', icon: Package },
  picked: { label: 'Bereit', color: 'purple', icon: CheckCircle },
  delivering: { label: 'Unterwegs', color: 'blue', icon: Truck },
  delivered: { label: 'Geliefert', color: 'green', icon: Check }
};

export default function Driver() {
  const navigate = useNavigate();
  const { user, logout } = useStore();
  
  // Driver state
  const [isOnline, setIsOnline] = useState(false);
  const [shiftStart, setShiftStart] = useState(null);
  const [shiftDuration, setShiftDuration] = useState(0);
  
  // Orders
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedForRoute, setSelectedForRoute] = useState([]);
  const [showRoutePanel, setShowRoutePanel] = useState(false);
  
  // UI
  const [activeTab, setActiveTab] = useState('available');
  const [message, setMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Stats
  const [todayStats, setTodayStats] = useState({ delivered: 0, earnings: 0, rating: 4.9, distance: 0 });

  useEffect(() => {
    if (!user || user.role !== 'driver') {
      navigate('/login?redirect=/driver');
      return;
    }
    
    // Load saved shift state
    const savedShift = localStorage.getItem('driverShift');
    if (savedShift) {
      const { start, online } = JSON.parse(savedShift);
      if (online) {
        setIsOnline(true);
        setShiftStart(new Date(start));
      }
    }

    loadOrders();
    
    const s = io();
    s.on('new-order', () => { loadOrders(); playNotification(); });
    s.on('order-update', () => loadOrders());
    setSocket(s);
    
    const interval = setInterval(loadOrders, 10000);
    
    return () => { s.disconnect(); clearInterval(interval); };
  }, [user]);

  // Update shift duration every second
  useEffect(() => {
    if (!shiftStart || !isOnline) return;
    const interval = setInterval(() => {
      setShiftDuration(Math.floor((Date.now() - shiftStart.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [shiftStart, isOnline]);

  const playNotification = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6enp2bmY+Ffm90eYGJjo2Mi4qIh4WDgYB+fX18fHx8fX5/gIKDhYeJi42PkZOVl5mbnZ+hoqSkpaWlpKOioJ6cmpiWlJKQjo2LiYiGhYSDgoGAgH9/fn5+fn5/f4CAgYKDhIWGh4iJiouMjY6Pj5CQkZGRkZGQkI+Pjo2NjIuKiomIh4aFhIOCgYCAf39+fn5+fn5/f4CAgYGCg4OEhYaGh4iIiYmKiouLi4uLi4uLioqJiYiIh4aGhYSEg4KCgYGAgIB/f39/f39/f4CAgIGBgYKCgoODhISEhYWFhoaGhoaGhoaGhYWFhYSEhIODg4KCgoGBgYCAgICAf39/f39/f4CAgICBgYGBgoKCgoODg4ODhISEhISEhISEhIODg4ODgoKCgoKBgYGBgYCAgICAgH9/f39/f4CAgICAgYGBgYGCgoKCgoKCgoKCgoKCgoKCgoKCgoKBgYGBgYGBgYGAgICAgICAgICAgICAgICAgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYCAgICAgICAgICAgA==');
      audio.play();
    } catch (e) {}
  };

  const toggleOnline = () => {
    const newState = !isOnline;
    setIsOnline(newState);
    
    if (newState) {
      const start = new Date();
      setShiftStart(start);
      setShiftDuration(0);
      localStorage.setItem('driverShift', JSON.stringify({ start: start.toISOString(), online: true }));
    } else {
      setShiftStart(null);
      localStorage.removeItem('driverShift');
    }
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const loadOrders = async () => {
    setIsRefreshing(true);
    try {
      const { data } = await api.get('/orders');
      setOrders(data);
      
      // Calculate today's stats
      const today = new Date().toDateString();
      const todayDelivered = data.filter(o => 
        o.driver_id === user?.id && 
        o.status === 'delivered' && 
        new Date(o.updated_at || o.created_at).toDateString() === today
      );
      setTodayStats({
        delivered: todayDelivered.length,
        earnings: todayDelivered.length * 2.5,
        rating: 4.9,
        distance: todayDelivered.length * 2.3
      });
    } catch (e) {
      console.error(e);
    }
    setIsRefreshing(false);
  };

  const loadOrderDetails = async (orderId) => {
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setSelectedOrder(data);
    } catch (e) {
      console.error(e);
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: 'picking' });
      loadOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      loadOrders();
      if (selectedOrder?.id === orderId) {
        loadOrderDetails(orderId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pickItem = async (orderId, itemId) => {
    try {
      await api.patch(`/orders/${orderId}/items/${itemId}/pick`);
      loadOrderDetails(orderId);
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedOrder) return;
    try {
      await api.post(`/orders/${selectedOrder.id}/messages`, { message });
      setMessage('');
      loadOrderDetails(selectedOrder.id);
    } catch (e) {
      console.error(e);
    }
  };

  // Route Planning
  const toggleRouteSelection = (order) => {
    setSelectedForRoute(prev => 
      prev.find(o => o.id === order.id)
        ? prev.filter(o => o.id !== order.id)
        : [...prev, order]
    );
  };

  const openOptimizedRoute = () => {
    if (selectedForRoute.length === 0) return;
    
    // Build Google Maps URL with multiple waypoints
    const waypoints = selectedForRoute.map(o => 
      encodeURIComponent(`${o.street} ${o.house_number}, ${o.postal_code} ${o.city}`)
    );
    
    // Google Maps Directions with multiple stops
    const origin = 'current+location';
    const destination = waypoints[waypoints.length - 1];
    const waypointsParam = waypoints.length > 1 
      ? waypoints.slice(0, -1).join('|') 
      : '';
    
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsParam ? `&waypoints=${waypointsParam}` : ''}&travelmode=driving`;
    
    window.open(url, '_blank');
  };

  // Filter orders
  const availableOrders = orders.filter(o => o.status === 'confirmed' && !o.driver_id);
  const myOrders = orders.filter(o => o.driver_id === user?.id && !['delivered', 'cancelled'].includes(o.status));
  const readyToDeliver = myOrders.filter(o => ['picked', 'delivering'].includes(o.status));
  const completedOrders = orders.filter(o => o.driver_id === user?.id && o.status === 'delivered');

  // ============ DESKTOP SIDEBAR ============
  const DesktopSidebar = () => (
    <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-gray-200 h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center">
            <Truck className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Speeti Driver</h1>
            <p className="text-xs text-gray-500">Fahrer-Dashboard</p>
          </div>
        </div>
      </div>

      {/* Online Toggle */}
      <div className="p-4 border-b border-gray-100">
        <button
          onClick={toggleOnline}
          className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${
            isOnline 
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <Power size={24} />
            <div className="text-left">
              <p className="font-bold">{isOnline ? 'Online' : 'Offline'}</p>
              {isOnline && <p className="text-xs opacity-80">{formatDuration(shiftDuration)}</p>}
            </div>
          </div>
          <div className={`w-12 h-7 rounded-full p-1 transition-colors ${isOnline ? 'bg-green-600' : 'bg-gray-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${isOnline ? 'translate-x-5' : ''}`} />
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {[
          { id: 'available', label: 'Verfügbare Aufträge', icon: Bell, count: availableOrders.length, color: 'yellow' },
          { id: 'active', label: 'Meine Aufträge', icon: Package, count: myOrders.length, color: 'blue' },
          { id: 'completed', label: 'Abgeschlossen', icon: CheckCircle, count: completedOrders.length, color: 'green' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === item.id 
                ? 'bg-primary-500 text-white shadow-lg' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <item.icon size={20} />
            <span className="flex-1 text-left font-medium">{item.label}</span>
            {item.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === item.id 
                  ? 'bg-white/20 text-white' 
                  : `bg-${item.color}-100 text-${item.color}-700`
              }`}>
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Today's Stats */}
      <div className="p-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Heute</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{todayStats.delivered}</p>
            <p className="text-xs text-gray-500">Lieferungen</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{todayStats.earnings.toFixed(0)}€</p>
            <p className="text-xs text-gray-500">Verdient</p>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <UserIcon size={20} className="text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500">Fahrer</p>
          </div>
          <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );

  // ============ ORDER CARD ============
  const OrderCard = ({ order, showAccept, selectable }) => {
    const status = statusConfig[order.status];
    const StatusIcon = status?.icon || Package;
    const isSelected = selectedForRoute.find(o => o.id === order.id);
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all ${
          isSelected ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-100 hover:border-gray-200'
        }`}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {selectable && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleRouteSelection(order); }}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'bg-primary-500 border-primary-500 text-white' : 'border-gray-300'
                  }`}
                >
                  {isSelected && <Check size={14} />}
                </button>
              )}
              <div>
                <span className="text-lg font-bold text-gray-900">#{order.id}</span>
                {order.status === 'confirmed' && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full animate-pulse">
                    <Bell size={10} /> Neu
                  </span>
                )}
              </div>
            </div>
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold bg-${status?.color}-100 text-${status?.color}-700`}>
              <StatusIcon size={12} />
              {status?.label}
            </div>
          </div>

          {/* Customer */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <UserIcon size={18} className="text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{order.customer_name}</p>
              <p className="text-sm text-gray-500">{order.customer_phone || 'Keine Nummer'}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-gray-900">{order.total?.toFixed(2)}€</p>
              <p className="text-xs text-gray-400">{order.items?.length || '?'} Artikel</p>
            </div>
          </div>

          {/* Address */}
          <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
            <MapPin size={16} className="text-primary-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{order.street} {order.house_number}</p>
              <p className="text-sm text-gray-600">{order.postal_code} {order.city}</p>
            </div>
          </div>

          {/* Time & Payment */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {new Date(order.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className={`px-2 py-0.5 rounded-full ${order.payment_method === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {order.payment_method === 'cash' ? '💵 Bar' : '💳 Karte'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 p-3 bg-gray-50 flex gap-2">
          {showAccept ? (
            <button
              onClick={() => acceptOrder(order.id)}
              disabled={!isOnline}
              className={`flex-1 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                isOnline 
                  ? 'bg-primary-500 text-white hover:bg-primary-600' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Zap size={18} /> {isOnline ? 'Annehmen' : 'Erst online gehen'}
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

  // ============ ROUTE PLANNER PANEL ============
  const RoutePlannerPanel = () => (
    <AnimatePresence>
      {selectedForRoute.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 lg:bottom-4 left-4 right-4 lg:left-80 lg:right-4 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-40"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <Route className="text-primary-600" size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-900">Route planen</p>
                <p className="text-sm text-gray-500">{selectedForRoute.length} Stopps ausgewählt</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedForRoute([])}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {/* Selected orders preview */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            {selectedForRoute.map((order, i) => (
              <div key={order.id} className="flex-shrink-0 flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span className="text-sm font-medium">#{order.id}</span>
                <button
                  onClick={() => toggleRouteSelection(order)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={openOptimizedRoute}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all"
          >
            <Navigation size={20} />
            Route in Google Maps öffnen
            <ArrowRight size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ============ ORDER DETAIL ============
  const OrderDetailView = () => {
    if (!selectedOrder) return null;

    const status = statusConfig[selectedOrder.status];
    const allPicked = selectedOrder.items?.every(i => i.picked);
    const canProceed = selectedOrder.status !== 'picking' || allPicked;

    const getNextAction = () => {
      switch (selectedOrder.status) {
        case 'picking': return { next: 'picked', label: 'Fertig gepackt', icon: CheckCircle, disabled: !allPicked };
        case 'picked': return { next: 'delivering', label: 'Lieferung starten', icon: Truck, disabled: false };
        case 'delivering': return { next: 'delivered', label: 'Als geliefert markieren', icon: Star, disabled: false };
        default: return null;
      }
    };

    const action = getNextAction();

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 lg:hidden" onClick={() => setSelectedOrder(null)} />
        
        {/* Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          className="ml-auto w-full lg:w-[500px] bg-white h-full flex flex-col relative"
        >
          {/* Header */}
          <header className="bg-white border-b border-gray-200 p-4 flex items-center gap-4">
            <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full">
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
            <a href={`tel:${selectedOrder.customer_phone}`} className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600">
              <PhoneCall size={20} />
            </a>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Progress */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                {['picking', 'picked', 'delivering', 'delivered'].map((step, i) => {
                  const stepConfig = statusConfig[step];
                  const StepIcon = stepConfig.icon;
                  const isActive = ['picking', 'picked', 'delivering', 'delivered'].indexOf(selectedOrder.status) >= i;
                  const isCurrent = selectedOrder.status === step;
                  return (
                    <div key={step} className="flex-1 flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isActive ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-primary-200 scale-110' : ''}`}>
                        <StepIcon size={18} />
                      </div>
                      {i < 3 && <div className={`flex-1 h-1 mx-2 ${isActive ? 'bg-primary-500' : 'bg-gray-200'}`} />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="text-primary-500" size={18} /> Lieferadresse
              </h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-bold text-lg">{selectedOrder.street} {selectedOrder.house_number}</p>
                <p className="text-gray-600">{selectedOrder.postal_code} {selectedOrder.city}</p>
                {selectedOrder.instructions && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">📝 {selectedOrder.instructions}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-4">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${selectedOrder.street} ${selectedOrder.house_number}, ${selectedOrder.postal_code} ${selectedOrder.city}`)}`}
                  target="_blank"
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white py-3 rounded-xl font-medium hover:bg-blue-600"
                >
                  <Navigation size={18} /> Navigation
                </a>
                <button
                  onClick={() => navigator.clipboard.writeText(`${selectedOrder.street} ${selectedOrder.house_number}, ${selectedOrder.postal_code} ${selectedOrder.city}`)}
                  className="px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="text-primary-500" size={18} /> Artikel packen
                </h3>
                <span className="text-sm text-gray-500">
                  {selectedOrder.items?.filter(i => i.picked).length || 0}/{selectedOrder.items?.length || 0}
                </span>
              </div>
              
              <div className="space-y-2">
                {selectedOrder.items?.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => !item.picked && selectedOrder.status === 'picking' && pickItem(selectedOrder.id, item.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      item.picked 
                        ? 'border-green-300 bg-green-50' 
                        : selectedOrder.status === 'picking'
                          ? 'border-gray-200 hover:border-primary-300 hover:bg-primary-50 cursor-pointer'
                          : 'border-gray-100 bg-gray-50'
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
                    </div>
                    <span className="font-semibold">{(item.price * item.quantity).toFixed(2)}€</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="font-bold text-lg">Gesamt</span>
                <span className="text-2xl font-bold text-primary-600">{selectedOrder.total?.toFixed(2)}€</span>
              </div>
            </div>

            {/* Chat */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MessageCircle className="text-primary-500" size={18} /> Chat
              </h3>
              
              <div className="max-h-32 overflow-y-auto space-y-2 mb-3 bg-gray-50 rounded-xl p-3 min-h-[60px]">
                {selectedOrder.messages?.length > 0 ? selectedOrder.messages.map(msg => (
                  <div 
                    key={msg.id}
                    className={`max-w-[80%] p-2 rounded-xl text-sm ${
                      msg.sender_id === user?.id 
                        ? 'ml-auto bg-primary-500 text-white' 
                        : 'bg-white text-gray-900 shadow-sm'
                    }`}
                  >
                    {msg.message}
                  </div>
                )) : (
                  <p className="text-gray-400 text-sm text-center py-2">Keine Nachrichten</p>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Nachricht..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button onClick={sendMessage} className="px-4 bg-primary-500 text-white rounded-xl">
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Action Button */}
          {action && (
            <div className="p-4 bg-white border-t border-gray-200">
              <button
                onClick={() => updateStatus(selectedOrder.id, action.next)}
                disabled={action.disabled}
                className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                  action.disabled 
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-primary-500 to-teal-500 text-white hover:shadow-lg'
                }`}
              >
                {action.disabled ? (
                  <><AlertCircle size={22} /> Erst alle Artikel abhaken</>
                ) : (
                  <><action.icon size={22} /> {action.label}</>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    );
  };

  // ============ MOBILE HEADER ============
  const MobileHeader = () => (
    <header className="lg:hidden bg-gradient-to-br from-orange-500 to-red-500 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />
      
      <div className="relative p-4 pt-10">
        {/* Online Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Truck className="text-white" size={24} />
            </div>
            <div>
              <p className="text-white/70 text-sm">Hallo,</p>
              <h1 className="text-xl font-bold text-white">{user?.name}</h1>
            </div>
          </div>
          
          <button
            onClick={toggleOnline}
            className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-all ${
              isOnline 
                ? 'bg-green-500 text-white' 
                : 'bg-white/20 text-white'
            }`}
          >
            <Power size={18} />
            <span className="font-semibold">{isOnline ? 'Online' : 'Offline'}</span>
          </button>
        </div>

        {/* Shift Timer */}
        {isOnline && (
          <div className="bg-white/20 backdrop-blur rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer size={18} className="text-white/80" />
              <span className="text-white/80 text-sm">Schichtzeit:</span>
            </div>
            <span className="text-white font-mono font-bold text-lg">{formatDuration(shiftDuration)}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{todayStats.delivered}</p>
            <p className="text-xs text-white/70">Lieferungen</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{todayStats.earnings.toFixed(0)}€</p>
            <p className="text-xs text-white/70">Verdient</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white flex items-center justify-center gap-1">
              <Star size={16} className="text-yellow-300 fill-yellow-300" /> {todayStats.rating}
            </p>
            <p className="text-xs text-white/70">Bewertung</p>
          </div>
        </div>
      </div>
    </header>
  );

  // ============ MAIN RENDER ============
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Desktop Sidebar */}
      <DesktopSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:h-screen lg:overflow-hidden">
        {/* Mobile Header */}
        <MobileHeader />

        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between p-6 bg-white border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab === 'available' && 'Verfügbare Aufträge'}
              {activeTab === 'active' && 'Meine Aufträge'}
              {activeTab === 'completed' && 'Abgeschlossene Aufträge'}
            </h1>
            <p className="text-gray-500">
              {activeTab === 'available' && `${availableOrders.length} neue Aufträge warten`}
              {activeTab === 'active' && `${myOrders.length} aktive Lieferungen`}
              {activeTab === 'completed' && `${completedOrders.length} heute abgeschlossen`}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {activeTab === 'active' && readyToDeliver.length > 1 && (
              <button
                onClick={() => setSelectedForRoute(readyToDeliver)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-medium hover:bg-blue-200"
              >
                <Route size={18} />
                Alle {readyToDeliver.length} Stopps planen
              </button>
            )}
            <button
              onClick={loadOrders}
              className={`p-3 bg-gray-100 rounded-xl hover:bg-gray-200 ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </header>

        {/* Alert for new orders */}
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

        {/* Offline Warning */}
        {!isOnline && activeTab === 'available' && (
          <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
            <span className="text-sm flex items-center gap-2">
              <AlertCircle size={16} /> Du bist offline. Gehe online um Aufträge anzunehmen.
            </span>
            <button onClick={toggleOnline} className="bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold">
              Online gehen
            </button>
          </div>
        )}

        {/* Mobile Tabs */}
        <div className="lg:hidden bg-white shadow-sm sticky top-0 z-30">
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
                  activeTab === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'
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

        {/* Orders Grid */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-4xl mx-auto lg:max-w-none">
            {/* Multi-select hint */}
            {activeTab === 'active' && readyToDeliver.length > 1 && (
              <div className="lg:hidden mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 flex items-center gap-2">
                <Route size={16} />
                <span>Tipp: Wähle mehrere Aufträge aus für eine optimierte Route!</span>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {activeTab === 'available' && availableOrders.map(order => (
                  <OrderCard key={order.id} order={order} showAccept />
                ))}
                {activeTab === 'active' && myOrders.map(order => (
                  <OrderCard key={order.id} order={order} selectable={['picked', 'delivering'].includes(order.status)} />
                ))}
                {activeTab === 'completed' && completedOrders.slice(0, 20).map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </AnimatePresence>
            </div>

            {/* Empty States */}
            {activeTab === 'available' && availableOrders.length === 0 && (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package size={40} className="text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium text-lg">Keine neuen Bestellungen</p>
                <p className="text-sm text-gray-400 mt-1">Warte auf eingehende Bestellungen...</p>
              </div>
            )}
            {activeTab === 'active' && myOrders.length === 0 && (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck size={40} className="text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium text-lg">Keine aktiven Lieferungen</p>
                <p className="text-sm text-gray-400 mt-1">Nimm einen Auftrag an, um loszulegen!</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
          <div className="flex justify-around items-center h-16">
            <button onClick={() => setActiveTab('available')} className={`flex flex-col items-center ${activeTab === 'available' ? 'text-primary-600' : 'text-gray-400'}`}>
              <Bell size={22} />
              <span className="text-[10px] mt-0.5">Aufträge</span>
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
            <button onClick={() => navigate('/profile')} className="flex flex-col items-center text-gray-400">
              <UserIcon size={22} />
              <span className="text-[10px] mt-0.5">Profil</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Route Planner Panel */}
      <RoutePlannerPanel />

      {/* Order Detail */}
      <AnimatePresence>
        {selectedOrder && <OrderDetailView />}
      </AnimatePresence>
    </div>
  );
}
