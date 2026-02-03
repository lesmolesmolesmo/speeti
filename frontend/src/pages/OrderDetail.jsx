import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Package, Truck, CheckCircle, MessageCircle, Send, Phone, Headphones, User, FileText, Download, Star } from 'lucide-react';
import RatingModal from '../components/RatingModal';
import { io } from 'socket.io-client';
import { useStore, api } from '../store';

const statusSteps = [
  { key: 'confirmed', label: 'Bestätigt', icon: Package },
  { key: 'picking', label: 'Wird gepackt', icon: Package },
  { key: 'delivering', label: 'Unterwegs', icon: Truck },
  { key: 'delivered', label: 'Geliefert', icon: CheckCircle }
];

export default function OrderDetail() {
  const { id } = useParams();
  const { currentOrder, fetchOrder, user } = useStore();
  const [message, setMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchOrder(id);
    checkRating();
    
    const s = io();
    s.emit('join-order', id);
    
    s.on('order-update', (data) => {
      if (data.orderId === parseInt(id)) {
        fetchOrder(id);
      }
    });
    
    s.on('new-message', (msg) => {
      if (msg.order_id === parseInt(id)) {
        fetchOrder(id);
      }
    });
    
    setSocket(s);
    return () => s.disconnect();
  }, [id]);

  const checkRating = async () => {
    try {
      const { data } = await api.get(`/orders/${id}/rating`);
      setHasRated(!!data);
    } catch (e) {
      setHasRated(false);
    }
  };

  useEffect(() => {
    if (showChat && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentOrder?.messages, showChat]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    await api.post(`/orders/${id}/messages`, { message });
    setMessage('');
  };

  if (!currentOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex(s => s.key === currentOrder.status);
  const hasDriver = currentOrder.driver_id && currentOrder.status !== 'delivered';
  const isActive = ['confirmed', 'picking', 'delivering'].includes(currentOrder.status);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/orders" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Bestellung #{currentOrder.id}</h1>
            <p className="text-sm text-gray-500">
              {new Date(currentOrder.created_at).toLocaleDateString('de-DE', { 
                day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Status Timeline */}
        {currentOrder.status !== 'cancelled' && (
          <section className="bg-white rounded-2xl p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Bestellstatus</h2>
            
            <div className="flex items-center justify-between relative">
              {/* Progress Line */}
              <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200">
                <div 
                  className="h-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${Math.max(0, (currentStepIndex / (statusSteps.length - 1)) * 100)}%` }}
                />
              </div>
              
              {statusSteps.map((step, i) => {
                const isStepActive = i <= currentStepIndex;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isStepActive ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      <Icon size={16} />
                    </div>
                    <span className={`text-xs mt-2 ${isStepActive ? 'text-rose-600 font-medium' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {currentOrder.estimated_delivery && currentOrder.status !== 'delivered' && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <Clock size={16} />
                <span>Geschätzte Ankunft: {new Date(currentOrder.estimated_delivery).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
              </div>
            )}
          </section>
        )}

        {/* Driver Info & Contact */}
        {hasDriver && (
          <section className="bg-white rounded-2xl p-4">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Truck size={18} className="text-rose-500" /> Dein Fahrer
            </h2>
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center">
                <User size={24} className="text-rose-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{currentOrder.driver_name || 'Fahrer'}</p>
                <p className="text-sm text-gray-500">Unterwegs zu dir</p>
              </div>
            </div>
            
            {/* Contact Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {currentOrder.driver_phone && (
                <a
                  href={`tel:${currentOrder.driver_phone}`}
                  className="flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
                >
                  <Phone size={18} />
                  Anrufen
                </a>
              )}
              <button
                onClick={() => setShowChat(true)}
                className="flex items-center justify-center gap-2 py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors"
              >
                <MessageCircle size={18} />
                Chat
              </button>
            </div>
          </section>
        )}

        {/* Support Contact - Always visible */}
        <section className="bg-white rounded-2xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Headphones size={18} className="text-rose-500" /> Hilfe & Support
          </h2>
          
          <p className="text-sm text-gray-600 mb-4">
            Problem mit der Bestellung? Unser KI-Assistent hilft dir sofort - oder leitet dich an einen Mitarbeiter weiter.
          </p>
          
          <Link
            to={`/support?order=${currentOrder.id}`}
            className="flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            <Headphones size={18} />
            Support kontaktieren
          </Link>
        </section>

        {/* Delivery Address */}
        <section className="bg-white rounded-2xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin size={18} className="text-rose-500" /> Lieferadresse
          </h2>
          <p className="text-gray-600">{currentOrder.street} {currentOrder.house_number}</p>
          <p className="text-gray-600">{currentOrder.postal_code} {currentOrder.city}</p>
          {currentOrder.instructions && (
            <p className="text-sm text-gray-500 mt-2 italic">"{currentOrder.instructions}"</p>
          )}
        </section>

        {/* Order Items */}
        <section className="bg-white rounded-2xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Artikel</h2>
          
          {currentOrder.items?.map(item => (
            <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-500">{item.quantity}x {item.price?.toFixed(2)} €</p>
              </div>
              <span className="font-medium">{(item.quantity * item.price).toFixed(2)} €</span>
            </div>
          ))}

          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Zwischensumme</span>
              <span>{currentOrder.subtotal?.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Lieferung</span>
              <span>{currentOrder.delivery_fee?.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base">
              <span>Gesamt</span>
              <span>{currentOrder.total?.toFixed(2)} €</span>
            </div>
          </div>
        </section>

        {/* Invoice/Receipt Section */}
        {currentOrder.status === 'delivered' && (
          <section className="bg-white rounded-2xl p-4">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText size={18} className="text-rose-500" /> Rechnung / Quittung
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Rechnungsnummer</span>
                <span className="font-medium">RE-{String(currentOrder.id).padStart(5, '0')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Bestelldatum</span>
                <span className="font-medium">
                  {new Date(currentOrder.created_at).toLocaleDateString('de-DE')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Gesamtbetrag</span>
                <span className="font-bold text-rose-500">{currentOrder.total?.toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Zahlungsstatus</span>
                <span className={`font-medium ${currentOrder.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                  {currentOrder.payment_status === 'paid' ? '✓ Bezahlt' : 'Ausstehend'}
                </span>
              </div>
              
              <a
                href={`/api/orders/${currentOrder.id}/invoice`}
                target="_blank"
                className="flex items-center justify-center gap-2 w-full py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors mt-4"
              >
                <Download size={18} />
                Rechnung herunterladen (PDF)
              </a>
              
              <p className="text-xs text-center text-gray-400 mt-2">
                Die Rechnung enthält alle steuerlichen Angaben gemäß § 14 UStG.
              </p>
            </div>
          </section>
        )}

        {/* Rating Section */}
        {currentOrder.status === 'delivered' && currentOrder.driver_id && (
          <section className="bg-white rounded-2xl p-4">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Star size={18} className="text-amber-500" /> Bewertung
            </h2>
            
            {hasRated ? (
              <div className="text-center py-4">
                <div className="flex justify-center gap-1 mb-2">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={24} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-500">Danke für deine Bewertung! ⭐</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600 mb-4">
                  Wie war deine Erfahrung mit {currentOrder.driver_name || 'deinem Fahrer'}?
                </p>
                <button
                  onClick={() => setShowRating(true)}
                  className="px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-xl flex items-center gap-2 mx-auto hover:shadow-lg transition-shadow"
                >
                  <Star size={18} /> Jetzt bewerten
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Rating Modal */}
      {showRating && (
        <RatingModal
          orderId={currentOrder.id}
          driverName={currentOrder.driver_name}
          onClose={() => setShowRating(false)}
          onRated={() => { setHasRated(true); checkRating(); }}
        />
      )}

      {/* Chat Modal */}
      {showChat && hasDriver && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center lg:justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-2xl lg:rounded-2xl max-h-[80vh] flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                  <User size={20} className="text-rose-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{currentOrder.driver_name || 'Fahrer'}</p>
                  <p className="text-xs text-green-500">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentOrder.driver_phone && (
                  <a
                    href={`tel:${currentOrder.driver_phone}`}
                    className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
                  >
                    <Phone size={18} />
                  </a>
                )}
                <button
                  onClick={() => setShowChat(false)}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
              {currentOrder.messages?.length > 0 ? (
                currentOrder.messages.map(msg => (
                  <div 
                    key={msg.id}
                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.sender_id === user?.id 
                        ? 'ml-auto bg-rose-500 text-white rounded-br-md' 
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}
                  >
                    {msg.sender_id !== user?.id && (
                      <p className="text-xs text-gray-500 mb-1">{msg.sender_name}</p>
                    )}
                    {msg.message}
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Noch keine Nachrichten</p>
                  <p className="text-xs mt-1">Schreib deinem Fahrer eine Nachricht</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Nachricht an Fahrer..."
                  className="flex-1 px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  className="w-12 h-12 bg-rose-500 text-white rounded-xl flex items-center justify-center hover:bg-rose-600 transition-colors disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
