import { useEffect, useRef } from 'react';

function loadGoogleMaps(apiKey) {
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google);
  }

  if (window.__googleMapsLoadingPromise) {
    return window.__googleMapsLoadingPromise;
  }

  window.__googleMapsLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));

    document.head.appendChild(script);
  });

  return window.__googleMapsLoadingPromise;
}

function MapView({ routeData }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const polylineRef = useRef(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Missing VITE_GOOGLE_MAPS_API_KE');
      return;
    }

    let isMounted = true;

    async function initializeMap() {
      try {
        const google = await loadGoogleMaps(apiKey);

        if (!isMounted || !mapContainerRef.current) {
          return;
        }

        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(mapContainerRef.current, {
            center: { lat: 43.4723, lng: -80.5449 },
            zoom: 13,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
          });
        }

        if (polylineRef.current) {
          polylineRef.current.setMap(null);
          polylineRef.current = null;
        }

        if (routeData?.polyline) {
          const decodedPath = google.maps.geometry.encoding.decodePath(routeData.polyline);

          polylineRef.current = new google.maps.Polyline({
            path: decodedPath,
            geodesic: true,
            strokeColor: '#2563eb',
            strokeOpacity: 0.9,
            strokeWeight: 5
          });

          polylineRef.current.setMap(mapRef.current);

          const bounds = new google.maps.LatLngBounds();
          decodedPath.forEach((point) => bounds.extend(point));
          mapRef.current.fitBounds(bounds);
        }
      } catch (error) {
        console.error('Map initialization error:', error.message);
      }
    }

    initializeMap();

    return () => {
      isMounted = false;
    };
  }, [routeData]);

  return (
    <div style={{ marginTop: '2rem' }}>
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          maxWidth: '800px',
          height: '400px',
          border: '2px solid #ccc',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      />
      <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#666' }}>
        Walking routes may occasionally miss some pedestrian paths or sidewalks.
      </p>
    </div>
  );
}

export default MapView;