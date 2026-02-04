import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Star, ArrowLeft, CheckCircle, Package, Truck, MessageCircle, Send } from 'lucide-react';
import { api } from '../store';

export default function Review() {
  const { orderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  
  // Rating state
  const [orderRating, setOrderRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [orderComment, setOrderComment] = useState('');
  const [driverComment, setDriverComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [orderNumber, token]);

  const loadOrder = async () => {
    try {
      // Try to get order with token
      const url = token 
        ? `/track/${orderNumber}?token=${token}`
        : `/track/${orderNumber}`;
      const { data } = await api.get(url);
      
      if (data.verified || data.orderNumber) {
        setOrder(data);
        // Check if already reviewed
        try {
          const { data: reviewData } = await api.get(`/reviews/${orderNumber}`);
          if (reviewData) {
            setExistingReview(reviewData);
          }
        } catch (e) {
          // No review yet, that's fine
        }
      } else {
        setError('Bestellung nicht gefunden');
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Bestellung konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!orderRating && !driverRating) {
      setError('Bitte gib mindestens eine Bewertung ab');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/reviews', {
        order_number: orderNumber,
        token,
        order_rating: orderRating || null,
        order_comment: orderComment || null,
        driver_rating: driverRating || null,
        driver_comment: driverComment || null
      });
      setSubmitted(true);
    } catch (e) {
      setError(e.response?.data?.error || 'Bewertung konnte nicht gespeichert werden');
    } finally {
      setSubmitting(false);
    }
  };

  // Star rating component
  const StarRating = ({ value, onChange, label, icon: Icon }) => (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
          <Icon size={24} className="text-rose-500" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{label}</h3>
          <p className="text-sm text-gray-500">Wie zufrieden warst du?</p>
        </div>
      </div>
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star 
              size={36} 
              className={`transition-colors ${
                star <= value 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-gray-200'
              }`}
            />
          </button>
        ))}
      </div>
      {value > 0 && (
        <p className="text-center mt-2 text-sm text-gray-500">
          {value === 5 && '🎉 Ausgezeichnet!'}
          {value === 4 && '👍 Sehr gut!'}
          {value === 3 && '😊 In Ordnung'}
          {value === 2 && '😕 Verbesserungswürdig'}
          {value === 1 && '😞 Nicht zufrieden'}
        </p>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Fehler</h1>
        <p className="text-gray-500 text-center mb-6">{error}</p>
        <Link 
          to="/"
          className="px-6 py-3 bg-rose-500 text-white rounded-xl font-medium"
        >
          Zur Startseite
        </Link>
      </div>
    );
  }

  // Already submitted or existing review
  if (submitted || existingReview) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {submitted ? 'Danke für deine Bewertung!' : 'Du hast bereits bewertet'}
            </h1>
            <p className="text-gray-500 mb-8">
              Dein Feedback hilft uns, noch besser zu werden.
            </p>
            
            {existingReview && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 text-left mb-6">
                <h3 className="font-bold text-gray-900 mb-3">Deine Bewertung</h3>
                {existingReview.order_rating && (
                  <div className="flex items-center gap-2 mb-2">
                    <Package size={18} className="text-gray-400" />
                    <span className="text-sm text-gray-600">Bestellung:</span>
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={16} className={s <= existingReview.order_rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                      ))}
                    </div>
                  </div>
                )}
                {existingReview.driver_rating && (
                  <div className="flex items-center gap-2">
                    <Truck size={18} className="text-gray-400" />
                    <span className="text-sm text-gray-600">Fahrer:</span>
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={16} className={s <= existingReview.driver_rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Link 
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-xl font-medium"
            >
              Weiter shoppen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Order not delivered yet
  if (order?.status !== 'delivered') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">📦</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Noch nicht geliefert</h1>
        <p className="text-gray-500 text-center mb-6">
          Du kannst erst bewerten, wenn deine Bestellung geliefert wurde.
        </p>
        <Link 
          to={`/track/${orderNumber}${token ? `?token=${token}` : ''}`}
          className="px-6 py-3 bg-rose-500 text-white rounded-xl font-medium"
        >
          Zur Sendungsverfolgung
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-lg border-b border-gray-100 z-50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <Link to={`/track/${orderNumber}${token ? `?token=${token}` : ''}`} className="p-2 -ml-2">
            <ArrowLeft size={24} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="font-bold text-gray-900">Bewertung abgeben</h1>
            <p className="text-sm text-gray-500">Bestellung {order?.orderNumber || `#${order?.id}`}</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Intro */}
        <div className="text-center py-4">
          <div className="text-5xl mb-3">⭐</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Wie war deine Erfahrung?</h2>
          <p className="text-gray-500">Dein Feedback ist uns wichtig!</p>
        </div>

        {/* Order Rating */}
        <StarRating 
          value={orderRating}
          onChange={setOrderRating}
          label="Bestellung & Service"
          icon={Package}
        />

        {orderRating > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle size={18} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Kommentar (optional)</span>
            </div>
            <textarea
              value={orderComment}
              onChange={(e) => setOrderComment(e.target.value)}
              placeholder="Was hat dir gefallen oder was können wir verbessern?"
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-rose-500 resize-none"
            />
          </div>
        )}

        {/* Driver Rating - only if order had a driver */}
        {order?.driver && (
          <>
            <StarRating 
              value={driverRating}
              onChange={setDriverRating}
              label="Fahrer"
              icon={Truck}
            />

            {driverRating > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle size={18} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Kommentar zum Fahrer (optional)</span>
                </div>
                <textarea
                  value={driverComment}
                  onChange={(e) => setDriverComment(e.target.value)}
                  placeholder="Wie war die Lieferung?"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>
            )}
          </>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={submitReview}
            disabled={submitting || (!orderRating && !driverRating)}
            className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send size={20} />
                Bewertung absenden
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
