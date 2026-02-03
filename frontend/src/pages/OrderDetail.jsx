import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Package, Truck, CheckCircle, MessageCircle, Send } from 'lucide-react';
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

  useEffect(() => {
    fetchOrder(id);
    
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

  const sendMessage = async () => {
    if (!message.trim()) return;
    await api.post(`/orders/${id}/messages`, { message });
    setMessage('');
  };

  if (!currentOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex(s => s.key === currentOrder.status);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/orders" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div>
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
                  className="h-full bg-primary-500 transition-all duration-500"
                  style={{ width: `${Math.max(0, (currentStepIndex / (statusSteps.length - 1)) * 100)}%` }}
                />
              </div>
              
              {statusSteps.map((step, i) => {
                const isActive = i <= currentStepIndex;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      <Icon size={16} />
                    </div>
                    <span className={`text-xs mt-2 ${isActive ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>
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

        {/* Delivery Address */}
        <section className="bg-white rounded-2xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin size={18} className="text-primary-500" /> Lieferadresse
          </h2>
          <p className="text-gray-600">{currentOrder.street} {currentOrder.house_number}</p>
          <p className="text-gray-600">{currentOrder.postal_code} {currentOrder.city}</p>
          {currentOrder.instructions && (
            <p className="text-sm text-gray-500 mt-2">📝 {currentOrder.instructions}</p>
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

        {/* Chat with Driver */}
        {currentOrder.driver_id && currentOrder.status !== 'delivered' && (
          <section className="bg-white rounded-2xl p-4">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MessageCircle size={18} className="text-primary-500" /> Chat mit Fahrer
            </h2>

            <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
              {currentOrder.messages?.map(msg => (
                <div 
                  key={msg.id}
                  className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.sender_id === user?.id 
                      ? 'ml-auto bg-primary-500 text-white rounded-br-md' 
                      : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`}
                >
                  {msg.message}
                </div>
              ))}
              {(!currentOrder.messages || currentOrder.messages.length === 0) && (
                <p className="text-gray-400 text-sm text-center py-4">Noch keine Nachrichten</p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Nachricht schreiben..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={sendMessage}
                className="w-10 h-10 bg-primary-500 text-white rounded-xl flex items-center justify-center hover:bg-primary-600 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
