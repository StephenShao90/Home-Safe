import dotenv from 'dotenv';

dotenv.config();

const GOOGLE_ROUTES_URL =
  'https://routes.googleapis.com/directions/v2:computeRoutes';

const GOOGLE_ROUTES_TIMEOUT_MS = 10000;

const ROUTES_FIELD_MASK = [
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
].join(',');

/**
 * Converts Google duration strings like "273s" into seconds.
 */
function parseDurationToSeconds(durationString) {
  if (!durationString) return 0;

  const parsed = Number(String(durationString).replace('s', ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Validates a lat/lng object.
 */
function isValidLatLng(value) {
  return (
    value &&
    typeof value === 'object' &&
    Number.isFinite(Number(value.lat)) &&
    Number.isFinite(Number(value.lng))
  );
}

/**
 * Converts either an address string or lat/lng object into
 * the format expected by the Google Routes API.
 */
function buildLocation(input) {
  if (typeof input === 'string' && input.trim()) {
    return { address: input.trim() };
  }

  if (isValidLatLng(input)) {
    return {
      location: {
        latLng: {
          latitude: Number(input.lat),
          longitude: Number(input.lng)
        }
      }
    };
  }

  throw new Error('Invalid origin/destination format');
}

/**
 * Converts app waypoint objects into Google Routes API intermediates.
 */
function buildIntermediates(intermediates = []) {
  return intermediates
    .filter(isValidLatLng)
    .map((point) => ({
      location: {
        latLng: {
          latitude: Number(point.lat),
          longitude: Number(point.lng)
        }
      }
    }));
}

/**
 * Normalizes one navigation step from Google.
 */
function normalizeStep(step) {
  return {
    distanceMeters: Number(step?.distanceMeters || 0),
    durationSeconds: parseDurationToSeconds(step?.staticDuration || '0s'),
    maneuver: step?.navigationInstruction?.maneuver || '',
    instruction: step?.navigationInstruction?.instructions || 'Continue',
    polyline: step?.polyline?.encodedPolyline || ''
  };
}

/**
 * Flattens Google route legs into one frontend-friendly steps array.
 */
function extractSteps(route) {
  return route?.legs?.flatMap((leg) => (leg.steps || []).map(normalizeStep)) || [];
}

/**
 * Converts a raw Google route into the route object used by the app.
 */
function normalizeRoute(route, index, origin, destination) {
  const durationSeconds = parseDurationToSeconds(route?.duration || '0s');
  const durationMinutes = Math.round(durationSeconds / 60);
  const distanceMeters = Number(route?.distanceMeters || 0);
  const distanceKm = (distanceMeters / 1000).toFixed(1);
  const polyline = route?.polyline?.encodedPolyline || '';

  return {
    routeId: `${index}-${polyline.slice(0, 24) || 'route'}`,
    origin,
    destination,
    distance: `${distanceKm} km`,
    distanceMeters,
    duration: `${durationMinutes} mins`,
    durationValue: durationSeconds,
    polyline,
    steps: extractSteps(route)
  };
}

/**
 * Safely reads the Google Routes response.
 */
async function parseGoogleResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Google Routes returned invalid JSON');
  }
}

/**
 * Calls Google Routes API with timeout protection.
 */
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GOOGLE_ROUTES_TIMEOUT_MS);

  const cleanedIntermediates = buildIntermediates(intermediates);

  const body = {
    origin: buildLocation(origin),
    destination: buildLocation(destination),
    travelMode: 'WALK',
    polylineQuality: 'HIGH_QUALITY',
    computeAlternativeRoutes: Boolean(alternatives && cleanedIntermediates.length === 0)
  };

  if (cleanedIntermediates.length > 0) {
    body.intermediates = cleanedIntermediates;
  }

  try {
    const response = await fetch(GOOGLE_ROUTES_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': ROUTES_FIELD_MASK
      },
      body: JSON.stringify(body)
    });

    const data = await parseGoogleResponse(response);

    if (!response.ok) {
      console.error('Google Routes API error:', data);
      throw new Error(data?.error?.message || 'Failed to fetch routes from Google');
    }

    if (!Array.isArray(data.routes) || data.routes.length === 0) {
      throw new Error('No walking route found for those locations');
    }

    return data.routes;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Google Routes request timed out');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Gets multiple walking route options from Google.
 */
export async function getWalkingRoutes(origin, destination) {
  const routes = await callGoogleRoutes({
    origin,
    destination,
    alternatives: true
  });

  return routes.map((route, index) =>
    normalizeRoute(route, index, origin, destination)
  );
}

/**
 * Placeholder wrapper for future ranked route logic.
 */
export async function getRankedWalkingRoutes(origin, destination, safetyCells = []) {
  void safetyCells;
  return getWalkingRoutes(origin, destination);
}

/**
 * Gets a walking route forced through safety-generated waypoints.
 */
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