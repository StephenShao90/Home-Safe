import { scoreCellsWithZerve } from "../services/zerveIntelligenceService.js";
import { fuseSafetyCells } from "../services/safetyFusionService.js";

export async function getEnrichedSafetyCells(req, res){
    try {
        const { cells, hour } = req.body;

        if (!Array.isArray(cells) || cells.length === 0){
            return res.status(400).json({error: 'cells array is required'});
        }

        const baseline = await fetchBaselineSafetyForCells(cells, hour ?? new Date().getHours());
        const fused = await fuseSafetyCells(baseline.cells || []);

        res.json({ cells: fused });
    }catch (error){
        console.error('getEnrichedSafetyCells error:', error);
        res.status(500).json({ error: 'Failed to enrich safety cells' });
    }
}