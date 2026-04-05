import { useState } from 'react';
import { computeRoute } from '../services/api.js';
import MapView from '../components/MapView.jsx';

function RoutePlanner() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [routeData, setRouteData] = useState(null);
  const [error, setError] = useState('');

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

      {routeData && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Route Result</h2>
          <p><strong>Origin:</strong> {routeData.origin}</p>
          <p><strong>Destination:</strong> {routeData.destination}</p>
          <p><strong>Distance:</strong> {routeData.distance}</p>
          <p><strong>Duration:</strong> {routeData.duration}</p>
          <p><strong>Safety Score:</strong> {routeData.safetyScore} / 10</p>
        </div>
      )}

      <MapView routeData={routeData} />
    </div>
  );
}

export default RoutePlanner;