import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Package, LogOut, ChevronRight, User, Phone, Mail, Settings, HelpCircle, Shield, Headphones, Loader2 } from 'lucide-react';
import { useStore } from '../store';

export default function Profile() {
  const navigate = useNavigate();
  const { user, addresses, fetchAddresses, logout } = useStore();
  const [loading, setLoading] = useState(true);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    // Wait for hydration from localStorage
    const timer = setTimeout(() => {
      setLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login?redirect=/profile');
      return;
    }
    if (user) {
      fetchAddresses();
      // Fetch order count
      import('../store').then(({ api }) => {
        api.get('/orders').then(({ data }) => {
          setOrderCount(data?.length || 0);
        }).catch(() => {});
      });
    }
  }, [user, loading]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary-500 to-primary-600 text-white pt-12 pb-8 px-4 rounded-b-3xl">
        <div className="max-w-lg mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-100 hover:text-white mb-6">
            <ArrowLeft size={20} /> Zurück
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <User size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user?.name || 'Benutzer'}</h1>
              <p className="text-primary-100">{user?.email}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Quick Stats */}
        <section className="flex gap-4">
          <div className="flex-1 bg-white rounded-2xl p-4 text-center">
            <Package className="mx-auto mb-2 text-primary-500" size={24} />
            <p className="text-2xl font-bold text-gray-900">{orderCount}</p>
            <p className="text-xs text-gray-500">Bestellungen</p>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-4 text-center">
            <MapPin className="mx-auto mb-2 text-primary-500" size={24} />
            <p className="text-2xl font-bold text-gray-900">{addresses.length}</p>
            <p className="text-xs text-gray-500">Adressen</p>
          </div>
        </section>

        {/* Account Info */}
        <section className="bg-white rounded-2xl overflow-hidden">
          <h2 className="font-semibold text-gray-900 px-4 pt-4 pb-2">Konto</h2>
          
          <div className="divide-y divide-gray-100">
            <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
              <User size={20} className="text-gray-400" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900">Name</p>
                <p className="text-xs text-gray-500">{user?.name || '-'}</p>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
            
            <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
              <Mail size={20} className="text-gray-400" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900">E-Mail</p>
                <p className="text-xs text-gray-500">{user?.email || '-'}</p>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
            
            <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
              <Phone size={20} className="text-gray-400" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900">Telefon</p>
                <p className="text-xs text-gray-500">{user?.phone || 'Nicht angegeben'}</p>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>
        </section>

        {/* Addresses */}
        <section className="bg-white rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="font-semibold text-gray-900">Adressen</h2>
            <button className="text-primary-600 text-sm font-medium">+ Hinzufügen</button>
          </div>
          
          {addresses.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-gray-500">Noch keine Adressen gespeichert</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {addresses.map(addr => (
                <div key={addr.id} className="px-4 py-3 flex items-start gap-3">
                  <MapPin size={20} className="text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{addr.label}</p>
                    <p className="text-xs text-gray-500">{addr.street} {addr.house_number}, {addr.postal_code} {addr.city}</p>
                  </div>
                  {addr.is_default && (
                    <span className="text-xs bg-primary-100 text-primary-600 px-2 py-1 rounded-full">Standard</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* More Options */}
        <section className="bg-white rounded-2xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            <Link to="/orders" className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
              <Package size={20} className="text-gray-400" />
              <span className="flex-1 text-sm font-medium text-gray-900">Meine Bestellungen</span>
              <ChevronRight size={20} className="text-gray-400" />
            </Link>
            
            <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
              <Settings size={20} className="text-gray-400" />
              <span className="flex-1 text-left text-sm font-medium text-gray-900">Einstellungen</span>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
            
            <Link to="/support" className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
              <Headphones size={20} className="text-rose-500" />
              <span className="flex-1 text-sm font-medium text-gray-900">Hilfe & Support</span>
              <ChevronRight size={20} className="text-gray-400" />
            </Link>
            
            <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
              <Shield size={20} className="text-gray-400" />
              <span className="flex-1 text-left text-sm font-medium text-gray-900">Datenschutz</span>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>
        </section>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 font-medium py-4 rounded-2xl hover:bg-red-100 transition-colors"
        >
          <LogOut size={20} /> Abmelden
        </button>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400">
          Speeti v1.0.0 • Made with ❤️ in Münster
        </p>
      </div>
    </div>
  );
}
