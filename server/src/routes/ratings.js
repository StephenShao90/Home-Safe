import express from 'express';
import pool from '../db/db.js';
import { decodeRoutePolyline } from '../services/polylineService.js';
import {
  getCellData,
  sampleRoutePoints,
  uniqueCellsFromPoints
} from '../services/safetyCellService.js';

const router = express.Router();

/*
  Use transaction-safe client instead of pool
*/
async function upsertSafetyCell(client, lat, lng, safetyRating) {
  const { cellKey, centerLat, centerLng } = getCellData(lat, lng);

  const existing = await client.query(
    `
    SELECT avg_rating, report_count
    FROM safety_cells
    WHERE cell_key = $1
    `,
    [cellKey]
  );

  if (existing.rows.length === 0) {
    await client.query(
      `
      INSERT INTO safety_cells (cell_key, center_lat, center_lng, avg_rating, report_count)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [cellKey, centerLat, centerLng, safetyRating, 1]
    );
    return;
  }

  const current = existing.rows[0];
  const oldAvg = Number(current.avg_rating);
  const oldCount = Number(current.report_count);

  const newCount = oldCount + 1;
  const newAvg = (oldAvg * oldCount + safetyRating) / newCount;

  await client.query(
    `
    UPDATE safety_cells
    SET avg_rating = $1,
        report_count = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE cell_key = $3
    `,
    [newAvg, newCount, cellKey]
  );
}

router.post('/', async (req, res) => {
  const { origin, destination, safetyRating, notes, polyline } = req.body;

  const numericRating = Number(safetyRating);

  // ✅ Strong validation
  if (!origin || !destination || numericRating == null || !polyline) {
    return res.status(400).json({
      error: 'Missing required fields'
    });
  }

  if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 10) {
    return res.status(400).json({
      error: 'Safety rating must be a number between 1 and 10'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ✅ Insert rating
    const result = await client.query(
      `
      INSERT INTO ratings (origin, destination, safety_ratings, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [origin, destination, numericRating, notes]
    );

    // ✅ Decode route
    const decodedPoints = decodeRoutePolyline(polyline);

    // ✅ Sample + dedupe
    const sampledPoints = sampleRoutePoints(decodedPoints, 5);
    const uniquePoints = uniqueCellsFromPoints(sampledPoints);

    // ✅ Update safety cells
    for (const point of uniquePoints) {
      await upsertSafetyCell(client, point.lat, point.lng, numericRating);
    }

    await client.query('COMMIT');

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('RATING INSERT ERROR:', error.message);

    res.status(500).json({
      error: 'Failed to save rating'
    });
  } finally {
    client.release();
  }
});

export default router;