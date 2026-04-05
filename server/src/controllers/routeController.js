import { getWalkingRoute } from "../services/googleMapsService.js";
import { getSafetyScoreForRoute} from "../services/safetyScoringService.js"

export async function getTestRoute(req, res) {
  try {
    const route = await getWalkingRoute("Waterloo, ON", "University of Waterloo");
    const safetyScore = await getSafetyScoreForRoute(route);
    res.status(200).json({
        ...route,
        safetyScore
  });
  } catch (error) {
    console.error("Error in getTestRoute:", error.message);
    res.status(500).json({ error: "Failed to get route data" });
  }
}

export async function computeRoute(req, res) {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        error: "Origin and destination are required"
      });
    }

    const route = await getWalkingRoute(origin, destination);
    const safetyScore = await getSafetyScoreForRoute(route);

    res.status(200).json({
        ...route,
        safetyScore
    });
  } catch (error) {
    console.error("Error in computeRoute:", error.message);
    res.status(500).json({ error: "Failed to compute route" });
  }
}