import { useState } from 'react';
import { Star, X, Send } from 'lucide-react';
import { api } from '../store';

export default function RatingModal({ orderId, driverName, onClose, onRated }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const labels = {
    1: 'Schlecht',
    2: 'Geht so',
    3: 'Okay',
    4: 'Gut',
    5: 'Super!'
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Bitte wähle eine Bewertung');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post(`/orders/${orderId}/rating`, { rating, comment });
      onRated?.();
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-rose-500 to-pink-500 p-6 text-center text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
          >
            <X size={18} />
          </button>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Star size={32} />
          </div>
          <h2 className="text-xl font-bold">Wie war's?</h2>
          <p className="text-rose-100 text-sm mt-1">Bewerte {driverName || 'deinen Fahrer'}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Stars */}
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  size={40}
                  className={`${
                    star <= (hoveredRating || rating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-300'
                  } transition-colors`}
                />
              </button>
            ))}
          </div>

          {/* Label */}
          <p className="text-center font-semibold text-gray-900 h-6 mb-4">
            {labels[hoveredRating || rating] || 'Tippe auf die Sterne'}
          </p>

          {/* Comment */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optionaler Kommentar..."
            rows={3}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none text-sm"
          />

          {/* Error */}
          {error && (
            <p className="text-red-500 text-sm text-center mt-2">{error}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || rating === 0}
            className="w-full mt-4 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send size={18} /> Bewertung abschicken
              </>
            )}
          </button>

          {/* Skip */}
          <button
            onClick={onClose}
            className="w-full mt-2 py-2 text-gray-500 text-sm hover:text-gray-700"
          >
            Später bewerten
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
