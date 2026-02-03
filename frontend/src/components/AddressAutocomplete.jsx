import { useState, useEffect, useRef, memo } from 'react';
import { MapPin, Search, X } from 'lucide-react';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic3BlZXRpc3BlZXRpIiwiYSI6ImNtbDZ6dHJ4ZzAyZzczY3NpeDdhNHE4aWYifQ.WiNxZwRzk9aPGN9DrjyT3Q';

const AddressAutocomplete = memo(function AddressAutocomplete({ 
  value, 
  onChange, 
  onSelect,
  placeholder = "Straße suchen...",
  className = ""
}) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Sync external value
  useEffect(() => {
    if (value !== undefined && value !== query) {
      setQuery(value);
    }
  }, [value]);

  // Search addresses
  useEffect(() => {
    if (!query || query.length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query + ' Münster Deutschland')}.json?` +
          `access_token=${MAPBOX_TOKEN}&` +
          `language=de&` +
          `country=de&` +
          `bbox=7.45,51.85,7.80,52.08&` +
          `types=address&` +
          `limit=5`
        );
        const data = await response.json();
        
        const parsed = (data.features || []).map(place => {
          const context = place.context || [];
          let postalCode = '';
          let city = 'Münster';
          
          context.forEach(c => {
            if (c.id.startsWith('postcode')) postalCode = c.text;
            if (c.id.startsWith('place')) city = c.text;
          });

          return {
            id: place.id,
            street: place.text || '',
            houseNumber: place.address || '',
            postalCode,
            city,
            fullAddress: place.place_name,
            lng: place.center[0],
            lat: place.center[1]
          };
        }).filter(a => a.postalCode.startsWith('48')); // Only Münster

        setResults(parsed);
        setShowResults(parsed.length > 0);
      } catch (e) {
        console.error('Address search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange?.(val);
    setShowResults(true);
  };

  const handleSelect = (address) => {
    setQuery(address.street);
    setShowResults(false);
    onSelect?.(address);
  };

  const clearInput = () => {
    setQuery('');
    onChange?.('');
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 ${className}`}
        />
        {query && (
          <button
            type="button"
            onClick={clearInput}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}
        {isSearching && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
          {results.map((address) => (
            <button
              key={address.id}
              type="button"
              onClick={() => handleSelect(address)}
              className="w-full flex items-start gap-3 p-3 hover:bg-rose-50 active:bg-rose-100 border-b border-gray-100 last:border-0 text-left transition-colors"
            >
              <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin size={16} className="text-rose-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 text-sm">
                  {address.street} {address.houseNumber}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {address.postalCode} {address.city}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default AddressAutocomplete;
