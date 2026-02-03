import { useEffect, useRef, memo } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = 'pk.eyJ1Ijoic3BlZXRpc3BlZXRpIiwiYSI6ImNtbDZ6dHJ4ZzAyZzczY3NpeDdhNHE4aWYifQ.WiNxZwRzk9aPGN9DrjyT3Q';

const MiniMap = memo(function MiniMap({ 
  address,  // { street, house_number, postal_code, city, lat, lng }
  height = 150,
  className = ""
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Get coordinates - use provided or geocode
    const initMap = async () => {
      let lng, lat;

      if (address?.lng && address?.lat) {
        lng = address.lng;
        lat = address.lat;
      } else if (address?.street) {
        // Geocode the address
        try {
          const query = `${address.street} ${address.house_number || ''}, ${address.postal_code || ''} ${address.city || 'Münster'}`;
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&limit=1`
          );
          const data = await response.json();
          
          if (data.features && data.features.length > 0) {
            [lng, lat] = data.features[0].center;
          } else {
            // Default to Münster center
            lng = 7.6261;
            lat = 51.9607;
          }
        } catch (e) {
          console.error('Geocode error:', e);
          lng = 7.6261;
          lat = 51.9607;
        }
      } else {
        // Default to Münster
        lng = 7.6261;
        lat = 51.9607;
      }

      // Create map
      if (map.current) {
        map.current.remove();
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [lng, lat],
        zoom: 15,
        interactive: false, // Static map for preview
        attributionControl: false
      });

      // Add marker
      new mapboxgl.Marker({
        color: '#e11d48'
      })
        .setLngLat([lng, lat])
        .addTo(map.current);
    };

    initMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [address?.street, address?.house_number, address?.postal_code, address?.lat, address?.lng]);

  return (
    <div 
      ref={mapContainer} 
      style={{ height: `${height}px` }}
      className={`rounded-xl overflow-hidden ${className}`}
    />
  );
});

export default MiniMap;
