import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Zap, ArrowLeft, User, Phone, Sparkles, AlertCircle, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore, api } from '../store';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const setToken = useStore(state => state.setToken);
  const fetchUser = useStore(state => state.fetchUser);

  // Phone validation - German format
  const isValidPhone = (phone) => {
    const cleaned = phone.replace(/\s/g, '').replace(/-/g, '');
    return /^(\+49|0049|0)[1-9]\d{8,14}$/.test(cleaned);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation for registration
    if (isRegister) {
      if (!form.phone || !isValidPhone(form.phone)) {
        setError('Bitte gib eine gültige deutsche Handynummer ein (z.B. +49 151 12345678)');
        return;
      }
      if (!acceptedTerms) {
        setError('Bitte akzeptiere die AGB und Datenschutzerklärung');
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister 
        ? form 
        : { email: form.email, password: form.password };
      
      const res = await api.post(endpoint, payload);
      localStorage.setItem('speeti-token', res.data.token);
      setToken(res.data.token);
      await fetchUser();
      navigate(redirect);
    } catch (err) {
      setError(err.response?.data?.error || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 flex items-center justify-center p-4">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        {/* Back Button */}
        <Link 
          to="/"
          className="absolute -top-12 left-0 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Zurück</span>
        </Link>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-8 text-center border-b border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/30">
              <Zap className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isRegister ? 'Konto erstellen' : 'Willkommen zurück!'}
            </h1>
            <p className="text-gray-500 mt-1">
              {isRegister 
                ? 'Registriere dich und bestelle in Minuten'
                : 'Melde dich an, um fortzufahren'
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start gap-2"
              >
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Max Mustermann"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-Mail <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="max@beispiel.de"
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Handynummer <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+49 151 12345678"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  📱 Wichtig für Lieferbenachrichtigungen & Fahrer-Kontakt
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passwort <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {isRegister && (
                <p className="text-xs text-gray-500 mt-1">Mindestens 6 Zeichen</p>
              )}
            </div>

            {/* Terms Checkbox for Registration */}
            {isRegister && (
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setAcceptedTerms(!acceptedTerms)}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    acceptedTerms 
                      ? 'bg-rose-500 border-rose-500 text-white' 
                      : 'border-gray-300 hover:border-rose-400'
                  }`}
                >
                  {acceptedTerms && <Check size={14} />}
                </button>
                <span className="text-sm text-gray-600">
                  Ich akzeptiere die{' '}
                  <a href="#" className="text-rose-500 hover:underline">AGB</a>
                  {' '}und{' '}
                  <a href="#" className="text-rose-500 hover:underline">Datenschutzerklärung</a>
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-rose-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles size={18} />
                  {isRegister ? 'Konto erstellen' : 'Anmelden'}
                </>
              )}
            </button>

            {!isRegister && (
              <Link to="/reset-password" className="block text-center mt-4 text-sm text-gray-500 hover:text-rose-500">
                Passwort vergessen?
              </Link>
            )}
          </form>

          {/* Footer */}
          <div className="px-8 pb-8 text-center">

            <p className="text-gray-500 text-sm">
              {isRegister ? 'Bereits ein Konto?' : 'Noch kein Konto?'}{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(!isRegister); setError(''); setAcceptedTerms(false); }}
                className="text-rose-600 font-semibold hover:underline"
              >
                {isRegister ? 'Anmelden' : 'Registrieren'}
              </button>
            </p>
          </div>
        </div>

        {/* Service Area Notice */}
        <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-white/90 text-sm">
          <p className="flex items-center gap-2">
            <span>📍</span>
            <span>Aktuell liefern wir nur in <strong>Münster</strong> und Umgebung</span>
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="mt-3 bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-white/80 text-sm">
          <p className="font-semibold mb-2 text-white">🔐 Demo-Zugänge:</p>
          <div className="space-y-1 text-xs">
            <p>Admin: <code className="bg-white/20 px-2 py-0.5 rounded">admin@speeti.de</code> / <code className="bg-white/20 px-2 py-0.5 rounded">admin123</code></p>
            <p>Fahrer: <code className="bg-white/20 px-2 py-0.5 rounded">fahrer@speeti.de</code> / <code className="bg-white/20 px-2 py-0.5 rounded">fahrer123</code></p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
