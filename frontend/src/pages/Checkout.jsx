import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Plus, CreditCard, Banknote, Clock, ChevronRight, Calendar, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../store';

// Generate time slots
const generateTimeSlots = () => {
  const slots = [];
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  
  // Today's slots (from now + 30min, rounded to 30min intervals)
  let startHour = currentHour;
  let startMin = currentMin < 30 ? 30 : 0;
  if (currentMin >= 30) startHour++;
  
  // If too late today, skip
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
  
  // Tomorrow's slots
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

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, getCartTotal, addresses, selectedAddress, fetchAddresses, selectAddress, addAddress, createOrder } = useStore();
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ street: '', house_number: '', postal_code: '', instructions: '' });
  const [loading, setLoading] = useState(false);
  const [deliveryType, setDeliveryType] = useState('asap'); // 'asap' or 'scheduled'
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const timeSlots = generateTimeSlots();

  const subtotal = getCartTotal();
  const deliveryFee = subtotal >= 20 ? 0 : 2.99;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleAddAddress = async () => {
    if (!newAddress.street || !newAddress.house_number || !newAddress.postal_code) return;
    await addAddress({ ...newAddress, is_default: true });
    setShowAddressForm(false);
    setNewAddress({ street: '', house_number: '', postal_code: '', instructions: '' });
  };

  const handleOrder = async () => {
    if (!selectedAddress) return;
    setLoading(true);
    try {
      const order = await createOrder(selectedAddress.id, paymentMethod, notes);
      navigate(`/orders/${order.id}`);
    } catch (e) {
      alert('Fehler bei der Bestellung');
    }
    setLoading(false);
  };

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

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Delivery Time */}
        <section className="bg-white rounded-2xl p-4">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-primary-500" /> Lieferzeit
          </h2>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => { setDeliveryType('asap'); setSelectedSlot(null); }}
              className={`p-4 rounded-xl border-2 transition-all ${
                deliveryType === 'asap' 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Zap className={`mx-auto mb-2 ${deliveryType === 'asap' ? 'text-primary-500' : 'text-gray-400'}`} size={24} />
              <p className="font-semibold text-sm">Schnellstmöglich</p>
              <p className="text-xs text-gray-500">15-20 Minuten</p>
            </button>
            
            <button
              onClick={() => setShowTimeSlots(true)}
              className={`p-4 rounded-xl border-2 transition-all ${
                deliveryType === 'scheduled' 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Calendar className={`mx-auto mb-2 ${deliveryType === 'scheduled' ? 'text-primary-500' : 'text-gray-400'}`} size={24} />
              <p className="font-semibold text-sm">Vorbestellen</p>
              <p className="text-xs text-gray-500">
                {selectedSlot ? selectedSlot.label : 'Zeit wählen'}
              </p>
            </button>
          </div>

          {deliveryType === 'asap' && (
            <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl">
              <Zap className="text-primary-500" size={20} />
              <p className="text-sm text-primary-700">Lieferung in <strong>15-20 Minuten</strong></p>
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
                          ? 'border-primary-500 bg-primary-50' 
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

        {/* Delivery Address */}
        <section className="bg-white rounded-2xl p-4">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-primary-500" /> Lieferadresse
          </h2>

          {addresses.map(addr => (
            <button
              key={addr.id}
              onClick={() => selectAddress(addr)}
              className={`w-full text-left p-3 rounded-xl mb-2 border-2 transition-colors ${
                selectedAddress?.id === addr.id 
                  ? 'border-primary-500 bg-primary-50' 
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
              <input
                type="text"
                placeholder="Straße"
                value={newAddress.street}
                onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Hausnr."
                  value={newAddress.house_number}
                  onChange={(e) => setNewAddress({ ...newAddress, house_number: e.target.value })}
                  className="w-1/3 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="text"
                  placeholder="PLZ"
                  value={newAddress.postal_code}
                  onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                  className="w-2/3 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <input
                type="text"
                placeholder="Hinweise für Fahrer (optional)"
                value={newAddress.instructions}
                onChange={(e) => setNewAddress({ ...newAddress, instructions: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddressForm(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAddAddress}
                  className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600"
                >
                  Speichern
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              onClick={() => setShowAddressForm(true)}
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors"
            >
              <Plus size={20} /> Neue Adresse
            </button>
          )}
        </section>

        {/* Payment Method */}
        <section className="bg-white rounded-2xl p-4">
          <h2 className="font-semibold text-gray-900 mb-4">Zahlungsart</h2>
          
          <div className="space-y-2">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
                paymentMethod === 'cash' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
              }`}
            >
              <Banknote size={24} className={paymentMethod === 'cash' ? 'text-primary-500' : 'text-gray-400'} />
              <span className="font-medium">Bar bei Lieferung</span>
            </button>
            
            <button
              onClick={() => setPaymentMethod('card')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
                paymentMethod === 'card' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
              }`}
            >
              <CreditCard size={24} className={paymentMethod === 'card' ? 'text-primary-500' : 'text-gray-400'} />
              <span className="font-medium">Karte bei Lieferung</span>
            </button>
          </div>
        </section>

        {/* Notes */}
        <section className="bg-white rounded-2xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Anmerkungen</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Besondere Wünsche..."
            rows={2}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
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
        </section>
      </div>

      {/* Order Button */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 safe-bottom">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex justify-between mb-3">
            <span className="text-gray-600">Gesamt</span>
            <span className="font-bold text-lg">{total.toFixed(2)} €</span>
          </div>
          <button
            onClick={handleOrder}
            disabled={!selectedAddress || loading}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white font-semibold py-4 rounded-2xl transition-colors shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Jetzt bestellen <ChevronRight size={20} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
