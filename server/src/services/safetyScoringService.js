export async function getSafetyScoreForRoute(route) {
    try{
        // Temporary mock score for MVP development
        // Later this will use database reports and route geometry
        return 6.8;
    }catch (error){
        console.error("Error in getSafetyScoreForRoute:", error.message);
        throw new Error("Failed to calculate safety score");
    }
}