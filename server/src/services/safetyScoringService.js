import pool from '../db/db.js';
import { scoreCellsWithZerve } from './zerveIntelligenceService.js';

const CELL_SIZE = 0.0025;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function decodePolyline(polyline) {
  if (!polyline || typeof polyline !== 'string') return [];

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

    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    shift = 0;
    result = 0;

    do {
      byte = polyline.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    coordinates.push({
      lat: lat / 1e5,
      lng: lng / 1e5
    });
  }

  return coordinates;
}

function toCellCoord(value) {
  return Math.floor(value / CELL_SIZE) * CELL_SIZE + CELL_SIZE / 2;
}

function toCellKey(lat, lng) {
  return `${toCellCoord(lat).toFixed(4)},${toCellCoord(lng).toFixed(4)}`;
}

function sampleRouteCells(points) {
  const seen = new Set();
  const cells = [];

  const stride = Math.max(1, Math.floor(points.length / 40));

  for (let i = 0; i < points.length; i += stride) {
    const point = points[i];
    const centerLat = Number(toCellCoord(point.lat).toFixed(6));
    const centerLng = Number(toCellCoord(point.lng).toFixed(6));
    const cellKey = toCellKey(point.lat, point.lng);

    if (seen.has(cellKey)) continue;

    seen.add(cellKey);

    cells.push({
      cell_id: cellKey,
      lat: centerLat,
      lng: centerLng
    });
  }

  return cells;
}

async function saveZerveCellsToDatabase(cells) {
  for (const cell of cells) {
    await pool.query(
      `
      INSERT INTO safety_cells (
        cell_key,
        center_lat,
        center_lng,
        avg_rating,
        report_count
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (cell_key)
      DO UPDATE SET
        avg_rating = EXCLUDED.avg_rating,
        report_count = GREATEST(safety_cells.report_count, EXCLUDED.report_count)
      `,
      [
        cell.cell_id,
        cell.lat,
        cell.lng,
        cell.baseline_score,
        1
      ]
    );
  }
}

function estimateCoverageFromZerveCells(cells) {
  if (!cells.length) return 0;

  let total = 0;

  for (const cell of cells) {
    const score = Number(cell.baseline_score);

    if (score >= 8.5) total += 1.0;
    else if (score >= 6.5) total += 0.75;
    else if (score >= 4.5) total += 0.4;
    else total += 0.1;
  }

  return Math.round((total / cells.length) * 100);
}

export async function getSafetyScoreForRoute(route) {
  try {
    const routePoints = decodePolyline(route?.polyline);

    if (!routePoints.length) {
      return {
        safetyScore: 5,
        greenCoverage: 0
      };
    }

    const cells = sampleRouteCells(routePoints);
    const hour = new Date().getHours();

    console.log('[SAFETY] Route points:', routePoints.length);
    console.log('[SAFETY] Sampled cells:', cells.length);
    console.log('[SAFETY] Calling Zerve...');

    const zerveResult = await scoreCellsWithZerve(cells, hour);
    const scoredCells = zerveResult.cells || [];

    console.log('[SAFETY] Zerve returned cells:', scoredCells.length);

    await saveZerveCellsToDatabase(scoredCells);

    const avgScore =
      scoredCells.reduce((sum, cell) => sum + Number(cell.baseline_score || 5), 0) /
      Math.max(scoredCells.length, 1);

    const greenCoverage = estimateCoverageFromZerveCells(scoredCells);

    return {
      safetyScore: clamp(Number(avgScore.toFixed(2)), 0, 10),
      greenCoverage
    };
  } catch (error) {
    console.error('[SAFETY] Error in getSafetyScoreForRoute:', error.message);

    return {
      safetyScore: 5,
      greenCoverage: 0
    };
  }
}