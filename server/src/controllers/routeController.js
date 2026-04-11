import { getWalkingRoutes } from "../services/googleMapsService.js";
import { getSafetyScoreForRoute } from "../services/safetyScoringService.js";
import { getSafestRouteCandidate } from "../services/safeRoutingService.js";

function getTimePenaltyMinutes(fastestSeconds, saferSeconds) {
  return Math.max(0, Math.round((saferSeconds - fastestSeconds) / 60));
}

function isSameRoute(a, b) {
  return a?.polyline && b?.polyline && a.polyline === b.polyline;
}

function getBalancedRoute(routes, fastestRoute, safestRoute) {
  if (!routes.length) return null;

  const fastestTime = fastestRoute?.durationValue || 1;
  const fastestSafety = fastestRoute?.safetyScore || 0;
  const safestSafety = safestRoute?.safetyScore || fastestSafety;

  const safetySpan = Math.max(0.001, safestSafety - fastestSafety);
  const safestExtraSeconds = Math.max(
    1,
    (safestRoute?.durationValue || fastestTime) - fastestTime
  );

  const ranked = routes
    .map((route) => {
      const extraSeconds = Math.max(
        0,
        (route.durationValue || fastestTime) - fastestTime
      );

      const safetyGain =
        ((route.safetyScore || 0) - fastestSafety) / safetySpan;

      const timeShare = extraSeconds / safestExtraSeconds;

      return {
        ...route,
        safetyGain,
        timeShare,
        middleDistance: Math.abs(safetyGain - timeShare)
      };
    })
    .sort((a, b) => a.middleDistance - b.middleDistance);

  const trueMiddle = ranked.find(
    (route) =>
      route.polyline !== fastestRoute?.polyline &&
      route.polyline !== safestRoute?.polyline &&
      route.safetyGain > 0.2 &&
      route.timeShare < 0.95
  );

  if (trueMiddle) {
    return trueMiddle;
  }

  const compromise = ranked.find(
    (route) =>
      route.polyline !== safestRoute?.polyline &&
      route.safetyGain >= 0.45 &&
      route.timeShare <= 0.65
  );

  if (compromise) {
    return compromise;
  }

  return safestRoute;
}

async function scoreRoutes(routes) {
  return Promise.all(
    routes.map(async (route) => {
      const result = await getSafetyScoreForRoute(route);

      return {
        ...route,
        safetyScore: Number(result?.safetyScore) || 5,
        greenCoverage: Number(result?.greenCoverage) || 0
      };
    })
  );
}

function dedupeRoutes(routes) {
  const unique = [];

  for (const route of routes) {
    if (!unique.some((existing) => isSameRoute(existing, route))) {
      unique.push(route);
    }
  }

  return unique;
}

function buildResponse(scoredRoutes) {
  if (!scoredRoutes.length) {
    return {
      routes: [],
      allRoutes: [],
      timePenaltyMinutes: 0
    };
  }

  const uniqueRoutes = dedupeRoutes(scoredRoutes);

  const byFastest = [...uniqueRoutes].sort(
    (a, b) => (a.durationValue || 0) - (b.durationValue || 0)
  );

  const bySafest = [...uniqueRoutes].sort((a, b) => {
    const aScore = (a.safetyScore || 0) - (a.durationValue || 0) / 300;
    const bScore = (b.safetyScore || 0) - (b.durationValue || 0) / 300;

    return bScore - aScore;
  });

  const fastest = byFastest[0];
  const safest = bySafest[0];
  const balanced = getBalancedRoute(uniqueRoutes, fastest, safest) || fastest;

  return {
    routes: [
      { ...fastest, optionKey: "quickest", title: "Quickest" },
      { ...safest, optionKey: "safest", title: "Safest" },
      { ...balanced, optionKey: "balanced", title: "Best Mix" }
    ],
    allRoutes: uniqueRoutes,
    timePenaltyMinutes: getTimePenaltyMinutes(
      fastest?.durationValue || 0,
      safest?.durationValue || 0
    )
  };
}

export async function computeRoute(req, res) {
  try {
    const { origin, destination, originName, destinationName } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        error: "Origin and destination are required"
      });
    }

    const googleRoutes = (await getWalkingRoutes(origin, destination)).map((route) => ({
      ...route,
      originName: originName || null,
      destinationName: destinationName || null
    }));

    const safestCandidate = await getSafestRouteCandidate(origin, destination);

    const combinedRoutes = safestCandidate
      ? [...googleRoutes, { ...safestCandidate, originName: originName || null, destinationName: destinationName || null }]
      : googleRoutes;

    const scoredRoutes = await scoreRoutes(combinedRoutes);

    res.status(200).json(buildResponse(scoredRoutes));
  } catch (error) {
    console.error("Error in computeRoute:", error.message);
    res.status(500).json({ error: error.message });
  }
}

export async function getTestRoute(req, res) {
  try {
    const { origin, destination, originName, destinationName } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({
        error: "Origin and destination are required"
      });
    }

    const googleRoutes = (await getWalkingRoutes(origin, destination)).map((route) => ({
      ...route,
      originName: originName || null,
      destinationName: destinationName || null
    }));

    const safestCandidate = await getSafestRouteCandidate(origin, destination);

    const combinedRoutes = safestCandidate
      ? [...googleRoutes, { ...safestCandidate, originName: originName || null, destinationName: destinationName || null }]
      : googleRoutes;

    const scoredRoutes = await scoreRoutes(combinedRoutes);

    res.status(200).json(buildResponse(scoredRoutes));
  } catch (error) {
    console.error("Error in getTestRoute:", error.message);
    res.status(500).json({ error: error.message });
  }
}