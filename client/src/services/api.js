const BASE_URL = 'http://localhost:5000';

export async function computeRoute(origin, destination, metadata = {}) {
  const response = await fetch(`${BASE_URL}/api/routes/compute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      origin,
      destination,
      originName: metadata.originName || null,
      destinationName: metadata.destinationName || null
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to compute route');
  }

  return data;
}

export async function submitRating(origin, destination, safetyRating, notes, polyline) {
  const response = await fetch(`${BASE_URL}/api/ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      origin,
      destination,
      safetyRating,
      notes,
      polyline
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to submit rating');
  }

  return data;
}

export async function getSafetyCells(bounds) {
  const params = new URLSearchParams({
    minLat: bounds.minLat,
    maxLat: bounds.maxLat,
    minLng: bounds.minLng,
    maxLng: bounds.maxLng
  });

  const response = await fetch(`${BASE_URL}/api/safety/cells?${params.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to load safety cells');
  }

  return data;
}