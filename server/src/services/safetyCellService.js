export const CELL_SIZE = 0.0025;

function roundToCell(value) {
  return Math.floor(value / CELL_SIZE) * CELL_SIZE;
}

export function getCellData(lat, lng) {
  const numericLat = Number(lat);
  const numericLng = Number(lng);

  if (!Number.isFinite(numericLat) || !Number.isFinite(numericLng)) {
    throw new Error('Invalid coordinates for safety cell');
  }

  const cellLat = roundToCell(numericLat);
  const cellLng = roundToCell(numericLng);

  return {
    cellKey: `${cellLat.toFixed(4)},${cellLng.toFixed(4)}`,
    centerLat: Number((cellLat + CELL_SIZE / 2).toFixed(6)),
    centerLng: Number((cellLng + CELL_SIZE / 2).toFixed(6))
  };
}

export function sampleRoutePoints(decodedPoints, step = 5) {
  if (!Array.isArray(decodedPoints) || decodedPoints.length === 0) {
    return [];
  }

  const safeStep = Number.isInteger(step) && step > 0 ? step : 5;
  const sampled = [];

  for (let i = 0; i < decodedPoints.length; i += safeStep) {
    const point = decodedPoints[i];

    if (
      point &&
      Number.isFinite(Number(point.lat)) &&
      Number.isFinite(Number(point.lng))
    ) {
      sampled.push({
        lat: Number(point.lat),
        lng: Number(point.lng)
      });
    }
  }

  const lastPoint = decodedPoints[decodedPoints.length - 1];

  if (
    lastPoint &&
    Number.isFinite(Number(lastPoint.lat)) &&
    Number.isFinite(Number(lastPoint.lng))
  ) {
    const normalizedLastPoint = {
      lat: Number(lastPoint.lat),
      lng: Number(lastPoint.lng)
    };

    const lastSampled = sampled[sampled.length - 1];

    if (
      !lastSampled ||
      lastSampled.lat !== normalizedLastPoint.lat ||
      lastSampled.lng !== normalizedLastPoint.lng
    ) {
      sampled.push(normalizedLastPoint);
    }
  }

  return sampled;
}

export function uniqueCellsFromPoints(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return [];
  }

  const seen = new Set();
  const unique = [];

  for (const point of points) {
    if (
      !point ||
      !Number.isFinite(Number(point.lat)) ||
      !Number.isFinite(Number(point.lng))
    ) {
      continue;
    }

    const normalizedPoint = {
      lat: Number(point.lat),
      lng: Number(point.lng)
    };

    const { cellKey } = getCellData(normalizedPoint.lat, normalizedPoint.lng);

    if (!seen.has(cellKey)) {
      seen.add(cellKey);
      unique.push(normalizedPoint);
    }
  }

  return unique;
}