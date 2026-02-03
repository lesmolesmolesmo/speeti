import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Plus, CreditCard, Banknote, Clock, ChevronRight, Calendar, Zap, Wallet, Smartphone, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore, api } from '../store';

// Generate time slots
const generateTimeSlots = () => {
  const slots = [];
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  
  let startHour = currentHour;
  let startMin = currentMin < 30 ? 30 : 0;
  if (currentMin >= 30) startHour++;
  
  if (startHour < 22) {
    for (let h = startHour; h < 22; h++) {
      for (let m = (h === startHour ? startMin : 0); m < 60; m += 30) {
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const endTime = m === 30 ? `${h + 1}:00` : `${h}:30`;
        slots.push({
          id: `today-${time}`,
          label: `Heute ${time} - ${endTime.padStart(5, '0')}`,
          date: 'today',
          time
        });
      }
    }
  }
  
  for (let h = 8; h < 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const endTime = m === 30 ? `${h + 1}:00` : `${h}:30`;
      slots.push({
        id: `tomorrow-${time}`,
        label: `Morgen ${time} - ${endTime.padStart(5, '0')}`,
        date: 'tomorrow',
        time
      });
    }
  }
  
  return slots;
};

// Münster PLZ ranges (48xxx)
const MUENSTER_PLZ = ['48143', '48145', '48147', '48149', '48151', '48153', '48155', '48157', '48159', '48161', '48163', '48165', '48167'];
const isValidMuensterPLZ = (plz) => {
  const cleaned = plz.replace(/\s/g, '');
  return cleaned.length === 5 && cleaned.startsWith('48');
};

// Payment method icons
const PaymentIcon = ({ method }) => {
  switch (method) {
    case 'cash': return <Banknote size={24} />;
    case 'card': return <CreditCard size={24} />;
    case 'paypal': return <span className="text-xl font-bold text-blue-600">P</span>;
    case 'klarna': return <span className="text-lg font-bold text-pink-500">K</span>;
    case 'sofort': return <span className="text-lg font-bold text-orange-500">S</span>;
    case 'googlepay': return <Smartphone size={24} />;
    case 'applepay': return <Smartphone size={24} />;
    default: return <Wallet size={24} />;
  }
};

