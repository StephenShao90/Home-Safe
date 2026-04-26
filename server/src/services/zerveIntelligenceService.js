const ZERVE_SCORE_URL = process.env.ZERVE_SCORE_URL;

export async function scoreCellsWithZerve(cells, hour) {
  if (!ZERVE_SCORE_URL) {
    throw new Error("Missing ZERVE_SCORE_URL in .env");
  }

  const response = await fetch(ZERVE_SCORE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ cells, hour })
  });

  const text = await response.text();

  if (!response.ok) {
    console.error("[ZERVE ERROR]", text);
    throw new Error(`Zerve failed ${response.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON from Zerve");
  }
}