const ZERVE_SCORE_URL = process.env.ZERVE_SCORE_URL;

export async function scoreCellsWithZerve(cells, hour) {
  if (!ZERVE_SCORE_URL) {
    throw new Error("Missing ZERVE_SCORE_URL in .env");
  }

  console.log("[ZERVE] Sending cells:", cells.length);
  console.log("[ZERVE] URL:", ZERVE_SCORE_URL);

  const response = await fetch(ZERVE_SCORE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ cells, hour })
  });

  const text = await response.text();

  console.log("[ZERVE] Status:", response.status);
  console.log("[ZERVE] Raw response:", text.slice(0, 500));

  if (!response.ok) {
    throw new Error(`Zerve failed ${response.status}: ${text}`);
  }

  return JSON.parse(text);
}