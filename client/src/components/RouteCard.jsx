function RouteCard({ routeData }){
    if(!routeData){
        return null;
    }

    return (
        <div
            style={{
                marginTop: '2rem',
                padding: '1.5rem',
                maxWidth: '500px',
                border: '1px solid #ddd',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                fontFamily: 'Arial, sans-serif'
            }}
        >
            <h2 style={{ marginTop: 0 }}>Route Result</h2>
            <p><strong>Origin:</strong> {routeData.origin}</p>
            <p><strong>Destination:</strong> {routeData.destination}</p>
            <p><strong>Distance:</strong> {routeData.distance}</p>
            <p><strong>Duration:</strong> {routeData.duration}</p>
            <p><strong>Safety Score:</strong> {routeData.safetyScore} / 10</p>
        </div>
    );
}

export default RouteCard;
