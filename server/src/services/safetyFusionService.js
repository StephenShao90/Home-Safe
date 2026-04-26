import pool from '../db/db.js';
import { SAFETY_CONFIG } from '../config/safetyConfig.js';
import { clampScore, scoreToBucket } from '../utils/scoreUtils.js';

async function getUserScoreForCell(cellId) {
  const result = await pool.query(
    `
    SELECT AVG(safety_ratings)::numeric(10,2) AS avg_rating,
           COUNT(*) AS rating_count
    FROM ratings
    WHERE cell_id = $1
    `,
    [cellId]
  );

  const avg = result.rows[0]?.avg_rating;
  const count = Number(result.rows[0]?.rating_count || 0);

  if (!count || avg === null) {
    return { score: null, count: 0 };
  }

  return { score: Number(avg), count };
}

export async function fuseSafetyCells(baselineCells) {
  const fused = [];

  for (const cell of baselineCells) {
    const user = await getUserScoreForCell(cell.cell_id);

    const publicScore = clampScore(cell.baseline_score);
    const userScore = user.score === null ? publicScore : clampScore(user.score);

    const finalScore =
      SAFETY_CONFIG.publicWeight * publicScore +
      SAFETY_CONFIG.userWeight * userScore;

    fused.push({
      ...cell,
      final_score: Number(finalScore.toFixed(2)),
      bucket: scoreToBucket(finalScore),
      user_score: user.score,
      user_rating_count: user.count
    });
  }

  return fused;
}