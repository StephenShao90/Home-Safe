const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export async function fetchSafetyCells(bounds) {
  const params = new URLSearchParams({
    minLat: bounds.minLat,
    maxLat: bounds.maxLat,
    minLng: bounds.minLng,
    maxLng: bounds.maxLng
  });

  const response = await fetch(`${API_BASE}/api/safety/cells?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch safety cells');
  }

  return response.json();
}

export async function fetchRouteOptions({ origin, destination, safetyCells }) {
  const response = await fetch(`${API_BASE}/api/safety/route-options`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      origin,
      destination,
      safetyCells
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to fetch route options');
  }

  return response.json();
}