import dotenv from 'dotenv';

dotenv.config();

export async function getWalkingRoute(origin, destination) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      throw new Error('Missing GOOGLE_MAPS_API_KEY in environment variables');
    }

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
      },
      body: JSON.stringify({
        origin: {
          address: origin
        },
        destination: {
          address: destination
        },
        travelMode: 'WALK',
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Google Routes API error:', data);
      throw new Error(data.error?.message || 'Failed to fetch route from Google');
    }

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No walking route found');
    }

    const route = data.routes[0];

    const durationInSeconds = Number(route.duration.replace('s', ''));
    const durationInMinutes = Math.round(durationInSeconds / 60);
    const distanceInKm = (route.distanceMeters / 1000).toFixed(1);

    return {
      origin,
      destination,
      distance: `${distanceInKm} km`,
      duration: `${durationInMinutes} mins`,
      polyline: route.polyline.encodedPolyline
    };
  } catch (error) {
    console.error('Error in getWalkingRoute:', error.message);
    throw new Error('Failed to fetch walking route');
  }
}