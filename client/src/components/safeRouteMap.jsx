import { useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import { fetchRouteOptions, fetchSafetyCells } from '../services/safetyApi';
import { createSafetyBlobOverlay, colorFromSafety } from '../utils/heatmapOverlay';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const mapOptions = {
  disableDefaultUI: false,
  clickableIcons: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false
};

const routeColors = {
  fastest: '#2563eb',
  safest: '#16a34a',
  balanced: '#ea580c'
};

export default function SafeRouteMap({ origin, destination }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const mapRef = useRef(null);
  const overlayRef = useRef(null);

  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [safetyCells, setSafetyCells] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteKey, setSelectedRouteKey] = useState('fastest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadSafetyCellsFromMap(map) {
    const bounds = map.getBounds();
    if (!bounds) return [];

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    const cells = await fetchSafetyCells({
      minLat: sw.lat(),
      maxLat: ne.lat(),
      minLng: sw.lng(),
      maxLng: ne.lng()
    });

    setSafetyCells(cells);
    return cells;
  }

  async function loadRoutes(cells) {
    if (!origin || !destination) return;

    const data = await fetchRouteOptions({
      origin,
      destination,
      safetyCells: cells
    });

    setRoutes(data.routes || []);
    setSelectedRouteKey('fastest');
  }

  useEffect(() => {
    if (!mapRef.current) return;

    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }

    overlayRef.current = createSafetyBlobOverlay(
      mapRef.current,
      safetyCells,
      heatmapEnabled
    );

    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, [heatmapEnabled, safetyCells]);

  const center = origin || { lat: 43.6532, lng: -79.3832 };

  return isLoaded ? (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100%' }}>
      <div
        style={{
          padding: '16px',
          borderRight: '1px solid #e5e7eb',
          overflowY: 'auto',
          background: '#fff'
        }}
      >
        <h2 style={{ marginTop: 0 }}>Route Options</h2>

        <button
          onClick={() => setHeatmapEnabled((v) => !v)}
          style={{
            width: '100%',
            marginBottom: '12px',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid #d1d5db',
            background: heatmapEnabled ? '#111827' : '#f3f4f6',
            color: heatmapEnabled ? '#fff' : '#111827',
            cursor: 'pointer'
          }}
        >
          {heatmapEnabled ? 'Hide Heat Map' : 'Show Heat Map'}
        </button>

        {loading && <p>Loading route options...</p>}
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}

        {routes.map((route) => (
          <button
            key={route.optionKey}
            onClick={() => setSelectedRouteKey(route.optionKey)}
            style={{
              width: '100%',
              textAlign: 'left',
              marginBottom: '12px',
              padding: '14px',
              borderRadius: '14px',
              border:
                selectedRouteKey === route.optionKey
                  ? `2px solid ${routeColors[route.optionKey]}`
                  : '1px solid #e5e7eb',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>{route.title}</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
              {route.subtitle}
            </div>
            <div style={{ fontSize: '14px' }}>
              <div>Time: {Math.round(route.durationValue / 60)} min</div>
              <div>Distance: {(route.distanceMeters / 1000).toFixed(2)} km</div>
              <div>Safety: {route.safetyScore}/100</div>
              <div>Green Coverage: {route.greenCoverage}%</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ position: 'relative' }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={15}
          options={mapOptions}
          onLoad={async (map) => {
            mapRef.current = map;

            try {
              setLoading(true);
              setError('');
              const cells = await loadSafetyCellsFromMap(map);
              await loadRoutes(cells);
            } catch (err) {
              setError(err.message || 'Failed to load map data');
            } finally {
              setLoading(false);
            }
          }}
          onIdle={async () => {
            if (!mapRef.current) return;

            try {
              const cells = await loadSafetyCellsFromMap(mapRef.current);
              await loadRoutes(cells);
            } catch (err) {
              console.error(err);
            }
          }}
        >
          {origin && <Marker position={origin} label="A" />}
          {destination && <Marker position={destination} label="B" />}

          {routes.map((route) => (
            <Polyline
              key={route.optionKey}
              path={route.path}
              options={{
                strokeColor: routeColors[route.optionKey],
                strokeOpacity: route.optionKey === selectedRouteKey ? 0.95 : 0.35,
                strokeWeight: route.optionKey === selectedRouteKey ? 7 : 5,
                zIndex: route.optionKey === selectedRouteKey ? 20 : 10
              }}
            />
          ))}

          {!heatmapEnabled &&
            safetyCells.map((cell) => {
              const [r, g, b] = colorFromSafety(cell.avg_rating);

              return (
                <Marker
                  key={cell.cell_key}
                  position={{
                    lat: Number(cell.center_lat),
                    lng: Number(cell.center_lng)
                  }}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 5,
                    fillColor: `rgb(${r}, ${g}, ${b})`,
                    fillOpacity: 0.9,
                    strokeOpacity: 0
                  }}
                />
              );
            })}
        </GoogleMap>
      </div>
    </div>
  ) : (
    <div>Loading map...</div>
  );
}