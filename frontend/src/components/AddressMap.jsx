import { useEffect, useRef, useState, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapPin, Search, Navigation, X, Check, AlertCircle, Crosshair } from 'lucide-react';

// Mapbox Token
mapboxgl.accessToken = 'pk.eyJ1Ijoic3BlZXRpc3BlZXRpIiwiYSI6ImNtbDZ6dHJ4ZzAyZzczY3NpeDdhNHE4aWYifQ.WiNxZwRzk9aPGN9DrjyT3Q';

// Münster center coordinates
const MUENSTER_CENTER = [7.6261, 51.9607];

// Check if location is in Münster delivery area
const isInMuenster = (lng, lat) => {
  return lng >= 7.45 && lng <= 7.80 && lat >= 51.85 && lat <= 52.08;
};

const AddressMap = memo(function AddressMap({ 
  onAddressSelect, 
  onClose
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: MUENSTER_CENTER,
        zoom: 13,
        maxBounds: [
          [7.0, 51.5],
          [8.2, 52.3]
        ]
      });

      map.current.on('load', () => {
        setMapReady(true);
        
        // Add delivery area outline
        map.current.addSource('delivery-area', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [7.52, 51.88],
                [7.72, 51.88],
                [7.75, 51.92],
                [7.75, 52.02],
                [7.70, 52.05],
                [7.55, 52.05],
                [7.50, 52.00],
                [7.48, 51.94],
                [7.52, 51.88]
              ]]
            }
          }
        });

        map.current.addLayer({
          id: 'delivery-area-fill',
          type: 'fill',
          source: 'delivery-area',
          paint: {
            'fill-color': '#e11d48',
            'fill-opacity': 0.1
          }
        });

        map.current.addLayer({
          id: 'delivery-area-outline',
          type: 'line',
          source: 'delivery-area',
          paint: {
            'line-color': '#e11d48',
            'line-width': 3,
            'line-dasharray': [2, 2]
          }
        });
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Create draggable marker
      marker.current = new mapboxgl.Marker({
        color: '#e11d48',
        draggable: true
      })
        .setLngLat(MUENSTER_CENTER)
        .addTo(map.current);

      // Handle marker drag
      marker.current.on('dragend', async () => {
        const lngLat = marker.current.getLngLat();
        await reverseGeocode(lngLat.lng, lngLat.lat);
      });

      // Handle map click
      map.current.on('click', async (e) => {
        marker.current.setLngLat(e.lngLat);
        await reverseGeocode(e.lngLat.lng, e.lngLat.lat);
      });

    } catch (err) {
      console.error('Map init error:', err);
      setError('Karte konnte nicht geladen werden');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation nicht unterstützt');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { longitude, latitude } = pos.coords;
        
        if (isInMuenster(longitude, latitude)) {
          map.current?.flyTo({ center: [longitude, latitude], zoom: 16 });
          marker.current?.setLngLat([longitude, latitude]);
          await reverseGeocode(longitude, latitude);
        } else {
          setError('Dein Standort liegt außerhalb von Münster');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Standort konnte nicht ermittelt werden');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Reverse geocode coordinates to address
  const reverseGeocode = async (lng, lat) => {
    if (!isInMuenster(lng, lat)) {
      setError('Diese Adresse liegt außerhalb von Münster');
      setSelectedLocation(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&language=de&types=address`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const place = data.features[0];
        const address = parseMapboxPlace(place);
        
        if (address.postal_code && address.postal_code.startsWith('48')) {
          setSelectedLocation(address);
          setError(null);
        } else {
          setError('Nur Lieferung nach Münster (PLZ 48xxx)');
          setSelectedLocation(null);
        }
      } else {
        // Try broader search
        const response2 = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&language=de`
        );
        const data2 = await response2.json();
        
        if (data2.features && data2.features.length > 0) {
          const place = data2.features[0];
          const address = parseMapboxPlace(place);
          setSelectedLocation({
            ...address,
            street: address.street || 'Unbekannte Straße',
            house_number: address.house_number || '',
            postal_code: address.postal_code || '48149',
            needsManualInput: !address.street
          });
        } else {
          setError('Keine Adresse gefunden - bitte Straße manuell eingeben');
        }
      }
    } catch (e) {
      console.error('Geocoding error:', e);
      setError('Fehler bei der Adresssuche');
    } finally {
      setLoading(false);
    }
  };

  // Parse Mapbox place to address components
  const parseMapboxPlace = (place) => {
    const context = place.context || [];
    const address = {
      full: place.place_name,
      street: '',
      house_number: '',
      postal_code: '',
      city: 'Münster',
      lng: place.center[0],
      lat: place.center[1]
    };

    if (place.text) {
      address.street = place.text;
    }
    if (place.address) {
      address.house_number = place.address;
    }

    context.forEach(c => {
      if (c.id.startsWith('postcode')) {
        address.postal_code = c.text;
      }
      if (c.id.startsWith('place')) {
        address.city = c.text;
      }
    });

    return address;
  };

  // Search for addresses
  const searchAddresses = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query + ' Münster')}.json?` +
        `access_token=${mapboxgl.accessToken}&` +
        `language=de&` +
        `country=de&` +
        `bbox=7.45,51.85,7.80,52.08&` +
        `types=address,poi&` +
        `limit=5`
      );
      const data = await response.json();
      setSearchResults(data.features || []);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setSearching(false);
    }
  };

  // Handle search input
  useEffect(() => {
    const timer = setTimeout(() => {
      searchAddresses(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Select search result
  const selectSearchResult = async (place) => {
    const [lng, lat] = place.center;
    
    map.current?.flyTo({
      center: [lng, lat],
      zoom: 17,
      duration: 1000
    });

    marker.current?.setLngLat([lng, lat]);
    
    const address = parseMapboxPlace(place);
    if (address.postal_code && address.postal_code.startsWith('48')) {
      setSelectedLocation(address);
      setError(null);
    } else {
      setError('Diese Adresse liegt außerhalb von Münster');
      setSelectedLocation(null);
    }

    setSearchQuery('');
    setSearchResults([]);
  };

  // Confirm selected location
  const confirmLocation = () => {
    if (selectedLocation) {
      onAddressSelect({
        street: selectedLocation.street,
        house_number: selectedLocation.house_number,
        postal_code: selectedLocation.postal_code,
        city: selectedLocation.city || 'Münster',
        lat: selectedLocation.lat,
        lng: selectedLocation.lng
      });
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex flex-col"
      style={{ zIndex: 9999 }}
    >
      {/* Header - Fixed */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900">📍 Adresse wählen</h2>
        <button 
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Search - Fixed */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Adresse suchen..."
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-base"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="absolute left-4 right-4 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden" style={{ zIndex: 10000 }}>
            {searchResults.map((place, i) => (
              <button
                key={place.id || i}
                onClick={() => selectSearchResult(place)}
                className="w-full flex items-start gap-3 p-3 hover:bg-rose-50 border-b border-gray-100 last:border-0 text-left active:bg-rose-100"
              >
                <MapPin size={18} className="text-rose-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-sm truncate">{place.text}</p>
                  <p className="text-xs text-gray-500 truncate">{place.place_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Container - Flexible */}
      <div className="flex-1 relative min-h-0">
        <div ref={mapContainer} className="absolute inset-0" />
        
        {/* Map Loading State */}
        {!mapReady && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-600">Karte wird geladen...</p>
            </div>
          </div>
        )}

        {/* Current Location Button */}
        <button
          onClick={getCurrentLocation}
          disabled={loading}
          className="absolute bottom-4 left-4 bg-white shadow-lg rounded-xl px-4 py-3 flex items-center gap-2 active:bg-gray-50 disabled:opacity-50"
          style={{ zIndex: 10 }}
        >
          <Crosshair size={20} className="text-rose-500" />
          <span className="text-sm font-medium">Mein Standort</span>
        </button>
        
        {/* Delivery Area Legend */}
        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg text-xs" style={{ zIndex: 10 }}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-rose-500/10 border-2 border-rose-500 border-dashed rounded" />
            <span className="text-gray-700">Liefergebiet</span>
          </div>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center" style={{ zIndex: 20 }}>
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <div className="w-8 h-8 border-3 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mx-auto" />
              <p className="text-gray-600 mt-3 text-sm">Adresse wird gesucht...</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel - Fixed */}
      <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0 safe-bottom">
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {selectedLocation ? (
          <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin size={20} className="text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">
                  {selectedLocation.street} {selectedLocation.house_number}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedLocation.postal_code} {selectedLocation.city}
                </p>
              </div>
              <Check size={22} className="text-green-500 flex-shrink-0" />
            </div>
          </div>
        ) : (
          <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <Navigation size={20} className="text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-700">Tippe auf die Karte</p>
                <p className="text-xs text-gray-500">oder suche eine Adresse</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={confirmLocation}
          disabled={!selectedLocation}
          className="w-full py-4 bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 text-base"
        >
          <Check size={20} />
          Adresse übernehmen
        </button>
      </div>
    </div>
  );
});

export default AddressMap;
