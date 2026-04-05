function MapView({ routeData }) {
  return (
    <div
      style={{
        marginTop: '2rem',
        width: '100%',
        maxWidth: '800px',
        height: '400px',
        border: '2px solid #ccc',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f8f8',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {routeData ? (
        <div style={{ textAlign: 'center' }}>
          <h3>Map Placeholder</h3>
          <p>Route from {routeData.origin} to {routeData.destination}</p>
          <p>Polyline: {routeData.polyline}</p>
        </div>
      ) : (
        <p>No route selected yet.</p>
      )}
    </div>
  );
}

export default MapView;