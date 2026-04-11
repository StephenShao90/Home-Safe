import express from 'express';
import pool from '../db/db.js';

const router = express.Router();

router.get('/cells', async (req, res) => {
  const { minLat, maxLat, minLng, maxLng } = req.query;

  if (
    minLat === undefined ||
    maxLat === undefined ||
    minLng === undefined ||
    maxLng === undefined
  ) {
    return res.status(400).json({
      error: 'Missing map bounds'
    });
  }

  const parsedMinLat = Number(minLat);
  const parsedMaxLat = Number(maxLat);
  const parsedMinLng = Number(minLng);
  const parsedMaxLng = Number(maxLng);

  if (
    !Number.isFinite(parsedMinLat) ||
    !Number.isFinite(parsedMaxLat) ||
    !Number.isFinite(parsedMinLng) ||
    !Number.isFinite(parsedMaxLng)
  ) {
    return res.status(400).json({
      error: 'Map bounds must be valid numbers'
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT cell_key, center_lat, center_lng, avg_rating, report_count
      FROM safety_cells
      WHERE center_lat BETWEEN $1 AND $2
        AND center_lng BETWEEN $3 AND $4
      `,
      [parsedMinLat, parsedMaxLat, parsedMinLng, parsedMaxLng]
    );

    res.status(200).json({
      cells: result.rows
    });
  } catch (error) {
    console.error('SAFETY CELLS ERROR:', error.message);
    res.status(500).json({
      error: 'Failed to load safety cells'
    });
  }
});


export default router;