import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ClipboardList, User } from 'lucide-react';
import { useStore } from '../store';

export default function Navbar() {
  const location = useLocation();
  const user = useStore(state => state.user);
  
  const isActive = (path) => location.pathname === path;
  
  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/search', icon: Search, label: 'Suchen' },
    { path: '/orders', icon: ClipboardList, label: 'Bestellungen' },
    { path: user ? '/profile' : '/login', icon: User, label: user ? 'Profil' : 'Login' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => (
          <Link
            key={path}
            to={path}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive(path) 
                ? 'text-rose-500' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon size={22} strokeWidth={isActive(path) ? 2.5 : 2} />
            <span className="text-[10px] mt-1 font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
