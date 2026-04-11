import dotenv from 'dotenv';

dotenv.config();

const GOOGLE_ROUTES_URL =
  'https://routes.googleapis.com/directions/v2:computeRoutes';

function parseDurationToSeconds(durationString) {
  if (!durationString) {
    return 0;
  }

  const parsed = Number(String(durationString).replace('s', ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildLocation(input) {
  if (typeof input === 'string' && input.trim().length > 0) {
    return { address: input.trim() };
  }

  if (
    input &&
    typeof input === 'object' &&
    typeof input.lat === 'number' &&
    typeof input.lng === 'number'
  ) {
    return {
      location: {
        latLng: {
          latitude: input.lat,
          longitude: input.lng
        }
      }
    };
  }

  throw new Error('Invalid origin/destination format');
}

function normalizeStep(step) {
  const distanceMeters = step?.distanceMeters ?? 0;
  const durationSeconds = parseDurationToSeconds(step?.staticDuration || '0s');

  return {
    distanceMeters,
    durationSeconds,
    maneuver: step?.navigationInstruction?.maneuver || '',
    instruction: step?.navigationInstruction?.instructions || 'Continue',
    polyline: step?.polyline?.encodedPolyline || ''
  };
}

function extractSteps(route) {
  return route.legs?.flatMap((leg) => (leg.steps || []).map(normalizeStep)) || [];
}

function normalizeRoute(route, index, origin, destination) {
  const durationInSeconds = parseDurationToSeconds(route?.duration || '0s');
  const durationInMinutes = Math.round(durationInSeconds / 60);
  const distanceMeters = route?.distanceMeters || 0;
  const distanceInKm = (distanceMeters / 1000).toFixed(1);
  const polyline = route?.polyline?.encodedPolyline || '';
  const steps = extractSteps(route);

  return {
    routeId: `${index}-${polyline.slice(0, 24) || 'route'}`,
    origin,
    destination,
    distance: `${distanceInKm} km`,
    distanceMeters,
    duration: `${durationInMinutes} mins`,
    durationValue: durationInSeconds,
    polyline,
    steps
  };
}

async function callGoogleRoutes({
  origin,
  destination,
  intermediates = [],
  alternatives = false
}) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GOOGLE_MAPS_API_KEY in environment variables');
  }

  const body = {
    origin: buildLocation(origin),
    destination: buildLocation(destination),
    travelMode: 'WALK',
    polylineQuality: 'HIGH_QUALITY',
    computeAlternativeRoutes: Boolean(alternatives && intermediates.length === 0)
  };

  if (intermediates.length > 0) {
    body.intermediates = intermediates.map((point) => ({
      location: {
        latLng: {
          latitude: point.lat,
          longitude: point.lng
        }
      }
    }));
  }

  const response = await fetch(GOOGLE_ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'routes.duration',
        'routes.distanceMeters',
        'routes.polyline.encodedPolyline',
        'routes.legs.distanceMeters',
        'routes.legs.duration',
        'routes.legs.steps.distanceMeters',
        'routes.legs.steps.staticDuration',
        'routes.legs.steps.polyline.encodedPolyline',
        'routes.legs.steps.navigationInstruction.instructions',
        'routes.legs.steps.navigationInstruction.maneuver'
      ].join(',')
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Google Routes API error:', data);
    throw new Error(data?.error?.message || 'Failed to fetch routes from Google');
  }

  if (!Array.isArray(data.routes) || data.routes.length === 0) {
    throw new Error('No walking route found for those locations');
  }

  return data.routes;
}

export async function getWalkingRoutes(origin, destination) {
  try {
    const routes = await callGoogleRoutes({
      origin,
      destination,
      alternatives: true
    });

    return routes.map((route, index) =>
      normalizeRoute(route, index, origin, destination)
    );
  } catch (error) {
    console.error('Error in getWalkingRoutes:', error.message);
    throw error;
  }
}

export async function getRankedWalkingRoutes(
  origin,
  destination,
  safetyCells = []
) {
  void safetyCells;
  return getWalkingRoutes(origin, destination);
}

export async function getWalkingRouteWithWaypoints(origin, destination, waypoints = []) {
  const routes = await callGoogleRoutes({
    origin,
    destination,
    intermediates: waypoints,
    alternatives: false
  });

  return routes.map((route, index) =>
    normalizeRoute(route, index, origin, destination)
  );
}