import { useState } from 'react';
import { computeRoute, submitRating } from '../services/api.js';
import MapView from '../components/MapView.jsx';
import RouteCard from '../components/RouteCard.jsx';
import TripRatingModal from '../components/TripRatingModal.jsx';

function RoutePlanner() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [routeData, setRouteData] = useState(null);
  const [error, setError] = useState('');
  const [isRatingOpen, setIsRatingOpen] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      const route = await computeRoute(origin, destination);
      setRouteData(route);
    } catch (err) {
      setError(err.message);
      setRouteData(null);
    }
  }

  async function handleRatingSubmit(ratingData) {
    try{
      await submitRating(
        routeData.origin,
        routeData.destination,
        ratingData.safetyRating,
        ratingData.notes
      );

      console.log('Rating saved to database');
      setIsRatingOpen(false);
    } catch(error){
      console.error(error.message);
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Home Safe</h1>
      <p>Find the quickest and safest route home.</p>

      <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="origin" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Starting Location
          </label>
          <input
            id="origin"
            type="text"
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
            placeholder="Enter starting point"
            style={{
              width: '300px',
              padding: '0.75rem',
              fontSize: '1rem'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="destination" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Destination
          </label>
          <input
            id="destination"
            type="text"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="Enter destination"
            style={{
              width: '300px',
              padding: '0.75rem',
              fontSize: '1rem'
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            padding: '0.75rem 1.25rem',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          Find Route
        </button>
      </form>

      {error && (
        <p style={{ color: 'red', marginTop: '1rem' }}>
          {error}
        </p>
      )}

      <RouteCard routeData={routeData} />
      <MapView routeData={routeData} />

      {routeData && (
        <button
          onClick={() => setIsRatingOpen(true)}
          style={{
            marginTop: '1.5rem',
            padding: '0.75rem 1.25rem',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          Rate This Trip
        </button>
      )}

      <TripRatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        onSubmit={handleRatingSubmit}
      />
    </div>
  );
}

export default RoutePlanner;