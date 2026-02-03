import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Search, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useStore } from '../store';

// Münster Liefergebiet (Umkreis ~10km vom Zentrum)
const DELIVERY_CENTER = { lat: 51.9607, lng: 7.6261 }; // Münster Zentrum
const DELIVERY_RADIUS_KM = 10;

// Distanz berechnen (Haversine)
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function AddressModal({ isOpen, onClose }) {
  const { addAddress } = useStore();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [deliveryStatus, setDeliveryStatus] = useState(null); // 'available' | 'unavailable'
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const debounceRef = useRef(null);

  // Autocomplete mit OpenStreetMap Nominatim
  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=de&limit=5&addressdetails=1`
        );
        const data = await res.json();
        setSuggestions(data.map(item => ({
          display: item.display_name,
          street: item.address?.road || '',
          houseNumber: item.address?.house_number || '',
          postcode: item.address?.postcode || '',
          city: item.address?.city || item.address?.town || item.address?.village || '',
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        })));
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }, 300);
  }, [query]);

  const selectSuggestion = (suggestion) => {
    setSelectedAddress(suggestion);
    setQuery(suggestion.display);
    setSuggestions([]);
    
    // Check if in delivery area
    const distance = getDistanceKm(
      DELIVERY_CENTER.lat, DELIVERY_CENTER.lng,
      suggestion.lat, suggestion.lng
    );
    
    if (distance <= DELIVERY_RADIUS_KM) {
      setDeliveryStatus('available');
    } else {
      setDeliveryStatus('unavailable');
    }
  };

  const confirmAddress = async () => {
    if (!selectedAddress || deliveryStatus !== 'available') return;
    
    try {
      await addAddress({
        street: selectedAddress.street,
        house_number: selectedAddress.houseNumber,
        postal_code: selectedAddress.postcode,
        city: selectedAddress.city || 'Münster',
        lat: selectedAddress.lat,
        lng: selectedAddress.lng,
        is_default: true
      });
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const submitWaitlist = () => {
    if (!waitlistEmail) return;
    // Hier könnte man die Email speichern
    setWaitlistSubmitted(true);
    setTimeout(() => {
      setShowWaitlist(false);
      setWaitlistSubmitted(false);
      setWaitlistEmail('');
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Lieferadresse</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Search Input */}
          <div className="relative">
            <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedAddress(null);
                setDeliveryStatus(null);
              }}
              placeholder="Straße und Hausnummer eingeben..."
              className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              autoFocus
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => selectSuggestion(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-3"
                >
                  <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 line-clamp-2">{suggestion.display}</span>
                </button>
              ))}
            </div>
          )}

          {/* Delivery Status */}
          {deliveryStatus === 'available' && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
              <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Wir liefern zu dir!</p>
                <p className="text-sm text-green-600 mt-1">Lieferung in 15-20 Minuten möglich</p>
              </div>
            </div>
          )}

          {deliveryStatus === 'unavailable' && !showWaitlist && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Noch nicht in deinem Gebiet</p>
                  <p className="text-sm text-amber-600 mt-1">
                    Wir sind aktuell nur in Münster und Umgebung verfügbar. Bald kommen wir auch zu dir!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWaitlist(true)}
                className="mt-3 w-full py-2.5 bg-amber-100 text-amber-800 font-medium rounded-lg hover:bg-amber-200 transition-colors"
              >
                Auf Warteliste setzen
              </button>
            </div>
          )}

          {/* Waitlist Form */}
          {showWaitlist && !waitlistSubmitted && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={18} className="text-gray-600" />
                <p className="font-medium text-gray-800">Warteliste</p>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Wir benachrichtigen dich, sobald wir in deinem Gebiet verfügbar sind.
              </p>
              <input
                type="email"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                placeholder="Deine E-Mail-Adresse"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 mb-3"
              />
              <button
                onClick={submitWaitlist}
                className="w-full py-2.5 bg-rose-500 text-white font-medium rounded-lg hover:bg-rose-600 transition-colors"
              >
                Benachrichtigen
              </button>
            </div>
          )}

          {waitlistSubmitted && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <CheckCircle size={20} className="text-green-600" />
              <p className="text-green-800 font-medium">Du bist auf der Warteliste!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {deliveryStatus === 'available' && (
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={confirmAddress}
              className="w-full py-3 bg-rose-500 text-white font-semibold rounded-xl hover:bg-rose-600 transition-colors"
            >
              Adresse bestätigen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
