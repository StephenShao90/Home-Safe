import express from 'express';
import pool from '../db/db.js';

const router = express.Router();

router.get('/cells', async (req, res, next) => {
  try {
    const { minLat, maxLat, minLng, maxLng } = req.query;

    const bounds = [minLat, maxLat, minLng, maxLng].map(Number);

    if (bounds.some(v => !Number.isFinite(v))) {
      return res.status(400).json({ error: 'Invalid map bounds' });
    }

    const result = await pool.query(
      `
      SELECT cell_key, center_lat, center_lng, avg_rating, report_count
      FROM safety_cells
      WHERE center_lat BETWEEN $1 AND $2
        AND center_lng BETWEEN $3 AND $4
      `,
      bounds
    );

    res.json({ cells: result.rows });

  } catch (err) {
    next(err);
  }
});

export default router;