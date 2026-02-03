import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Bot, User, AlertTriangle, Headphones } from 'lucide-react';
import { io } from 'socket.io-client';
import { useStore, api } from '../store';

export default function Support() {
  const { user } = useStore();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    initTicket();
    
    const s = io();
    s.on('support-message', (data) => {
      if (data.ticket_id === ticket?.id) {
        fetchMessages();
      }
    });
    setSocket(s);
    
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    if (ticket) {
      socket?.emit('join-support', ticket.id);
    }
  }, [ticket, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initTicket = async () => {
    try {
      const res = await api.post('/support/ticket', { order_id: orderId ? parseInt(orderId) : null });
      setTicket(res.data.ticket);
      setMessages(res.data.messages);
    } catch (e) {
      console.error('Error loading ticket:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!ticket) return;
    try {
      const res = await api.post('/support/ticket', { order_id: ticket.order_id });
      setMessages(res.data.messages);
    } catch (e) {
      console.error('Error fetching messages:', e);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || !ticket) return;
    
    const userMessage = input.trim();
    setInput('');
    setSending(true);
    
    // Optimistic update
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender_type: 'user',
      message: userMessage,
      created_at: new Date().toISOString()
    }]);
    
    try {
      const res = await api.post('/support/message', {
        ticket_id: ticket.id,
        message: userMessage
      });
      
      // Add AI/admin response
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender_type: res.data.escalated ? 'system' : 'ai',
        message: res.data.response,
        created_at: new Date().toISOString()
      }]);
      
      if (res.data.escalated) {
        setTicket(prev => ({ ...prev, escalated: 1 }));
      }
    } catch (e) {
      console.error('Error sending message:', e);
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Headphones size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Bitte einloggen</h2>
          <p className="text-gray-600 mb-4">Du musst eingeloggt sein, um den Support zu kontaktieren.</p>
          <Link to="/login" className="text-rose-500 font-medium">Zum Login →</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <Link to={orderId ? `/orders/${orderId}` : '/'} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Headphones size={20} className="text-rose-500" />
              Support
            </h1>
            <p className="text-sm text-gray-500">
              {ticket?.escalated ? '👤 Mit Mitarbeiter verbunden' : '🤖 KI-Assistent'}
            </p>
          </div>
        </div>
      </header>

      {/* Escalation Banner */}
      {ticket?.escalated ? (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle size={16} />
            <span>Du wurdest an einen Mitarbeiter weitergeleitet. Wir antworten so schnell wie möglich.</span>
          </div>
        </div>
      ) : null}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-lg mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div
              key={msg.id || i}
              className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-end gap-2 max-w-[85%] ${msg.sender_type === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.sender_type === 'user' 
                    ? 'bg-rose-500 text-white' 
                    : msg.sender_type === 'admin'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {msg.sender_type === 'user' ? (
                    <User size={16} />
                  ) : msg.sender_type === 'admin' ? (
                    <Headphones size={16} />
                  ) : (
                    <Bot size={16} />
                  )}
                </div>
                
                {/* Message Bubble */}
                <div className={`px-4 py-3 rounded-2xl ${
                  msg.sender_type === 'user'
                    ? 'bg-rose-500 text-white rounded-br-md'
                    : msg.sender_type === 'admin'
                    ? 'bg-blue-500 text-white rounded-bl-md'
                    : msg.sender_type === 'system'
                    ? 'bg-amber-100 text-amber-800 rounded-bl-md'
                    : 'bg-white text-gray-900 shadow-sm border border-gray-100 rounded-bl-md'
                }`}>
                  {msg.sender_type === 'ai' && (
                    <p className="text-xs text-gray-400 mb-1">Speeti Bot</p>
                  )}
                  {msg.sender_type === 'admin' && (
                    <p className="text-xs text-blue-100 mb-1">Support-Team</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                </div>
              </div>
            </div>
          ))}
          
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-end gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Bot size={16} className="text-gray-600" />
                </div>
                <div className="bg-white shadow-sm border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 p-4">
        <div className="max-w-lg mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Nachricht eingeben..."
            className="flex-1 px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="w-12 h-12 bg-rose-500 text-white rounded-xl flex items-center justify-center hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
      
      {/* Quick Actions */}
      {messages.length <= 2 && !ticket?.escalated && (
        <div className="bg-gray-50 border-t border-gray-100 p-4">
          <div className="max-w-lg mx-auto">
            <p className="text-xs text-gray-500 mb-2">Schnellfragen:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'Wie lange dauert die Lieferung?',
                'Bestellung stornieren',
                'Artikel fehlt',
                'Mit Mitarbeiter sprechen'
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
