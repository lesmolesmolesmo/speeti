import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Package, MapPin, Clock, CheckCircle2, Truck, ChefHat, ClipboardList, PartyPopper, XCircle, Search, ArrowLeft, Mail, Send, Shield, AlertTriangle, Headphones } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

const statusIcons = {
  pending: ClipboardList,
  confirmed: CheckCircle2,
  preparing: ChefHat,
  ready: Package,
  delivering: Truck,
  delivered: PartyPopper,
  cancelled: XCircle
};

export default function Track() {
  const { orderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState(orderNumber || '');
  
  // Verification state
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  // Cancel state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');

  useEffect(() => {
    if (orderNumber) {
      fetchOrder(orderNumber, token);
    }
  }, [orderNumber, token]);

  const fetchOrder = async (num, tkn) => {
    if (!num) return;
    setLoading(true);
    setError(null);
    setNeedsVerification(false);
    setEmailSent(false);
    
    try {
      const url = tkn 
        ? `${API}/api/track/${encodeURIComponent(num)}?token=${tkn}`
        : `${API}/api/track/${encodeURIComponent(num)}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Bestellung nicht gefunden');
      
      if (data.requiresVerification) {
        setNeedsVerification(true);
        setOrder({ orderNumber: data.orderNumber });
      } else {
        setOrder(data);
      }
    } catch (err) {
      setError(err.message);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      window.history.pushState({}, '', `/track/${searchInput.trim()}`);
      fetchOrder(searchInput.trim(), null);
    }
  };

  const handleSendVerification = async (e) => {
    e.preventDefault();
    if (!verifyEmail.trim() || !searchInput.trim()) return;
    
    setVerifying(true);
    try {
      await fetch(`${API}/api/track/send-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: searchInput.trim(), email: verifyEmail.trim() })
      });
      setEmailSent(true);
    } catch (err) {
      setEmailSent(true);
    } finally {
      setVerifying(false);
    }
  };

  const canCancel = order?.status && ['pending', 'confirmed'].includes(order.status);

  const handleCancel = async () => {
    if (!order || cancelling) return;
    setCancelling(true);
    
    try {
      const res = await fetch(`${API}/api/orders/${order.orderNumber || searchInput}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reason: cancelReason || 'Vom Kunden storniert' })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setShowCancelModal(false);
        if (data.supportNeeded) {
          setSupportMessage(data.message || 'Diese Bestellung kann nicht mehr online storniert werden.');
          setShowSupportModal(true);
        } else {
          setSupportMessage(data.error || 'Ein Fehler ist aufgetreten. Bitte kontaktiere unseren Support.');
          setShowSupportModal(true);
        }
      } else {
        setCancelSuccess(true);
        setOrder(prev => ({ ...prev, status: 'cancelled', statusInfo: { label: 'Storniert', step: 0 } }));
        setShowCancelModal(false);
      }
    } catch (err) {
      setShowCancelModal(false);
      setSupportMessage('Ein unerwarteter Fehler ist aufgetreten. Bitte kontaktiere unseren Support.');
      setShowSupportModal(true);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-pink-600 text-white p-6 pb-16">
        <div className="max-w-lg mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4">
            <ArrowLeft size={20} />
            Zurück zum Shop
          </Link>
          <h1 className="text-2xl font-bold mb-2">📦 Bestellung verfolgen</h1>
          <p className="text-white/80">Gib deine Bestellnummer ein, um den Status zu sehen</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-10">
        {/* Search Box */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="z.B. SPT-1234567890"
                className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <button type="submit" disabled={loading} className="bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 disabled:opacity-50">
              {loading ? '...' : 'Suchen'}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-600 text-center">
            <XCircle size={24} className="mx-auto mb-2" />
            {error}
          </div>
        )}

        {/* Verification Required */}
        {needsVerification && !emailSent && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield size={32} className="text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verifizierung erforderlich</h2>
              <p className="text-gray-600">Zum Schutz deiner Daten benötigen wir eine Bestätigung per E-Mail.</p>
            </div>
            <div className="bg-rose-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-rose-700 text-center">
                <strong>Bestellnummer:</strong> {order?.orderNumber || searchInput}
              </p>
            </div>
            <form onSubmit={handleSendVerification}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail size={16} className="inline mr-2" />
                Deine E-Mail-Adresse
              </label>
              <input
                type="email"
                value={verifyEmail}
                onChange={(e) => setVerifyEmail(e.target.value)}
                placeholder="name@beispiel.de"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 mb-4"
              />
              <button type="submit" disabled={verifying || !verifyEmail.trim()} className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                {verifying ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={18} /> Link per E-Mail senden</>}
              </button>
            </form>
          </div>
        )}

        {/* Email Sent Success */}
        {emailSent && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Prüfe dein Postfach! 📬</h2>
            <p className="text-gray-600 mb-4">Wenn diese E-Mail-Adresse zu der Bestellung gehört, erhältst du in Kürze einen Link per E-Mail.</p>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500">
              <p>💡 Tipp: Prüfe auch deinen Spam-Ordner!</p>
            </div>
          </div>
        )}

        {/* Order Details (verified) */}
        {order && order.verified && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Status Header */}
            <div className={`p-6 ${order.status === 'delivered' ? 'bg-green-500' : order.status === 'cancelled' ? 'bg-red-500' : 'bg-rose-500'} text-white`}>
              <div className="flex items-center gap-4">
                {(() => {
                  const Icon = statusIcons[order.status] || Package;
                  return <Icon size={40} />;
                })()}
                <div>
                  <p className="text-white/80 text-sm">Status</p>
                  <p className="text-2xl font-bold">{order.statusInfo?.label || order.status}</p>
                </div>
              </div>
            </div>

            {/* Order Info */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <span className="text-gray-500">Bestellnummer</span>
                <span className="font-bold text-rose-500">{order.orderNumber}</span>
              </div>
              
              {order.address && (
                <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                  <MapPin size={20} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500 text-sm">Lieferadresse</p>
                    <p className="font-medium">{order.address.street} {order.address.houseNumber}</p>
                    <p className="text-gray-600">{order.address.plz} {order.address.city}</p>
                  </div>
                </div>
              )}

              {order.items && order.items.length > 0 && (
                <div className="pb-4 border-b border-gray-100">
                  <p className="text-gray-500 text-sm mb-3">Bestellung</p>
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between py-2">
                      <span>{item.quantity}× {item.name}</span>
                      <span className="font-medium">{(item.price * item.quantity).toFixed(2)} €</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 border-t border-gray-100 mt-2">
                    <span className="font-bold">Gesamt</span>
                    <span className="font-bold text-rose-500">{order.total?.toFixed(2)} €</span>
                  </div>
                </div>
              )}

              {/* Timeline */}
              {order.timeline && (
                <div>
                  <p className="text-gray-500 text-sm mb-4">Verlauf</p>
                  <div className="space-y-4">
                    {order.timeline.map((step) => (
                      <div key={step.status} className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} ${step.current ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}>
                          {step.icon}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                        </div>
                        {step.completed && <CheckCircle2 size={20} className="text-green-500" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancel / Support Section */}
              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                <div className="pt-4 border-t border-gray-100">
                  {canCancel ? (
                    <button onClick={() => setShowCancelModal(true)} className="w-full py-3 text-red-500 hover:bg-red-50 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                      <XCircle size={18} /> Bestellung stornieren
                    </button>
                  ) : (
                    <div className="bg-amber-50 rounded-xl p-4 text-center">
                      <AlertTriangle size={20} className="text-amber-500 mx-auto mb-2" />
                      <p className="text-sm text-amber-700 mb-3">Deine Bestellung wird bereits vorbereitet.</p>
                      <a href="/support" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors">
                        <Headphones size={16} /> Support kontaktieren
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Cancel Success */}
              {cancelSuccess && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-3 text-green-700">
                    <CheckCircle2 size={20} />
                    <p className="font-medium">Bestellung erfolgreich storniert!</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Order Yet */}
        {!order && !error && !loading && !needsVerification && (
          <div className="text-center py-12 text-gray-500">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p>Gib deine Bestellnummer ein, um den Status zu sehen.</p>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Bestellung stornieren?</h2>
              <p className="text-gray-600">Bist du sicher, dass du deine Bestellung stornieren möchtest?</p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Grund (optional)</label>
              <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Warum möchtest du stornieren?" rows={2} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} disabled={cancelling} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                Abbrechen
              </button>
              <button onClick={handleCancel} disabled={cancelling} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                {cancelling ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><XCircle size={18} /> Stornieren</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
