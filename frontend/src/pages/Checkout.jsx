import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Plus, CreditCard, Banknote, Clock, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../store';

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, getCartTotal, addresses, selectedAddress, fetchAddresses, selectAddress, addAddress, createOrder } = useStore();
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ street: '', house_number: '', postal_code: '', instructions: '' });
  const [loading, setLoading] = useState(false);

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
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <Clock className="text-primary-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Geschätzte Lieferzeit</p>
              <p className="font-bold text-gray-900">15-20 Minuten</p>
            </div>
          </div>
        </section>

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
