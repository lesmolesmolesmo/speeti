import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingBag, User, Clock, LogOut, Truck, LayoutDashboard } from 'lucide-react';
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

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0 overflow-hidden">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-extrabold text-rose-500">Speeti</span>
        </Link>
        <p className="text-xs text-gray-400 mt-1">Lieferung in 15-20 Min</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-rose-50 text-rose-600 font-medium' 
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

        {/* Categories */}
        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">Kategorien</p>
          <ul className="space-y-0.5">
            {categories.slice(0, 6).map((cat) => (
              <li key={cat.id}>
                <Link
                  to={`/category/${cat.slug}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    location.pathname === `/category/${cat.slug}`
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Admin/Driver Links */}
        {user?.role === 'admin' && (
          <div className="mt-6">
            <Link
              to="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-violet-600 hover:bg-violet-50"
            >
              <LayoutDashboard size={20} />
              <span className="font-medium">Admin Dashboard</span>
            </Link>
          </div>
        )}
        
        {user?.role === 'driver' && (
          <div className="mt-6">
            <Link
              to="/driver"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-orange-600 hover:bg-orange-50"
            >
              <Truck size={20} />
              <span className="font-medium">Fahrer Dashboard</span>
            </Link>
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-gray-100">
        {user ? (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
            <div className="w-9 h-9 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 font-bold">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
              title="Abmelden"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-rose-500 text-white font-semibold rounded-lg hover:bg-rose-600 transition-colors"
          >
            <User size={18} />
            Anmelden
          </Link>
        )}
      </div>
    </aside>
  );
}
