import { scoreCellsWithZerve } from "../services/zerveIntelligenceService.js";
import { fuseSafetyCells } from "../services/safetyFusionService.js";

/**
 * Enriches map safety cells using Zerve baseline scoring,
 * then fuses those results with local database/user rating data.
 */
export async function getEnrichedSafetyCells(req, res) {
  try {
    const { cells, hour } = req.body;

    if (!Array.isArray(cells) || cells.length === 0) {
      return res.status(400).json({
        error: "cells array is required"
      });
    }

    const requestHour = Number.isFinite(Number(hour))
      ? Number(hour)
      : new Date().getHours();

    const baseline = await scoreCellsWithZerve(cells, requestHour);
    const fused = await fuseSafetyCells(baseline?.cells || []);

    return res.status(200).json({
      cells: fused
    });
  } catch (error) {
    console.error("getEnrichedSafetyCells error:", error.message);

    return res.status(500).json({
      error: "Failed to enrich safety cells"
    });
  }
}