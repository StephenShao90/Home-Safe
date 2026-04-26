import express from 'express';
import { getEnrichedSafetyCells } from '../controllers/intelligenceController.js';

const router = express.Router();

router.post('/cells', getEnrichedSafetyCells);

export default router;