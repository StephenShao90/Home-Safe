import pool from '../db/db.js';
import { SAFETY_CONFIG } from '../config/safetyConfig.js';
import { clampScore, scoreToBucket } from '../utils/scoreUtils.js';

/**
 * Batch fetch user ratings for multiple cells
 */
async function getUserScores(cellIds) {
  if (!cellIds.length) return new Map();

  const result = await pool.query(
    `
    SELECT cell_key, avg_rating, report_count
    FROM safety_cells
    WHERE cell_key = ANY($1)
    `,
    [cellIds]
  );

  const map = new Map();

  for (const row of result.rows) {
    map.set(row.cell_key, {
      score: row.avg_rating !== null ? Number(row.avg_rating) : null,
      count: Number(row.report_count || 0)
    });
  }

  return map;
}

/**
 * Combines Zerve baseline score + user rating score
 */
export async function fuseSafetyCells(baselineCells) {
  if (!baselineCells.length) return [];

  const cellIds = baselineCells.map(c => c.cell_id);
  const userMap = await getUserScores(cellIds);

  const fused = [];

  for (const cell of baselineCells) {
    const user = userMap.get(cell.cell_id) || { score: null, count: 0 };

    const publicScore = clampScore(cell.baseline_score);

    const userScore =
      user.score === null ? publicScore : clampScore(user.score);

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