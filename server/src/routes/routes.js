import express from 'express';
import { getTestRoute, computeRoute } from '../controllers/routeController.js';

const router = express.Router();

router.get('/test', getTestRoute);
router.post('/compute', computeRoute);

export default router;