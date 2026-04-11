import pool from '../db/db.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function decodePolyline(polyline) {
  if (!polyline || typeof polyline !== 'string') {
    return [];
  }

  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates = [];

  while (index < polyline.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = polyline.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = polyline.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    coordinates.push({
      lat: lat / 1e5,
      lng: lng / 1e5
    });
  }

  return coordinates;
}

function getRouteBounds(points) {
  if (!points.length) {
    return null;
  }

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  return { minLat, maxLat, minLng, maxLng };
}

function distanceSquared(a, b) {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return dLat * dLat + dLng * dLng;
}

function estimateGreenCoverage(points, safetyCells) {
  if (!points.length || !safetyCells.length) {
    return null;
  }

  let totalScore = 0;
  let matchedPointCount = 0;
  const maxDistanceSquared = 0.0025 * 0.0025 * 4;

  for (const point of points) {
    let nearestCell = null;
    let nearestDistance = Infinity;

    for (const cell of safetyCells) {
      const center = {
        lat: Number(cell.center_lat),
        lng: Number(cell.center_lng)
      };

      if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) {
        continue;
      }

      const dist = distanceSquared(point, center);

      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestCell = cell;
      }
    }

    if (!nearestCell || nearestDistance > maxDistanceSquared) {
      continue;
    }

    matchedPointCount += 1;

    const avgRating = Number(nearestCell.avg_rating);
    if (Number.isFinite(avgRating)) {
      let weight =
        avgRating >= 8.5 ? 1.0 :   // green
        avgRating >= 7 ? 0.75 :    // yellow
        avgRating >= 5 ? 0.4 :     // orange
        0.1;                       // red

      totalScore += weight;
    }
  }

  if (matchedPointCount === 0) {
    return null;
  }

  return Math.round((totalScore / matchedPointCount) * 100);
}

async function getSafetyCellsForRoute(route) {
  const points = decodePolyline(route?.polyline);
  const bounds = getRouteBounds(points);

  if (!bounds) {
    return [];
  }

  const padding = 0.002;

  const result = await pool.query(
    `
    SELECT center_lat, center_lng, avg_rating, report_count
    FROM safety_cells
    WHERE center_lat BETWEEN $1 AND $2
      AND center_lng BETWEEN $3 AND $4
    `,
    [
      bounds.minLat - padding,
      bounds.maxLat + padding,
      bounds.minLng - padding,
      bounds.maxLng + padding
    ]
  );

  return result.rows;
}

export async function getSafetyScoreForRoute(route) {
  try {
    const routePoints = decodePolyline(route?.polyline);
    const safetyCells = await getSafetyCellsForRoute(route);
    const greenCoverage = estimateGreenCoverage(routePoints, safetyCells);

    let safetyScore = 5.0;

    if (greenCoverage !== null) {
      safetyScore = Number((2 + greenCoverage * 0.08).toFixed(2));
    }

    return {
      safetyScore: clamp(safetyScore, 0, 10),
      greenCoverage: greenCoverage ?? 0
    };
  } catch (error) {
    console.error('Error in getSafetyScoreForRoute:', error.message);
    throw new Error('Failed to calculate safety score');
  }
}