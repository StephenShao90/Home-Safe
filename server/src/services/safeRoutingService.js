import pool from '../db/db.js';
import { getWalkingRouteWithWaypoints } from './googleMapsService.js';

const CELL_SIZE = 0.0025;
const SQRT2 = Math.SQRT2;

function isLatLngObject(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.lat === 'number' &&
    typeof value.lng === 'number'
  );
}

function toCellCoord(value) {
  return Math.floor(value / CELL_SIZE) * CELL_SIZE + CELL_SIZE / 2;
}

function toCellKey(lat, lng) {
  return `${toCellCoord(lat).toFixed(4)},${toCellCoord(lng).toFixed(4)}`;
}

function keyToPoint(key) {
  const [lat, lng] = key.split(',').map(Number);
  return { lat, lng };
}

function getBoundsWithPadding(origin, destination, padding = 0.02) {
  return {
    minLat: Math.min(origin.lat, destination.lat) - padding,
    maxLat: Math.max(origin.lat, destination.lat) + padding,
    minLng: Math.min(origin.lng, destination.lng) - padding,
    maxLng: Math.max(origin.lng, destination.lng) + padding
  };
}

async function getCandidateSafetyCells(origin, destination) {
  const bounds = getBoundsWithPadding(origin, destination);

  const result = await pool.query(
    `
    SELECT cell_key, center_lat, center_lng, avg_rating, report_count
    FROM safety_cells
    WHERE center_lat BETWEEN $1 AND $2
      AND center_lng BETWEEN $3 AND $4
    `,
    [bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng]
  );

  return result.rows;
}

function buildCellMap(cells, origin, destination) {
  const bounds = getBoundsWithPadding(origin, destination);
  const map = new Map();

  for (let lat = bounds.minLat; lat <= bounds.maxLat + 1e-9; lat += CELL_SIZE) {
    for (let lng = bounds.minLng; lng <= bounds.maxLng + 1e-9; lng += CELL_SIZE) {
      const centerLat = Number(toCellCoord(lat).toFixed(6));
      const centerLng = Number(toCellCoord(lng).toFixed(6));
      const cellKey = `${centerLat.toFixed(4)},${centerLng.toFixed(4)}`;

      map.set(cellKey, {
        cell_key: cellKey,
        center_lat: centerLat,
        center_lng: centerLng,
        avg_rating: null,
        report_count: 0
      });
    }
  }

  for (const cell of cells) {
    const centerLat = Number(cell.center_lat);
    const centerLng = Number(cell.center_lng);

    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
      continue;
    }

    const cellKey =
      typeof cell.cell_key === 'string' && cell.cell_key.length > 0
        ? cell.cell_key
        : `${centerLat.toFixed(4)},${centerLng.toFixed(4)}`;

    map.set(cellKey, {
      cell_key: cellKey,
      center_lat: centerLat,
      center_lng: centerLng,
      avg_rating:
        cell.avg_rating === null || cell.avg_rating === undefined
          ? null
          : Number(cell.avg_rating),
      report_count: Number(cell.report_count) || 0
    });
  }

  return map;
}

function getSafetyBand(cell) {
  const rating = Number(cell?.avg_rating);

  if (!Number.isFinite(rating)) return 4; // unknown = worse than red until forced
  if (rating >= 8.5) return 0; // green
  if (rating >= 7) return 1;   // yellow
  if (rating >= 5) return 2;   // orange
  return 3;                    // red
}

function getTraversalCost(cell) {
  const band = getSafetyBand(cell);

  if (band === 0) return 1;
  if (band === 1) return 20;
  if (band === 2) return 120;
  if (band === 3) return 900;
  return 1400; // unknown
}

function getTransitionPenalty(currentCell, nextCell) {
  const currentBand = getSafetyBand(currentCell);
  const nextBand = getSafetyBand(nextCell);

  if (nextBand <= currentBand) {
    return 0;
  }

  if (currentBand === 0 && nextBand === 1) return 60;
  if (currentBand <= 1 && nextBand === 2) return 220;
  if (currentBand <= 2 && nextBand === 3) return 900;
  if (nextBand === 4) return 1400;

  return 0;
}

function heuristicCost(keyA, keyB) {
  const a = keyToPoint(keyA);
  const b = keyToPoint(keyB);
  const dLat = Math.abs(a.lat - b.lat) / CELL_SIZE;
  const dLng = Math.abs(a.lng - b.lng) / CELL_SIZE;
  return Math.sqrt(dLat * dLat + dLng * dLng) * 0.35;
}

function getNeighborEntries(key) {
  const point = keyToPoint(key);
  const neighbors = [];

  for (let dLat = -1; dLat <= 1; dLat += 1) {
    for (let dLng = -1; dLng <= 1; dLng += 1) {
      if (dLat === 0 && dLng === 0) {
        continue;
      }

      neighbors.push({
        key: toCellKey(
          point.lat + dLat * CELL_SIZE,
          point.lng + dLng * CELL_SIZE
        ),
        diagonal: dLat !== 0 && dLng !== 0
      });
    }
  }

  return neighbors;
}

