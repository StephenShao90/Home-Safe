import pool from '../db/db.js';

export async function getSafetyScoreForRoute(route) {
  try {
    const { origin, destination } = route;

    // Tier 1: exact match
    const exactResult = await pool.query(
      `
      SELECT AVG(safety_ratings)::numeric(10,2) AS average_rating,
             COUNT(*) AS report_count
      FROM ratings
      WHERE origin = $1 AND destination = $2
      `,
      [origin, destination]
    );

    const exactAverage = exactResult.rows[0].average_rating;
    const exactCount = Number(exactResult.rows[0].report_count);

    if (exactCount > 0 && exactAverage !== null) {
      return Number(exactAverage);
    }

    // Tier 2: partial/case-insensitive match
    const partialResult = await pool.query(
      `
      SELECT AVG(safety_ratings)::numeric(10,2) AS average_rating,
             COUNT(*) AS report_count
      FROM ratings
      WHERE origin ILIKE $1 AND destination ILIKE $2
      `,
      [`%${origin}%`, `%${destination}%`]
    );

    const partialAverage = partialResult.rows[0].average_rating;
    const partialCount = Number(partialResult.rows[0].report_count);

    if (partialCount > 0 && partialAverage !== null) {
      return Number(partialAverage);
    }

    // Tier 3: no useful data
    return 5.0;
  } catch (error) {
    console.error('Error in getSafetyScoreForRoute:', error.message);
    throw new Error('Failed to calculate safety score');
  }
}