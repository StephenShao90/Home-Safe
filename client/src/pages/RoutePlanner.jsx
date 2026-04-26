import { useMemo, useState } from 'react';
import { computeRoute, submitRating } from '../services/api.js';
import MapView from '../components/MapView.jsx';
import RouteCard from '../components/RouteCard.jsx';
import TripRatingModal from '../components/TripRatingModal.jsx';
import LocationAutocompleteInput from '../components/LocationAutocompleteInput.jsx';
import '../App.css';

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

function fillRouteCards(routeOptions) {
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
}

function getRouteTitle(type) {
  if (type === 'quickest') return 'Quickest';
  if (type === 'safest') return 'Safest';
  return 'Best Mix';
}

function getModalRouteTitle(type) {
  if (type === 'quickest') return 'Quickest Route';
  if (type === 'safest') return 'Safest Route';
  return 'Best Mix Route';
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

  const routeOptions = useMemo(() => normalizeRouteOptions(routeData), [routeData]);

  const visibleRouteOptions = useMemo(() => {
    return fillRouteCards(routeOptions);
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
      const routePackage = await computeRoute(resolvedOrigin, resolvedDestination, {
        originName: useCurrentLocation ? 'Current location' : origin.text,
        destinationName: destination.text
      });

      const normalizedOptions = normalizeRouteOptions(routePackage);

      setRouteData(routePackage);
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

  function handleOriginChange(text, coords) {
    setUseCurrentLocation(false);
    setOrigin({ text, coords });
    setError('');
  }

  function handleDestinationChange(text, coords) {
    setDestination({ text, coords });
    setError('');
  }

  function handleUseCurrentLocationToggle() {
    if (useCurrentLocation) {
      setUseCurrentLocation(false);
      setCurrentLocation(null);
      return;
    }

    setUseCurrentLocation(true);
    setOrigin({ text: '', coords: null });
    setError('');
  }

  return (
    <div className="route-page">
      <div className="route-container">
        <div className="route-header">
          <h1 className="route-title">Home Safe</h1>
          <p className="route-subtitle">Find the quickest and safest route home.</p>
        </div>

        <div className="route-panel">
          <form onSubmit={handleSubmit}>
            <div className="route-form">
              <div>
                <label htmlFor="origin" className="route-label">
                  Starting Location
                </label>
                <LocationAutocompleteInput
                  id="origin"
                  value={useCurrentLocation ? 'Using current location' : origin.text}
                  onChange={handleOriginChange}
                  placeholder="Enter starting point"
                  disabled={useCurrentLocation}
                />
              </div>

              <div>
                <label htmlFor="destination" className="route-label">
                  Destination
                </label>
                <LocationAutocompleteInput
                  id="destination"
                  value={destination.text}
                  onChange={handleDestinationChange}
                  placeholder="Enter destination"
                />
              </div>

              <div className="button-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleUseCurrentLocationToggle}
                >
                  {useCurrentLocation ? 'Use typed origin' : 'Use current location'}
                </button>

                <button
                  type="submit"
                  className={`btn btn-primary ${isSubmitting ? 'btn-disabled' : ''}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Finding...' : 'Find Route'}
                </button>
              </div>
            </div>
          </form>

          {error && <div className="error-box">{error}</div>}

          {visibleRouteOptions.length > 0 && (
            <div className="routes-section">
              <h2 className="routes-title">Route Options</h2>
              <div className="routes-grid">
                {visibleRouteOptions.map((route) => (
                  <RouteCard
                    key={route.displayId}
                    routeData={route}
                    title={getRouteTitle(route.type)}
                    isSelected={
                      getSelectedRouteId(selectedRoute) === getSelectedRouteId(route)
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
            onUseCurrentLocation={setCurrentLocation}
            startMode={useCurrentLocation ? 'user' : 'manual'}
          />

          {selectedRoute && (
            <div className="rate-row">
              <button
                type="button"
                className="btn rate-btn"
                onClick={() => setIsRatingOpen(true)}
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
          routeTitle={getModalRouteTitle(selectedRoute?.type)}
        />
      </div>
    </div>
  );
}

export default RoutePlanner;