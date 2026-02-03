import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Grid3X3, ShoppingBag, Users, Truck, Settings, 
  Plus, Edit2, Trash2, Search, X, Save, Eye, EyeOff,
  TrendingUp, DollarSign, Clock, CheckCircle, AlertCircle, MapPin, Phone,
  Calendar, BarChart3, ArrowUpRight, ArrowDownRight, Filter, Download,
  Printer, RefreshCw, Bell, ChevronDown, ChevronRight, Copy, ExternalLink,
  Image, Tag, Scale, Barcode, Info, Percent, Box, Thermometer, Headphones,
  MessageCircle, Bot, User, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, api } from '../store';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Bestellungen', icon: ShoppingBag, badge: true },
  { id: 'products', label: 'Produkte', icon: Package },
  { id: 'categories', label: 'Kategorien', icon: Grid3X3 },
  { id: 'drivers', label: 'Fahrer', icon: Truck },
  { id: 'customers', label: 'Kunden', icon: Users },
  { id: 'support', label: 'Support', icon: Headphones, supportBadge: true },
  { id: 'analytics', label: 'Statistiken', icon: BarChart3 },
  { id: 'settings', label: 'Einstellungen', icon: Settings },
];

const orderStatuses = {
  pending: { label: 'Neu', color: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  confirmed: { label: 'Bestätigt', color: 'blue', bg: 'bg-blue-100', text: 'text-blue-700' },
  picking: { label: 'Wird gepackt', color: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  picked: { label: 'Gepackt', color: 'purple', bg: 'bg-purple-100', text: 'text-purple-700' },
  delivering: { label: 'Unterwegs', color: 'primary', bg: 'bg-primary-100', text: 'text-primary-700' },
  delivered: { label: 'Geliefert', color: 'green', bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { label: 'Storniert', color: 'red', bg: 'bg-red-100', text: 'text-red-700' }
};

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({});
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderFilter, setOrderFilter] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [supportTickets, setSupportTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [supportReply, setSupportReply] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login?redirect=/admin');
      return;
    }
    loadData();
    // Auto refresh every 30s
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const loadData = async () => {
    try {
      const [statsRes, ordersRes, productsRes, catsRes, usersRes, supportRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/orders'),
        api.get('/products'),
        api.get('/categories'),
        api.get('/admin/users'),
        api.get('/admin/support').catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
      setProducts(productsRes.data);
      setCategories(catsRes.data);
      setUsers(usersRes.data);
      setSupportTickets(supportRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const pendingCount = orders.filter(o => ['pending', 'confirmed', 'picking'].includes(o.status)).length;
  const escalatedCount = supportTickets.filter(t => t.escalated && t.status === 'open').length;

  // ============ DASHBOARD ============
  const DashboardTab = () => (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-teal-500 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Willkommen zurück! </h1>
        <p className="text-white/80">Hier ist dein Überblick für heute.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Bestellungen heute" value={stats.orders_today || 0} trend="+12%" trendUp />
        <StatCard icon={DollarSign} label="Umsatz heute" value={`${(stats.revenue_today || 0).toFixed(2)}€`} trend="+8%" trendUp />
        <StatCard icon={AlertCircle} label="Offene Bestellungen" value={stats.pending_orders || 0} highlight />
        <StatCard icon={Users} label="Neue Kunden" value={stats.total_customers || 0} trend="+5%" trendUp />
      </div>

      {/* Live Orders */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h3 className="font-semibold">Live Bestellungen</h3>
          </div>
          <button onClick={() => setActiveTab('orders')} className="text-primary-600 text-sm font-medium">
            Alle anzeigen →
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').slice(0, 5).map(order => (
            <OrderRow key={order.id} order={order} compact onClick={() => { setSelectedOrder(order); setActiveTab('orders'); }} />
          ))}
          {orders.filter(o => o.status !== 'delivered').length === 0 && (
            <div className="p-8 text-center text-gray-400">
              <CheckCircle size={40} className="mx-auto mb-2 opacity-50" />
              <p>Keine offenen Bestellungen</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickAction icon={Plus} label="Neues Produkt" onClick={() => { setEditItem(null); setShowModal('product'); }} />
        <QuickAction icon={Truck} label="Neuer Fahrer" onClick={() => { setEditItem(null); setShowModal('driver'); }} />
        <QuickAction icon={Grid3X3} label="Neue Kategorie" onClick={() => { setEditItem(null); setShowModal('category'); }} />
        <QuickAction icon={Download} label="Bericht exportieren" />
      </div>
    </div>
  );

  const StatCard = ({ icon: Icon, label, value, trend, trendUp, highlight }) => (
    <div className={`rounded-2xl p-5 ${highlight ? 'bg-yellow-50 border-2 border-yellow-200' : 'bg-white shadow-sm'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${highlight ? 'bg-yellow-200' : 'bg-gray-100'}`}>
          <Icon size={20} className={highlight ? 'text-yellow-700' : 'text-gray-600'} />
        </div>
        {trend && (
          <span className={`text-xs font-semibold flex items-center gap-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );

  const QuickAction = ({ icon: Icon, label, onClick }) => (
    <button onClick={onClick} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-3 text-left">
      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
        <Icon size={20} className="text-primary-600" />
      </div>
      <span className="font-medium text-sm text-gray-700">{label}</span>
    </button>
  );

  // ============ ORDERS ============
  const OrderRow = ({ order, compact, onClick }) => {
    const status = orderStatuses[order.status] || orderStatuses.pending;
    return (
      <div 
        onClick={onClick}
        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${compact ? '' : 'border-b border-gray-100'}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-gray-900">#{order.id}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}>
                {status.label}
              </span>
              {order.status === 'pending' && (
                <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                  <Bell size={10} /> Neu!
                </span>
              )}
            </div>
            <p className="font-medium text-gray-800">{order.customer_name}</p>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Phone size={12} /> {order.customer_phone || 'Keine Nr.'}
              </span>
              <span className="flex items-center gap-1">
                <Package size={12} /> {order.items?.length || 0} Artikel
              </span>
            </div>
            {/* Full Address */}
            <div className="flex items-start gap-1 mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
              <MapPin size={14} className="text-primary-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">{order.street} {order.house_number}</p>
                <p>{order.postal_code} {order.city}</p>
                {order.instructions && (
                  <p className="text-xs text-primary-600 mt-1">📝 {order.instructions}</p>
                )}
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-lg text-gray-900">{order.total?.toFixed(2)}€</p>
            <p className="text-xs text-gray-400">
              {new Date(order.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
            </p>
          </div>
        </div>
      </div>
    );
  };

  const OrdersTab = () => {
    const filteredOrders = orders.filter(o => orderFilter === 'all' || o.status === orderFilter);
    
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Bestellungen</h2>
            <p className="text-sm text-gray-500">{orders.length} Bestellungen insgesamt</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="p-2 hover:bg-gray-100 rounded-lg">
              <RefreshCw size={18} />
            </button>
            <select 
              value={orderFilter} 
              onChange={(e) => setOrderFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Alle Status</option>
              {Object.entries(orderStatuses).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Object.entries(orderStatuses).map(([key, val]) => {
            const count = orders.filter(o => o.status === key).length;
            return (
              <button
                key={key}
                onClick={() => setOrderFilter(key === orderFilter ? 'all' : key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  orderFilter === key ? `${val.bg} ${val.text}` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {val.label}
                <span className="bg-white/50 px-1.5 rounded-full text-xs">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <ShoppingBag size={48} className="mx-auto mb-3 opacity-50" />
              <p>Keine Bestellungen gefunden</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredOrders.map(order => (
                <div key={order.id} className="p-4 hover:bg-gray-50">
                  <OrderRow order={order} onClick={() => setSelectedOrder(order)} />
                  
                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <select 
                      value={order.status}
                      onChange={async (e) => {
                        await api.patch(`/orders/${order.id}/status`, { status: e.target.value });
                        loadData();
                      }}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {Object.entries(orderStatuses).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                      <Printer size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        const addr = `${order.street} ${order.house_number}, ${order.postal_code} ${order.city}`;
                        navigator.clipboard.writeText(addr);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                      title="Adresse kopieren"
                    >
                      <Copy size={16} />
                    </button>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.street} ${order.house_number}, ${order.postal_code} ${order.city}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                      title="In Maps öffnen"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============ PRODUCTS ============
  const ProductsTab = () => {
    const filteredProducts = products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Produkte</h2>
            <p className="text-sm text-gray-500">{products.length} Produkte im Sortiment</p>
          </div>
          <button
            onClick={() => { setEditItem(null); setShowModal('product'); }}
            className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
          >
            <Plus size={20} /> Neues Produkt
          </button>
        </div>

        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Produkt suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Produkt</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kategorie</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Preis</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Bestand</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {product.image ? (
                          <img src={product.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} className="text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.unit_amount} {product.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{product.category_name}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{product.price.toFixed(2)}€</td>
                  <td className="px-4 py-3 text-sm">{product.stock_count || '∞'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${product.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {product.in_stock ? 'Verfügbar' : 'Ausverkauft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditItem(product); setShowModal('product'); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={async () => { if(confirm('Löschen?')) { await api.delete(`/admin/products/${product.id}`); loadData(); }}} className="p-2 hover:bg-red-50 rounded-lg text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============ PRODUCT MODAL - FULL FEATURED ============
  const ProductModal = () => {
    const [form, setForm] = useState(editItem || {
      name: '',
      description: '',
      price: '',
      original_price: '',
      category_id: categories[0]?.id,
      unit: 'Stück',
      unit_amount: '1',
      image: '',
      sku: '',
      ean: '',
      weight: '',
      weight_unit: 'g',
      stock_count: 100,
      min_order: 1,
      max_order: 99,
      tax_rate: 19,
      deposit: 0,
      storage_temp: '',
      allergens: '',
      ingredients: '',
      nutrition_info: '',
      origin: '',
      brand: '',
      featured: false,
      in_stock: true,
      visible: true
    });
    const [activeSection, setActiveSection] = useState('basic');

    const sections = [
      { id: 'basic', label: 'Basis', icon: Info },
      { id: 'pricing', label: 'Preise', icon: Tag },
      { id: 'inventory', label: 'Bestand', icon: Box },
      { id: 'details', label: 'Details', icon: Barcode },
      { id: 'nutrition', label: 'Nährwerte', icon: Scale },
    ];

    const handleSubmit = async (e) => {
      e.preventDefault();
      const data = { ...form, price: parseFloat(form.price), original_price: form.original_price ? parseFloat(form.original_price) : null };
      if (editItem) {
        await api.put(`/admin/products/${editItem.id}`, data);
      } else {
        await api.post('/admin/products', data);
      }
      setShowModal(null);
      loadData();
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div>
              <h2 className="text-lg font-bold">{editItem ? 'Produkt bearbeiten' : 'Neues Produkt anlegen'}</h2>
              <p className="text-sm text-gray-500">Fülle alle relevanten Felder aus</p>
            </div>
            <button onClick={() => setShowModal(null)} className="p-2 hover:bg-gray-200 rounded-full">
              <X size={20} />
            </button>
          </div>

          {/* Section Tabs */}
          <div className="flex border-b border-gray-200 px-4 bg-white">
            {sections.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeSection === sec.id 
                    ? 'border-primary-500 text-primary-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <sec.icon size={16} />
                {sec.label}
              </button>
            ))}
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            {activeSection === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Produktname *</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="z.B. Bio Vollmilch 3,5%"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                    <textarea value={form.description || ''} onChange={(e) => setForm({...form, description: e.target.value})} rows={3}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Produktbeschreibung für Kunden..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie *</label>
                    <select value={form.category_id} onChange={(e) => setForm({...form, category_id: parseInt(e.target.value)})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marke</label>
                    <input type="text" value={form.brand || ''} onChange={(e) => setForm({...form, brand: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="z.B. Weihenstephan"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bild-URL</label>
                    <div className="flex gap-2">
                      <input type="url" value={form.image || ''} onChange={(e) => setForm({...form, image: e.target.value})}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="https://..."
                      />
                      {form.image && (
                        <div className="w-12 h-12 border border-gray-200 rounded-xl overflow-hidden">
                          <img src={form.image} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'pricing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Verkaufspreis (€) *</label>
                    <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Streichpreis (€)</label>
                    <input type="number" step="0.01" value={form.original_price || ''} onChange={(e) => setForm({...form, original_price: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Alter Preis für Rabatt-Anzeige"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">MwSt. (%)</label>
                    <select value={form.tax_rate} onChange={(e) => setForm({...form, tax_rate: parseInt(e.target.value)})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value={19}>19% (Standard)</option>
                      <option value={7}>7% (Ermäßigt)</option>
                      <option value={0}>0% (Steuerfrei)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pfand (€)</label>
                    <input type="number" step="0.01" value={form.deposit || ''} onChange={(e) => setForm({...form, deposit: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tipp:</strong> Setze einen Streichpreis um Rabatte anzuzeigen. Der Rabatt wird automatisch berechnet.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'inventory' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Einheit</label>
                    <select value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="Stück">Stück</option>
                      <option value="kg">Kilogramm (kg)</option>
                      <option value="g">Gramm (g)</option>
                      <option value="L">Liter (L)</option>
                      <option value="ml">Milliliter (ml)</option>
                      <option value="Bund">Bund</option>
                      <option value="Packung">Packung</option>
                      <option value="Flasche">Flasche</option>
                      <option value="Dose">Dose</option>
                      <option value="Glas">Glas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Menge pro Einheit</label>
                    <input type="text" value={form.unit_amount} onChange={(e) => setForm({...form, unit_amount: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="z.B. 500, 1, 6x0.33"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lagerbestand</label>
                    <input type="number" value={form.stock_count} onChange={(e) => setForm({...form, stock_count: parseInt(e.target.value)})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mindestbestellmenge</label>
                    <input type="number" value={form.min_order} onChange={(e) => setForm({...form, min_order: parseInt(e.target.value)})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maximalbestellmenge</label>
                    <input type="number" value={form.max_order} onChange={(e) => setForm({...form, max_order: parseInt(e.target.value)})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lagertemperatur</label>
                    <select value={form.storage_temp || ''} onChange={(e) => setForm({...form, storage_temp: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Normal</option>
                      <option value="kühl">Kühlware (2-7°C)</option>
                      <option value="tiefkühl">Tiefkühl (-18°C)</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.in_stock} onChange={(e) => setForm({...form, in_stock: e.target.checked})} className="w-4 h-4 rounded" />
                    <span className="text-sm">Auf Lager</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.featured} onChange={(e) => setForm({...form, featured: e.target.checked})} className="w-4 h-4 rounded" />
                    <span className="text-sm">Als "Beliebt" anzeigen</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.visible !== false} onChange={(e) => setForm({...form, visible: e.target.checked})} className="w-4 h-4 rounded" />
                    <span className="text-sm">Sichtbar im Shop</span>
                  </label>
                </div>
              </div>
            )}

            {activeSection === 'details' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Artikelnummer</label>
                    <input type="text" value={form.sku || ''} onChange={(e) => setForm({...form, sku: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="z.B. MILK-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">EAN / Barcode</label>
                    <input type="text" value={form.ean || ''} onChange={(e) => setForm({...form, ean: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="z.B. 4012345678901"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gewicht</label>
                    <div className="flex gap-2">
                      <input type="number" value={form.weight || ''} onChange={(e) => setForm({...form, weight: e.target.value})}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="0"
                      />
                      <select value={form.weight_unit} onChange={(e) => setForm({...form, weight_unit: e.target.value})}
                        className="px-3 py-2.5 border border-gray-200 rounded-xl"
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="L">L</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Herkunft</label>
                    <input type="text" value={form.origin || ''} onChange={(e) => setForm({...form, origin: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="z.B. Deutschland, Bayern"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'nutrition' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zutaten</label>
                  <textarea value={form.ingredients || ''} onChange={(e) => setForm({...form, ingredients: e.target.value})} rows={3}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Vollständige Zutatenliste..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allergene</label>
                  <input type="text" value={form.allergens || ''} onChange={(e) => setForm({...form, allergens: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="z.B. Milch, Gluten, Nüsse"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nährwerte (pro 100g/ml)</label>
                  <textarea value={form.nutrition_info || ''} onChange={(e) => setForm({...form, nutrition_info: e.target.value})} rows={4}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Brennwert: 250 kJ / 60 kcal&#10;Fett: 3,5 g&#10;Kohlenhydrate: 4,8 g&#10;Eiweiß: 3,3 g"
                  />
                </div>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <button type="button" onClick={() => setShowModal(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-xl">
              Abbrechen
            </button>
            <button onClick={handleSubmit} className="px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 flex items-center gap-2">
              <Save size={18} /> {editItem ? 'Speichern' : 'Produkt anlegen'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  // ============ CATEGORIES ============
  const CategoriesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Kategorien ({categories.length})</h2>
        <button onClick={() => { setEditItem(null); setShowModal('category'); }} className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-xl hover:bg-primary-600">
          <Plus size={20} /> Neue Kategorie
        </button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: cat.color + '20' }}>{cat.icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold">{cat.name}</h3>
                <p className="text-xs text-gray-500">/{cat.slug}</p>
                <p className="text-xs text-gray-400">{products.filter(p => p.category_id === cat.id).length} Produkte</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditItem(cat); setShowModal('category'); }} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Bearbeiten</button>
              <button onClick={async () => { if(confirm('Löschen?')) { await api.delete(`/admin/categories/${cat.id}`); loadData(); }}} className="px-4 py-2 border border-red-200 text-red-500 rounded-xl hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============ DRIVERS ============
  const DriversTab = () => {
    const drivers = users.filter(u => u.role === 'driver');
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Fahrer ({drivers.length})</h2>
          <button onClick={() => { setEditItem(null); setShowModal('driver'); }} className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-xl hover:bg-primary-600">
            <Plus size={20} /> Neuer Fahrer
          </button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map(driver => (
            <div key={driver.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
                  <Truck className="text-primary-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold">{driver.name}</h3>
                  <p className="text-sm text-gray-500">{driver.email}</p>
                  <p className="text-sm text-gray-500">{driver.phone}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============ CUSTOMERS ============
  const CustomersTab = () => {
    const customers = users.filter(u => u.role === 'customer');
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Kunden ({customers.length})</h2>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kunde</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kontakt</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Registriert</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Bestellungen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <p>{u.email}</p>
                    <p className="text-gray-400">{u.phone || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString('de-DE')}</td>
                  <td className="px-4 py-3 text-sm">{orders.filter(o => o.user_id === u.id).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============ SETTINGS ============
  const SettingsTab = () => (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-bold">Einstellungen</h2>
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold border-b pb-2">Shop-Einstellungen</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Shop-Name</label><input type="text" defaultValue="Speeti" className="w-full px-4 py-2 border rounded-xl" /></div>
          <div><label className="block text-sm font-medium mb-1">Slogan</label><input type="text" defaultValue="Blitzschnell bei dir" className="w-full px-4 py-2 border rounded-xl" /></div>
          <div><label className="block text-sm font-medium mb-1">Liefergebühr (€)</label><input type="number" defaultValue="2.99" step="0.01" className="w-full px-4 py-2 border rounded-xl" /></div>
          <div><label className="block text-sm font-medium mb-1">Gratis ab (€)</label><input type="number" defaultValue="20" className="w-full px-4 py-2 border rounded-xl" /></div>
          <div><label className="block text-sm font-medium mb-1">Mindestbestellwert (€)</label><input type="number" defaultValue="10" className="w-full px-4 py-2 border rounded-xl" /></div>
          <div><label className="block text-sm font-medium mb-1">Lieferzeit (Min)</label><input type="text" defaultValue="15-20" className="w-full px-4 py-2 border rounded-xl" /></div>
          <div><label className="block text-sm font-medium mb-1">Öffnungszeiten</label><input type="text" defaultValue="08:00-22:00" className="w-full px-4 py-2 border rounded-xl" /></div>
          <div><label className="block text-sm font-medium mb-1">Liefergebiet</label><input type="text" defaultValue="Münster" className="w-full px-4 py-2 border rounded-xl" /></div>
        </div>
        <button className="w-full bg-primary-500 text-white py-3 rounded-xl hover:bg-primary-600 font-semibold">Speichern</button>
      </div>
    </div>
  );

  // ============ SUPPORT ============
  const SupportTab = () => {
    const openTickets = supportTickets.filter(t => t.status === 'open');
    const closedTickets = supportTickets.filter(t => t.status === 'closed');
    
    const loadTicketMessages = async (ticketId) => {
      try {
        const { data } = await api.get(`/admin/support/${ticketId}`);
        setSelectedTicket(data.ticket);
        setTicketMessages(data.messages);
      } catch (e) {
        console.error(e);
      }
    };
    
    const sendReply = async () => {
      if (!supportReply.trim() || !selectedTicket) return;
      try {
        await api.post(`/admin/support/${selectedTicket.id}/reply`, { message: supportReply });
        setSupportReply('');
        loadTicketMessages(selectedTicket.id);
      } catch (e) {
        alert('Fehler beim Senden');
      }
    };
    
    const closeTicket = async (ticketId) => {
      try {
        await api.patch(`/admin/support/${ticketId}/close`);
        setSelectedTicket(null);
        loadData();
      } catch (e) {
        alert('Fehler');
      }
    };
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Support-Tickets</h2>
            <p className="text-sm text-gray-500">{openTickets.length} offene Tickets, {closedTickets.length} geschlossen</p>
          </div>
          <button onClick={loadData} className="p-2 hover:bg-gray-100 rounded-lg">
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Escalation Alert */}
        {escalatedCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-500" size={24} />
            <div className="flex-1">
              <p className="font-semibold text-red-800">{escalatedCount} eskalierte Tickets</p>
              <p className="text-sm text-red-600">Diese Kunden wollen mit einem echten Mitarbeiter sprechen</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Ticket List */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <span className="font-semibold">Offene Tickets ({openTickets.length})</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {openTickets.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Headphones size={40} className="mx-auto mb-2 opacity-50" />
                  <p>Keine offenen Tickets</p>
                </div>
              ) : (
                openTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => loadTicketMessages(ticket.id)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedTicket?.id === ticket.id ? 'bg-primary-50' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{ticket.id}</span>
                          {ticket.escalated ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                              🚨 Eskaliert
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                              🤖 KI
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{ticket.user_name}</p>
                        <p className="text-xs text-gray-400">{ticket.user_email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">
                          {new Date(ticket.created_at).toLocaleString('de-DE')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{ticket.message_count} Nachrichten</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat View */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
            {selectedTicket ? (
              <>
                {/* Ticket Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Ticket #{selectedTicket.id}</span>
                      {selectedTicket.escalated && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Eskaliert</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{selectedTicket.user_name} • {selectedTicket.user_email}</p>
                  </div>
                  <button
                    onClick={() => closeTicket(selectedTicket.id)}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 flex items-center gap-2"
                  >
                    <CheckCircle size={16} /> Schließen
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px] bg-gray-50">
                  {ticketMessages.map((msg, i) => (
                    <div
                      key={msg.id || i}
                      className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-end gap-2 max-w-[80%] ${msg.sender_type === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          msg.sender_type === 'user' 
                            ? 'bg-gray-600 text-white' 
                            : msg.sender_type === 'admin'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {msg.sender_type === 'user' ? <User size={14} /> : msg.sender_type === 'admin' ? <Headphones size={14} /> : <Bot size={14} />}
                        </div>
                        <div className={`px-3 py-2 rounded-2xl text-sm ${
                          msg.sender_type === 'user'
                            ? 'bg-gray-600 text-white rounded-br-sm'
                            : msg.sender_type === 'admin'
                            ? 'bg-blue-500 text-white rounded-bl-sm'
                            : 'bg-white border border-gray-200 rounded-bl-sm'
                        }`}>
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Input */}
                <div className="p-4 border-t border-gray-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={supportReply}
                      onChange={(e) => setSupportReply(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                      placeholder="Antwort schreiben..."
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      onClick={sendReply}
                      disabled={!supportReply.trim()}
                      className="px-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 p-8">
                <div className="text-center">
                  <MessageCircle size={48} className="mx-auto mb-3 opacity-50" />
                  <p>Wähle ein Ticket aus</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============ MODALS ============
  const CategoryModal = () => {
    const [form, setForm] = useState(editItem || { name: '', slug: '', icon: '📦', color: '#14B8A6' });
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (editItem) await api.put(`/admin/categories/${editItem.id}`, { ...form, active: 1 });
      else await api.post('/admin/categories', form);
      setShowModal(null); loadData();
    };
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 w-full max-w-md">
          <h2 className="text-lg font-bold mb-4">{editItem ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Name</label><input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[äöüß\s]/g, c => ({ä:'ae',ö:'oe',ü:'ue',ß:'ss',' ':'-'})[c] || c)})} required className="w-full px-4 py-2 border rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Icon (Emoji)</label><input type="text" value={form.icon} onChange={(e) => setForm({...form, icon: e.target.value})} className="w-full px-4 py-2 border rounded-xl text-2xl text-center" /></div>
              <div><label className="block text-sm font-medium mb-1">Farbe</label><input type="color" value={form.color} onChange={(e) => setForm({...form, color: e.target.value})} className="w-full h-10 border rounded-xl cursor-pointer" /></div>
            </div>
            <div className="flex gap-2"><button type="button" onClick={() => setShowModal(null)} className="flex-1 py-2 border rounded-xl">Abbrechen</button><button type="submit" className="flex-1 py-2 bg-primary-500 text-white rounded-xl">Speichern</button></div>
          </form>
        </motion.div>
      </div>
    );
  };

  const DriverModal = () => {
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
    const handleSubmit = async (e) => { e.preventDefault(); await api.post('/admin/drivers', form); setShowModal(null); loadData(); };
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 w-full max-w-md">
          <h2 className="text-lg font-bold mb-4">Neuer Fahrer</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Name</label><input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required className="w-full px-4 py-2 border rounded-xl" /></div>
            <div><label className="block text-sm font-medium mb-1">E-Mail</label><input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required className="w-full px-4 py-2 border rounded-xl" /></div>
            <div><label className="block text-sm font-medium mb-1">Telefon</label><input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full px-4 py-2 border rounded-xl" /></div>
            <div><label className="block text-sm font-medium mb-1">Passwort</label><input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required minLength={6} className="w-full px-4 py-2 border rounded-xl" /></div>
            <div className="flex gap-2"><button type="button" onClick={() => setShowModal(null)} className="flex-1 py-2 border rounded-xl">Abbrechen</button><button type="submit" className="flex-1 py-2 bg-primary-500 text-white rounded-xl">Anlegen</button></div>
          </form>
        </motion.div>
      </div>
    );
  };

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transition-all ${sidebarCollapsed ? 'w-16' : 'w-64'} hidden lg:block`}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">⚡</div>
            {!sidebarCollapsed && <div><h1 className="font-bold text-gray-900">Speeti</h1><p className="text-xs text-gray-500">Admin Panel</p></div>}
          </div>
        </div>
        <nav className="p-2 space-y-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${activeTab === tab.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <tab.icon size={20} />
              {!sidebarCollapsed && <span className="font-medium text-sm flex-1">{tab.label}</span>}
              {tab.badge && pendingCount > 0 && !sidebarCollapsed && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCount}</span>
              )}
              {tab.supportBadge && escalatedCount > 0 && !sidebarCollapsed && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">{escalatedCount}</span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 p-3 z-30">
        <div className="flex items-center justify-between">
          <h1 className="font-bold">⚡ Speeti Admin</h1>
          <select value={activeTab} onChange={(e) => setActiveTab(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm">
            {tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
          </select>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-4 lg:p-6 pt-16 lg:pt-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'drivers' && <DriversTab />}
          {activeTab === 'customers' && <CustomersTab />}
          {activeTab === 'support' && <SupportTab />}
          {activeTab === 'analytics' && <div className="text-center py-12 text-gray-400">📊 Statistiken kommen bald</div>}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showModal === 'product' && <ProductModal />}
        {showModal === 'category' && <CategoryModal />}
        {showModal === 'driver' && <DriverModal />}
      </AnimatePresence>
    </div>
  );
}
