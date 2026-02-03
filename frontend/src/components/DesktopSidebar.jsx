import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingBag, User, Zap, Grid, Clock, Heart, Tag, Settings, LogOut, Truck, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../store';

const navItems = [
  { icon: Home, label: 'Startseite', path: '/' },
  { icon: Search, label: 'Suchen', path: '/search' },
  { icon: Tag, label: 'Angebote', path: '/search?deals=1' },
  { icon: ShoppingBag, label: 'Warenkorb', path: '/cart' },
  { icon: Clock, label: 'Bestellungen', path: '/orders' },
  { icon: User, label: 'Profil', path: '/profile' },
];

export default function DesktopSidebar() {
  const location = useLocation();
  const { user, categories, cart, logout } = useStore();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-gray-100 h-screen sticky top-0 overflow-hidden">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Zap className="text-white" size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-primary-600 to-teal-600 bg-clip-text text-transparent">
              Speeti
            </h1>
            <p className="text-xs text-gray-400">Münsters Lieferdienst #1</p>
          </div>
        </Link>
      </div>

      {/* Delivery Badge */}
      <div className="mx-4 mt-4 bg-gradient-to-r from-primary-50 to-teal-50 rounded-xl p-4 border border-primary-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
            <Truck className="text-white" size={20} />
          </div>
          <div>
            <p className="font-bold text-gray-900">Blitzlieferung</p>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Clock size={12} /> 15-20 Minuten
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">Navigation</p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                    isActive 
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon size={20} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary-500'} />
                  <span className="font-medium">{item.label}</span>
                  {item.path === '/cart' && cartCount > 0 && (
                    <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-600'
                    }`}>
                      {cartCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Categories */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-3 px-3">Kategorien</p>
        <ul className="space-y-1">
          {categories.slice(0, 8).map((cat) => (
            <li key={cat.id}>
              <Link
                to={`/category/${cat.slug}`}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                  location.pathname === `/category/${cat.slug}`
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="text-sm">{cat.name}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Admin/Driver Links */}
        {user?.role === 'admin' && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-3 px-3">Admin</p>
            <Link
              to="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-violet-600 hover:bg-violet-50 transition-all"
            >
              <LayoutDashboard size={20} />
              <span className="font-medium">Dashboard</span>
            </Link>
          </>
        )}
        
        {user?.role === 'driver' && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-3 px-3">Fahrer</p>
            <Link
              to="/driver"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-orange-600 hover:bg-orange-50 transition-all"
            >
              <Truck size={20} />
              <span className="font-medium">Aufträge</span>
            </Link>
          </>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-100">
        {user ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-teal-400 rounded-full flex items-center justify-center text-white font-bold">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Abmelden"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-primary-500 to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary-500/30 transition-all"
          >
            <User size={18} />
            Anmelden
          </Link>
        )}
      </div>
    </aside>
  );
}
