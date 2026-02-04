import { ShoppingBag, DollarSign, AlertCircle, Users, CheckCircle, TrendingUp } from "lucide-react";

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, trend, trendUp, highlight }) => (
  <div className={`bg-white rounded-2xl p-4 shadow-sm ${highlight ? "ring-2 ring-yellow-400" : ""}`}>
    <div className="flex items-center justify-between mb-2">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${highlight ? "bg-yellow-100" : "bg-gray-100"}`}>
        <Icon size={20} className={highlight ? "text-yellow-600" : "text-gray-600"} />
      </div>
      {trend && (
        <span className={`text-xs font-medium ${trendUp ? "text-green-600" : "text-red-600"}`}>
          {trend}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-sm text-gray-500">{label}</p>
  </div>
);

// Order Row Component
const OrderRow = ({ order, compact, onClick, orderStatuses }) => {
  const status = orderStatuses[order.status] || orderStatuses.pending;
  return (
    <div onClick={onClick} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">#{order.order_number || order.id}</p>
          <p className="text-sm text-gray-500">{order.customer_name}</p>
        </div>
        <div className="text-right">
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
            {status.label}
          </span>
          {!compact && <p className="text-sm text-gray-500 mt-1">{order.total?.toFixed(2)}€</p>}
        </div>
      </div>
    </div>
  );
};

export default function AdminDashboard({ stats, orders, setActiveTab, setSelectedOrder, orderStatuses }) {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-500 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Willkommen zurück!</h1>
        <p className="text-white/80">Hier ist dein Überblick für heute.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Bestellungen heute" value={stats?.orders_today || 0} trend="+12%" trendUp />
        <StatCard icon={DollarSign} label="Umsatz heute" value={`${(stats?.revenue_today || 0).toFixed(2)}€`} trend="+8%" trendUp />
        <StatCard icon={AlertCircle} label="Offene Bestellungen" value={stats?.pending_orders || 0} highlight />
        <StatCard icon={Users} label="Neue Kunden" value={stats?.total_customers || 0} trend="+5%" trendUp />
      </div>

      {/* Live Orders */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h3 className="font-semibold">Live Bestellungen</h3>
          </div>
          <button onClick={() => setActiveTab("orders")} className="text-rose-600 text-sm font-medium">
            Alle anzeigen →
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {(orders || []).filter(o => o.status !== "delivered" && o.status !== "cancelled").slice(0, 5).map(order => (
            <OrderRow 
              key={order.id} 
              order={order} 
              compact 
              onClick={() => { setSelectedOrder(order); setActiveTab("orders"); }}
              orderStatuses={orderStatuses}
            />
          ))}
          {(orders || []).filter(o => o.status !== "delivered" && o.status !== "cancelled").length === 0 && (
            <div className="p-8 text-center text-gray-400">
              <CheckCircle size={40} className="mx-auto mb-2 opacity-50" />
              <p>Keine offenen Bestellungen</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