const paymentMethods = [
  { id: 'cash', name: 'Bar bei Lieferung', description: 'Barzahlung an der Tür', online: false },
  { id: 'card', name: 'Karte bei Lieferung', description: 'EC/Kreditkarte an der Tür', online: false },
  { id: 'stripe', name: 'Online bezahlen', description: 'Kreditkarte, PayPal, Klarna & mehr', online: true, badge: 'Empfohlen' },
];

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cart, getCartTotal, addresses, selectedAddress, fetchAddresses, selectAddress, addAddress, createOrder, clearCart } = useStore();
  
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [notes, setNotes] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ street: '', house_number: '', postal_code: '', instructions: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deliveryType, setDeliveryType] = useState('asap');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const timeSlots = generateTimeSlots();

  const subtotal = getCartTotal();
  const deliveryFee = subtotal >= 20 ? 0 : 2.99;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    fetchAddresses();
    
    // Check for cancelled payment
    if (searchParams.get('cancelled') === 'true') {
      setError('Zahlung abgebrochen. Bitte versuche es erneut.');
    }
  }, []);

  const handleAddAddress = async () => {
    if (!newAddress.street || !newAddress.house_number || !newAddress.postal_code) {
      setError('Bitte fülle alle Pflichtfelder aus');
      return;
    }
    
    // Validate Münster PLZ
    if (!isValidMuensterPLZ(newAddress.postal_code)) {
      setError('Wir liefern derzeit nur nach Münster (PLZ 48xxx). Bitte gib eine gültige Münsteraner Postleitzahl ein.');
      return;
    }
    
    await addAddress({ ...newAddress, city: 'Münster', is_default: true });
    setShowAddressForm(false);
    setNewAddress({ street: '', house_number: '', postal_code: '', instructions: '' });
  };

  const handleOrder = async () => {
    if (!selectedAddress) {
      setError('Bitte wähle eine Lieferadresse');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const items = cart.map(item => ({ product_id: item.id, quantity: item.quantity }));
      
      if (paymentMethod === 'stripe') {
        // Create Stripe checkout session
        const { data } = await api.post('/checkout/create-session', {
          address_id: selectedAddress.id,
          items,
          notes
        });
        
        // Redirect to Stripe
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error('Keine Checkout-URL erhalten');
        }
      } else {
        // Cash/Card at delivery - create order directly
        const order = await createOrder(selectedAddress.id, paymentMethod, notes);
        navigate(`/orders/${order.id}`);
      }
    } catch (e) {
      console.error('Order error:', e);
      setError(e.response?.data?.error || 'Fehler bei der Bestellung. Bitte versuche es erneut.');
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Warenkorb ist leer</h2>
          <p className="text-gray-600 mb-4">Füge Artikel hinzu, um zu bestellen.</p>
          <Link to="/" className="text-rose-500 font-medium">Zum Shop →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-36">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/cart" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Kasse</h1>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-2 text-red-700">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500">✕</button>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Delivery Time */}
        <section className="bg-white rounded-2xl p-4">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-rose-500" /> Lieferzeit
          </h2>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => { setDeliveryType('asap'); setSelectedSlot(null); }}
              className={`p-4 rounded-xl border-2 transition-all ${
                deliveryType === 'asap' 
                  ? 'border-rose-500 bg-rose-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Zap className={`mx-auto mb-2 ${deliveryType === 'asap' ? 'text-rose-500' : 'text-gray-400'}`} size={24} />
              <p className="font-semibold text-sm">Schnellstmöglich</p>
              <p className="text-xs text-gray-500">15-20 Minuten</p>
            </button>
            
            <button
              onClick={() => setShowTimeSlots(true)}
              className={`p-4 rounded-xl border-2 transition-all ${
                deliveryType === 'scheduled' 
                  ? 'border-rose-500 bg-rose-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Calendar className={`mx-auto mb-2 ${deliveryType === 'scheduled' ? 'text-rose-500' : 'text-gray-400'}`} size={24} />
              <p className="font-semibold text-sm">Vorbestellen</p>
              <p className="text-xs text-gray-500">
                {selectedSlot ? selectedSlot.label : 'Zeit wählen'}
              </p>
            </button>
          </div>

          {deliveryType === 'asap' && (
            <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl">
              <Zap className="text-rose-500" size={20} />
              <p className="text-sm text-rose-700">Lieferung in <strong>15-20 Minuten</strong></p>
            </div>
          )}
        </section>

        {/* Time Slot Modal */}
        {showTimeSlots && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              className="bg-white w-full rounded-t-3xl max-h-[70vh] overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-lg">Lieferzeit wählen</h3>
                <button 
                  onClick={() => setShowTimeSlots(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[50vh]">
                <div className="space-y-2">
                  {timeSlots.slice(0, 20).map(slot => (
                    <button
                      key={slot.id}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setDeliveryType('scheduled');
                        setShowTimeSlots(false);
                      }}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${
                        selectedSlot?.id === slot.id 
                          ? 'border-rose-500 bg-rose-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium">{slot.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delivery Area Notice */}
        <section className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin size={20} className="text-rose-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Liefergebiet: Münster</h3>
              <p className="text-sm text-gray-600 mt-1">
                Wir liefern aktuell nur innerhalb von Münster (PLZ 48xxx). 
                Lieferzeit: 15-20 Minuten 🚴
              </p>
            </div>
          </div>
        </section>

        {/* Delivery Address */}
        <section className="bg-white rounded-2xl p-4">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-rose-500" /> Lieferadresse auswählen
          </h2>

          {addresses.map(addr => (
            <button
              key={addr.id}
              onClick={() => selectAddress(addr)}
              className={`w-full text-left p-3 rounded-xl mb-2 border-2 transition-colors ${
                selectedAddress?.id === addr.id 
                  ? 'border-rose-500 bg-rose-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-gray-900">{addr.label}</p>
              <p className="text-sm text-gray-600">{addr.street} {addr.house_number}</p>
              <p className="text-sm text-gray-500">{addr.postal_code} {addr.city}</p>
            </button>
          ))}

          {showAddressForm ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 pt-2"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Straße *</label>
                <input
                  type="text"
                  placeholder="z.B. Hammer Straße"
                  value={newAddress.street}
                  onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div className="flex gap-3">
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hausnr. *</label>
                  <input
                    type="text"
                    placeholder="12a"
                    value={newAddress.house_number}
                    onChange={(e) => setNewAddress({ ...newAddress, house_number: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">PLZ (Münster) *</label>
                  <input
                    type="text"
                    placeholder="48xxx"
                    maxLength={5}
                    value={newAddress.postal_code}
                    onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                    className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 ${
                      newAddress.postal_code && !isValidMuensterPLZ(newAddress.postal_code)
                        ? 'border-red-300 focus:ring-red-500 bg-red-50'
                        : 'border-gray-200 focus:ring-rose-500'
                    }`}
                  />
                  {newAddress.postal_code && !isValidMuensterPLZ(newAddress.postal_code) && (
                    <p className="text-xs text-red-500 mt-1">⚠️ Nur PLZ 48xxx (Münster)</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stadt</label>
                <input
                  type="text"
                  value="Münster"
                  disabled
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📝 Hinweise für Fahrer <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  placeholder="z.B. 3. Stock, Hinterhaus, Klingel defekt - bitte anrufen..."
                  value={newAddress.instructions}
                  onChange={(e) => setNewAddress({ ...newAddress, instructions: e.target.value })}
                  rows={2}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddressForm(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAddAddress}
                  className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600"
                >
                  Speichern
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              onClick={() => setShowAddressForm(true)}
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-rose-500 hover:text-rose-500 transition-colors"
            >
              <Plus size={20} /> Neue Adresse
            </button>
          )}
        </section>

        {/* Payment Method */}
        <section className="bg-white rounded-2xl p-4">
          <h2 className="font-semibold text-gray-900 mb-4">Zahlungsart</h2>
          
          <div className="space-y-3">
            {paymentMethods.map(method => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                  paymentMethod === method.id 
                    ? 'border-rose-500 bg-rose-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  paymentMethod === method.id ? 'bg-rose-100 text-rose-500' : 'bg-gray-100 text-gray-400'
                }`}>
                  <PaymentIcon method={method.id} />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{method.name}</span>
                    {method.badge && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        {method.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{method.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === method.id ? 'border-rose-500 bg-rose-500' : 'border-gray-300'
                }`}>
                  {paymentMethod === method.id && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </button>
            ))}
          </div>
          
          {paymentMethod === 'stripe' && (
            <div className="mt-4 p-3 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-700">
                💳 Du wirst zu unserem sicheren Zahlungsanbieter weitergeleitet. 
                Unterstützte Zahlungsarten: Kreditkarte, PayPal, Klarna, Sofortüberweisung.
              </p>
            </div>
          )}
        </section>

        {/* Notes */}
        <section className="bg-white rounded-2xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Anmerkungen</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Besondere Wünsche oder Hinweise für den Fahrer..."
            rows={2}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
          />
        </section>

        {/* Order Summary */}
        <section className="bg-white rounded-2xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Bestellübersicht</h2>
          
          {cart.map(item => (
            <div key={item.id} className="flex justify-between py-2 text-sm">
              <span className="text-gray-600">{item.quantity}x {item.name}</span>
              <span className="font-medium">{(item.price * item.quantity).toFixed(2)} €</span>
            </div>
          ))}
          
          <div className="border-t border-gray-100 mt-2 pt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Zwischensumme</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Lieferung</span>
              <span>{deliveryFee > 0 ? `${deliveryFee.toFixed(2)} €` : <span className="text-green-600">Kostenlos</span>}</span>
            </div>
            {deliveryFee > 0 && subtotal < 20 && (
              <p className="text-xs text-gray-400 mt-1">
                Noch {(20 - subtotal).toFixed(2)} € für kostenlose Lieferung
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Order Button */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-30">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex justify-between mb-3">
            <span className="text-gray-600">Gesamtsumme</span>
            <span className="font-bold text-xl">{total.toFixed(2)} €</span>
          </div>
          <button
            onClick={handleOrder}
            disabled={!selectedAddress || loading}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-colors shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : paymentMethod === 'stripe' ? (
              <>Zur Zahlung <ChevronRight size={20} /></>
            ) : (
              <>Jetzt bestellen <ChevronRight size={20} /></>
            )}
          </button>
          
          {paymentMethod === 'stripe' && (
            <p className="text-xs text-center text-gray-400 mt-2">
              Sichere Zahlung über Stripe
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