function reconstructPath(cameFrom, currentKey) {
  const path = [currentKey];
  let cursor = currentKey;

  while (cameFrom.has(cursor)) {
    cursor = cameFrom.get(cursor);
    path.push(cursor);
  }

  return path.reverse();
}

function findLowestFScore(openSet, fScore) {
  let bestKey = null;
  let bestValue = Infinity;

  for (const key of openSet) {
    const value = fScore.get(key) ?? Infinity;
    if (value < bestValue) {
      bestValue = value;
      bestKey = key;
    }
  }

  return bestKey;
}

function isCellAllowed(cell, passMode) {
  const band = getSafetyBand(cell);

  if (passMode === 'green_only') {
    return band === 0;
  }

  if (passMode === 'green_yellow_only') {
    return band <= 1;
  }

  if (passMode === 'allow_orange') {
    return band <= 2;
  }

  if (passMode === 'allow_red') {
    return band <= 3;
  }

  return true;
}

function aStarSearch(cellMap, startKey, goalKey, passMode) {
  if (!cellMap.has(startKey) || !cellMap.has(goalKey)) {
    return [];
  }

  const openSet = new Set([startKey]);
  const cameFrom = new Map();
  const gScore = new Map([[startKey, 0]]);
  const fScore = new Map([[startKey, heuristicCost(startKey, goalKey)]]);

  while (openSet.size > 0) {
    const current = findLowestFScore(openSet, fScore);

    if (!current) {
      break;
    }

    if (current === goalKey) {
      return reconstructPath(cameFrom, current);
    }

    openSet.delete(current);

    for (const neighbor of getNeighborEntries(current)) {
      const neighborCell = cellMap.get(neighbor.key);
      const currentCell = cellMap.get(current);

      if (!neighborCell || !currentCell) {
        continue;
      }

      if (!isCellAllowed(neighborCell, passMode) && neighbor.key !== goalKey) {
        continue;
      }

      const stepMultiplier = neighbor.diagonal ? SQRT2 : 1;

      const tentativeG =
        (gScore.get(current) ?? Infinity) +
        getTraversalCost(neighborCell) * stepMultiplier +
        getTransitionPenalty(currentCell, neighborCell) +
        0.03 * stepMultiplier;

      if (tentativeG < (gScore.get(neighbor.key) ?? Infinity)) {
        cameFrom.set(neighbor.key, current);
        gScore.set(neighbor.key, tentativeG);
        fScore.set(
          neighbor.key,
          tentativeG + heuristicCost(neighbor.key, goalKey)
        );
        openSet.add(neighbor.key);
      }
    }
  }

  return [];
}

function compressPathToWaypoints(pathKeys) {
  if (pathKeys.length < 3) {
    return [];
  }

  const points = pathKeys.map(keyToPoint);
  const sampled = [];
  const stride = Math.max(1, Math.floor(points.length / 28));

  for (let i = 1; i < points.length - 1; i += stride) {
    sampled.push({
      lat: Number(points[i].lat.toFixed(6)),
      lng: Number(points[i].lng.toFixed(6))
    });
  }

  return sampled.slice(0, 24);
}

function dedupeWaypoints(waypoints, origin, destination) {
  const seen = new Set();
  const filtered = [];

  for (const point of waypoints) {
    const key = `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
    const originKey = `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}`;
    const destinationKey = `${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}`;

    if (key === originKey || key === destinationKey || seen.has(key)) {
      continue;
    }

    seen.add(key);
    filtered.push(point);
  }

  return filtered;
}

function buildSafeWaypoints(origin, destination, cells) {
  const cellMap = buildCellMap(cells, origin, destination);
  const startKey = toCellKey(origin.lat, origin.lng);
  const goalKey = toCellKey(destination.lat, destination.lng);

  const passModes = [
    'green_only',
    'green_yellow_only',
    'allow_orange',
    'allow_red',
    'allow_all'
  ];

  for (const passMode of passModes) {
    const pathKeys = aStarSearch(cellMap, startKey, goalKey, passMode);

    if (!pathKeys.length) {
      continue;
    }

    const rawWaypoints = compressPathToWaypoints(pathKeys);
    const waypoints = dedupeWaypoints(rawWaypoints, origin, destination);

    console.log('Routing pass:', passMode);
    console.log('A* path length:', pathKeys.length);
    console.log('Safe waypoints count:', waypoints.length);

    if (waypoints.length > 0) {
      return waypoints;
    }
  }

  return [];
}

export async function getSafestRouteCandidate(origin, destination) {
  if (!isLatLngObject(origin) || !isLatLngObject(destination)) {
    return null;
  }

  const cells = await getCandidateSafetyCells(origin, destination);
  const waypoints = buildSafeWaypoints(origin, destination, cells);

  if (!waypoints.length) {
    return null;
  }

  const safeRoutes = await getWalkingRouteWithWaypoints(
    origin,
    destination,
    waypoints
  );

  if (!safeRoutes.length) {
    return null;
  }

  return {
    ...safeRoutes[0],
    routeId: `safe-${Date.now()}`,
    forcedWaypoints: waypoints
  };
}