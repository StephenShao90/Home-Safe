export async function getWalkingRoute(origin, destination) {
  try {
    // Temporary mock response
    // Later this will be replaced with a real Google Maps API call
    return {
      origin,
      destination,
      distance: "3.1 km",
      duration: "34 mins",
      polyline: "mock_encoded_polyline_string"
    };
  } catch (error) {
    console.error("Error in getWalkingRoute:", error.message);
    throw new Error("Failed to fetch walking route");
  }
}