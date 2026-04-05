import express from 'express';
import pool from '../db/db.js';

const router = express.Router();

/*
POST /api/ratings
Stores a user-submitted trip safety rating
*/
router.post('/', async (req, res) => {
  const { origin, destination, safetyRating, notes } = req.body;

  if (!origin || !destination || !safetyRating) {
    return res.status(400).json({
      error: 'Missing required fields'
    });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO ratings (origin, destination, safety_ratings, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [origin, destination, safetyRating, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('RATING INSERT ERROR:', error.message);

    res.status(500).json({
      error: 'Failed to save rating'
    });
  }
});

export default router;