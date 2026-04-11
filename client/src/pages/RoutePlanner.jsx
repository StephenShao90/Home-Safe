import { useMemo, useState } from 'react';
import { computeRoute, submitRating } from '../services/api.js';
import MapView from '../components/MapView.jsx';
import RouteCard from '../components/RouteCard.jsx';
import TripRatingModal from '../components/TripRatingModal.jsx';
import LocationAutocompleteInput from '../components/LocationAutocompleteInput.jsx';

function normalizeRouteOptions(routePackage) {
  if (!routePackage || !Array.isArray(routePackage.routes)) {
    return [];
  }

  return routePackage.routes.map((route, index) => ({
    ...route,
    displayId: route.optionKey || `route-${index}`,
    type:
      route.optionKey ||
      route.optionkey ||
      ['quickest', 'safest', 'balanced'][index]
  }));
}

function getSelectedRouteId(route) {
  if (!route) return null;
  return route.displayId;
}

function hasValidCoords(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.lat === 'number' &&
    typeof value.lng === 'number'
  );
}

function RoutePlanner() {
  const [origin, setOrigin] = useState({ text: '', coords: null });
  const [destination, setDestination] = useState({ text: '', coords: null });
  const [routeData, setRouteData] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [error, setError] = useState('');
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const routeOptions = useMemo(
    () => normalizeRouteOptions(routeData),
    [routeData]
  );

  const safeRouteOptions = useMemo(() => {
    if (routeOptions.length === 0) {
      return [];
    }

    if (routeOptions.length >= 3) {
      return routeOptions.slice(0, 3);
    }

    const filled = [...routeOptions];

    while (filled.length < 3) {
      filled.push({
        ...routeOptions[routeOptions.length - 1],
        displayId: `duplicate-${routeOptions.length}-${filled.length}`
      });
    }

    return filled;
  }, [routeOptions]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const resolvedOrigin =
      useCurrentLocation && hasValidCoords(currentLocation)
        ? currentLocation
        : origin.coords;

    const resolvedDestination = destination.coords;

    if (!hasValidCoords(resolvedOrigin) || !hasValidCoords(resolvedDestination)) {
      setError('Please select both locations from the autocomplete list.');
      setRouteData(null);
      setSelectedRoute(null);
      setIsSubmitting(false);
      return;
    }

    try {
      const routePackage = await computeRoute(
        resolvedOrigin,
        resolvedDestination,
        {
          originName: useCurrentLocation ? 'Current location' : origin.text,
          destinationName: destination.text
        }
      );

      setRouteData(routePackage);

      const normalizedOptions = normalizeRouteOptions(routePackage);
      setSelectedRoute(normalizedOptions[0] || null);
    } catch (err) {
      setError(err.message || 'Failed to compute route.');
      setRouteData(null);
      setSelectedRoute(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRatingSubmit(ratingData) {
    try {
      if (!selectedRoute) return;

      await submitRating(
        selectedRoute.origin,
        selectedRoute.destination,
        ratingData.safetyRating,
        ratingData.notes,
        selectedRoute.polyline
      );

      setIsRatingOpen(false);
    } catch (submitError) {
      console.error(submitError.message);
    }
  }

  function handleUseCurrentLocation(coords) {
    setCurrentLocation(coords);
  }

  const styles = {
    page: {
      minHeight: '100vh',
      background:
        'radial-gradient(circle at top, rgba(37,99,235,0.12), transparent 28%), linear-gradient(180deg, #0b1020 0%, #111827 100%)',
      color: '#f9fafb',
      padding: '32px 20px 48px',
      fontFamily: 'Arial, sans-serif'
    },
    shell: {
      width: 'min(1220px, 100%)',
      margin: '0 auto'
    },
    hero: {
      textAlign: 'center',
      marginBottom: '28px'
    },
    title: {
      margin: 0,
      fontSize: '2.2rem',
      fontWeight: 800
    },
    subtitle: {
      marginTop: '8px',
      color: '#cbd5e1',
      fontSize: '1rem'
    },
    panel: {
      background: 'rgba(15, 23, 42, 0.92)',
      border: '1px solid rgba(148, 163, 184, 0.18)',
      borderRadius: '24px',
      padding: '24px',
      boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
      backdropFilter: 'blur(12px)'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr auto',
      gap: '16px',
      alignItems: 'end'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontSize: '0.95rem',
      fontWeight: 700,
      color: '#e5e7eb'
    },
    buttonRow: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    primaryButton: {
      height: '48px',
      padding: '0 18px',
      borderRadius: '14px',
      border: 'none',
      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      color: '#ffffff',
      fontSize: '0.98rem',
      fontWeight: 700,
      cursor: 'pointer',
      boxShadow: '0 14px 30px rgba(37, 99, 235, 0.28)'
    },
    secondaryButton: {
      height: '48px',
      padding: '0 18px',
      borderRadius: '14px',
      border: '1px solid rgba(148, 163, 184, 0.22)',
      background: '#172033',
      color: '#f8fafc',
      fontSize: '0.95rem',
      fontWeight: 700,
      cursor: 'pointer'
    },
    error: {
      marginTop: '16px',
      padding: '12px 14px',
      borderRadius: '14px',
      background: 'rgba(239, 68, 68, 0.12)',
      border: '1px solid rgba(248, 113, 113, 0.28)',
      color: '#fecaca'
    },
    cardsSection: {
      marginTop: '28px'
    },
    cardsTitle: {
      margin: '0 0 14px',
      fontSize: '1.25rem',
      fontWeight: 800
    },
    cardsRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(250px, 1fr))',
      gap: '16px',
      alignItems: 'stretch'
    },
    rateRow: {
      marginTop: '20px',
      display: 'flex',
      justifyContent: 'center'
    },
    rateButton: {
      height: '48px',
      padding: '0 20px',
      borderRadius: '14px',
      border: '1px solid rgba(148, 163, 184, 0.22)',
      background: '#f8fafc',
      color: '#111827',
      fontSize: '0.98rem',
      fontWeight: 800,
      cursor: 'pointer',
      boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)'
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.hero}>
          <h1 style={styles.title}>Home Safe</h1>
          <p style={styles.subtitle}>Find the quickest and safest route home.</p>
        </div>

        <div style={styles.panel}>
          <form onSubmit={handleSubmit}>
            <div style={styles.formGrid}>
              <div>
                <label htmlFor="origin" style={styles.label}>
                  Starting Location
                </label>
                <LocationAutocompleteInput
                  id="origin"
                  value={useCurrentLocation ? 'Using current location' : origin.text}
                  onChange={(text, coords) => {
                    setUseCurrentLocation(false);
                    setOrigin({ text, coords });
                    setError('');
                  }}
                  placeholder="Enter starting point"
                  disabled={useCurrentLocation}
                />
              </div>

              <div>
                <label htmlFor="destination" style={styles.label}>
                  Destination
                </label>
                <LocationAutocompleteInput
                  id="destination"
                  value={destination.text}
                  onChange={(text, coords) =>
                    setDestination({
                      text,
                      coords
                    })
                  }
                  placeholder="Enter destination"
                />
              </div>

              <div style={styles.buttonRow}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => {
                    if (useCurrentLocation) {
                      setUseCurrentLocation(false);
                      setCurrentLocation(null);
                    } else {
                      setUseCurrentLocation(true);
                      setOrigin({ text: '', coords: null });
                      setError('');
                    }
                  }}
                >
                  {useCurrentLocation ? 'Use typed origin' : 'Use current location'}
                </button>

                <button
                  type="submit"
                  style={{
                    ...styles.primaryButton,
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Finding…' : 'Find Route'}
                </button>
              </div>
            </div>
          </form>

          {error && <div style={styles.error}>{error}</div>}

          {safeRouteOptions.length > 0 && (
            <div style={styles.cardsSection}>
              <h2 style={styles.cardsTitle}>Route Options</h2>

              <div style={styles.cardsRow}>
                {safeRouteOptions.map((route) => (
                  <RouteCard
                    key={route.displayId}
                    routeData={route}
                    title={
                      route.type === 'quickest'
                        ? 'Quickest'
                        : route.type === 'safest'
                          ? 'Safest'
                          : 'Best Mix'
                    }
                    isSelected={
                      getSelectedRouteId(selectedRoute) ===
                      getSelectedRouteId(route)
                    }
                    onClick={() => setSelectedRoute(route)}
                  />
                ))}
              </div>
            </div>
          )}

          <MapView
            routeData={
              selectedRoute
                ? { ...selectedRoute, steps: selectedRoute.steps || [] }
                : null
            }
            selectedRouteType={selectedRoute?.type}
            onUseCurrentLocation={handleUseCurrentLocation}
            startMode={useCurrentLocation ? 'user' : 'manual'}
          />

          {selectedRoute && (
            <div style={styles.rateRow}>
              <button
                onClick={() => setIsRatingOpen(true)}
                style={styles.rateButton}
                type="button"
              >
                Rate This Trip
              </button>
            </div>
          )}
        </div>

        <TripRatingModal
          isOpen={isRatingOpen}
          onClose={() => setIsRatingOpen(false)}
          onSubmit={handleRatingSubmit}
          routeTitle={
            selectedRoute?.type === 'quickest'
              ? 'Quickest Route'
              : selectedRoute?.type === 'safest'
                ? 'Safest Route'
                : 'Best Mix Route'
          }
        />
      </div>
    </div>
  );
}

export default RoutePlanner;