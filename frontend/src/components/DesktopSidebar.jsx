import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingBag, User, Clock, LogOut, Truck, LayoutDashboard, ChevronDown, ChevronUp, Grid } from 'lucide-react';
import { useStore } from '../store';

const navItems = [
  { icon: Home, label: 'Startseite', path: '/' },
  { icon: Search, label: 'Suchen', path: '/search' },
  { icon: ShoppingBag, label: 'Warenkorb', path: '/cart' },
  { icon: Clock, label: 'Bestellungen', path: '/orders' },
  { icon: User, label: 'Profil', path: '/profile' },
];

export default function DesktopSidebar() {
  const location = useLocation();
  const { user, categories, cart, logout } = useStore();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const [showAllCategories, setShowAllCategories] = useState(false);
  
  // Show first 8 or all categories
  const displayedCategories = showAllCategories ? categories : categories.slice(0, 8);

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center">
            <span className="text-xl">🚀</span>
          </div>
          <div>
            <span className="text-xl font-extrabold text-gray-900">Speeti</span>
            <p className="text-[10px] text-gray-400">Lieferung in 15-20 Min</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        <div className="p-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-rose-50 text-rose-600 font-medium shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                    {item.path === '/cart' && cartCount > 0 && (
                      <span className="ml-auto text-xs font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Categories Section */}
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 flex items-center gap-2">
              <Grid size={12} /> Kategorien
            </p>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {categories.length}
            </span>
          </div>
          
          <div className={`space-y-0.5 ${showAllCategories ? 'max-h-[40vh] overflow-y-auto pr-1' : ''}`}>
            {displayedCategories.map((cat) => {
              const isActive = location.pathname === `/category/${cat.slug}`;
              return (
                <Link
                  key={cat.id}
                  to={`/category/${cat.slug}`}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                    isActive
                      ? 'bg-rose-50 text-rose-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base">{cat.icon || '📦'}</span>
                  <span className="truncate">{cat.name}</span>
                </Link>
              );
            })}
          </div>
          
          {/* Show More/Less Button */}
          {categories.length > 8 && (
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="w-full flex items-center justify-center gap-1 mt-2 px-3 py-2 text-xs text-rose-500 hover:bg-rose-50 rounded-xl transition-colors font-medium"
            >
              {showAllCategories ? (
                <><ChevronUp size={14} /> Weniger anzeigen</>
              ) : (
                <><ChevronDown size={14} /> Alle {categories.length} Kategorien</>
              )}
            </button>
          )}
        </div>

        {/* Admin/Driver Links */}
        {user?.role === 'admin' && (
          <div className="px-3 pb-3">
            <Link
              to="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium shadow-md shadow-violet-500/20 hover:shadow-lg transition-all"
            >
              <LayoutDashboard size={20} />
              <span>Admin Dashboard</span>
            </Link>
          </div>
        )}
        
        {user?.role === 'driver' && (
          <div className="px-3 pb-3">
            <Link
              to="/driver"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium shadow-md shadow-orange-500/20 hover:shadow-lg transition-all"
            >
              <Truck size={20} />
              <span>Fahrer Dashboard</span>
            </Link>
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50">
        {user ? (
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
              title="Abmelden"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all"
          >
            <User size={18} />
            Anmelden
          </Link>
        )}
      </div>
    </aside>
  );
}
