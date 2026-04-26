import express from 'express';
import pool from '../db/db.js';
import { decodeRoutePolyline } from '../services/polylineService.js';
import {
  getCellData,
  sampleRoutePoints,
  uniqueCellsFromPoints
} from '../services/safetyCellService.js';

const router = express.Router();

function validateRatingInput({ origin, destination, safetyRating, polyline }) {
  const numericRating = Number(safetyRating);

  if (!origin || !destination || numericRating == null || !polyline) {
    return 'Missing required fields';
  }

  if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 10) {
    return 'Safety rating must be between 1 and 10';
  }

  return null;
}

router.post('/', async (req, res, next) => {
  const { origin, destination, safetyRating, notes, polyline } = req.body;

  const error = validateRatingInput(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const numericRating = Number(safetyRating);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
      INSERT INTO ratings (origin, destination, safety_ratings, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [origin, destination, numericRating, notes]
    );

    const decodedPoints = decodeRoutePolyline(polyline);
    const sampledPoints = sampleRoutePoints(decodedPoints, 5);
    const uniquePoints = uniqueCellsFromPoints(sampledPoints);

    const cellDataList = uniquePoints.map(p => getCellData(p.lat, p.lng));
    const cellKeys = cellDataList.map(c => c.cellKey);

    const existingRes = await client.query(
      `
      SELECT cell_key, avg_rating, report_count
      FROM safety_cells
      WHERE cell_key = ANY($1)
      `,
      [cellKeys]
    );

    const existingMap = new Map(
      existingRes.rows.map(row => [row.cell_key, row])
    );

    for (const cell of cellDataList) {
      const existing = existingMap.get(cell.cellKey);

      if (!existing) {
        await client.query(
          `
          INSERT INTO safety_cells (cell_key, center_lat, center_lng, avg_rating, report_count)
          VALUES ($1, $2, $3, $4, $5)
          `,
          [cell.cellKey, cell.centerLat, cell.centerLng, numericRating, 1]
        );
      } else {
        const oldAvg = Number(existing.avg_rating);
        const oldCount = Number(existing.report_count);

        const newCount = oldCount + 1;
        const newAvg = (oldAvg * oldCount + numericRating) / newCount;

        await client.query(
          `
          UPDATE safety_cells
          SET avg_rating = $1,
              report_count = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE cell_key = $3
          `,
          [newAvg, newCount, cell.cellKey]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json(result.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    next(err); 
  } finally {
    client.release();
  }
});

export default router;