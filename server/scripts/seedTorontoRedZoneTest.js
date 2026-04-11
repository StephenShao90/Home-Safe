import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT)
});

const CELL_SIZE = 0.0025;

const TEST_CONFIG = {
  origin: {
    name: 'Trinity Bellwoods Park',
    lat: 43.6477,
    lng: -79.4141
  },
  destination: {
    name: 'Allan Gardens',
    lat: 43.6615,
    lng: -79.3749
  },

  // red barrier in the middle
  redZones: [
    { lat: 43.6532, lng: -79.4018, radiusMeters: 95, rating: 1.2 },
    { lat: 43.6538, lng: -79.3998, radiusMeters: 95, rating: 1.1 },
    { lat: 43.6544, lng: -79.3978, radiusMeters: 95, rating: 1.0 },
    { lat: 43.6550, lng: -79.3958, radiusMeters: 95, rating: 1.2 },
    { lat: 43.6556, lng: -79.3938, radiusMeters: 95, rating: 1.1 }
  ],

  // middle corridor through the barrier
  yellowZones: [
    { lat: 43.6544, lng: -79.3998, radiusMeters: 85, rating: 7.0 },
    { lat: 43.6549, lng: -79.3978, radiusMeters: 85, rating: 7.1 },
    { lat: 43.6554, lng: -79.3958, radiusMeters: 85, rating: 7.0 }
  ],

  // upper safe corridor
  greenZones: [
    { lat: 43.6576, lng: -79.4048, radiusMeters: 105, rating: 9.4 },
    { lat: 43.6580, lng: -79.4018, radiusMeters: 105, rating: 9.5 },
    { lat: 43.6584, lng: -79.3988, radiusMeters: 105, rating: 9.5 },
    { lat: 43.6588, lng: -79.3958, radiusMeters: 105, rating: 9.4 },
    { lat: 43.6592, lng: -79.3928, radiusMeters: 105, rating: 9.5 }
  ],

  // some green near start/end so the path wants to connect
  entryGreenZones: [
    { lat: 43.6490, lng: -79.4108, radiusMeters: 120, rating: 9.3 },
    { lat: 43.6515, lng: -79.4072, radiusMeters: 120, rating: 9.4 },
    { lat: 43.6608, lng: -79.3892, radiusMeters: 120, rating: 9.3 },
    { lat: 43.6620, lng: -79.3848, radiusMeters: 120, rating: 9.4 }
  ],

  paddingLat: 0.018,
  paddingLng: 0.026,
  syntheticReportCount: 100
};

function roundToCell(value) {
  return Math.floor(value / CELL_SIZE) * CELL_SIZE;
}

function getCellData(lat, lng) {
  const cellLat = roundToCell(lat);
  const cellLng = roundToCell(lng);

  return {
    cellKey: `${cellLat.toFixed(4)},${cellLng.toFixed(4)}`,
    centerLat: Number((cellLat + CELL_SIZE / 2).toFixed(6)),
    centerLng: Number((cellLng + CELL_SIZE / 2).toFixed(6))
  };
}

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function haversineMeters(a, b) {
  const R = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const x =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * R * Math.asin(Math.sqrt(x));
}

function buildBounds(config) {
  const centerLat = (config.origin.lat + config.destination.lat) / 2;
  const centerLng = (config.origin.lng + config.destination.lng) / 2;

  return {
    minLat: centerLat - config.paddingLat,
    maxLat: centerLat + config.paddingLat,
    minLng: centerLng - config.paddingLng,
    maxLng: centerLng + config.paddingLng
  };
}

function getBestRating(point, zones) {
  let chosen = null;

  for (const zone of zones) {
    const distance = haversineMeters(point, zone);

    if (distance <= zone.radiusMeters) {
      if (!chosen || zone.rating > chosen.rating) {
        chosen = zone;
      }
    }
  }

  return chosen ? chosen.rating : null;
}

function getWorstRating(point, zones) {
  let chosen = null;

  for (const zone of zones) {
    const distance = haversineMeters(point, zone);

    if (distance <= zone.radiusMeters) {
      if (!chosen || zone.rating < chosen.rating) {
        chosen = zone;
      }
    }
  }

  return chosen ? chosen.rating : null;
}

function buildSyntheticCells(config) {
  const bounds = buildBounds(config);
  const cells = [];

  for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += CELL_SIZE) {
    for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += CELL_SIZE) {
      const { cellKey, centerLat, centerLng } = getCellData(lat, lng);
      const point = { lat: centerLat, lng: centerLng };

      const entryGreenRating = getBestRating(point, config.entryGreenZones);
      const greenRating = getBestRating(point, config.greenZones);
      const yellowRating = getBestRating(point, config.yellowZones);
      const redRating = getWorstRating(point, config.redZones);

      let rating = null;

      if (entryGreenRating !== null) rating = entryGreenRating;
      if (greenRating !== null) rating = greenRating;
      if (yellowRating !== null) rating = yellowRating;
      if (redRating !== null) rating = redRating;

      if (rating !== null) {
        cells.push({
          cellKey,
          centerLat,
          centerLng,
          avgRating: rating,
          reportCount: config.syntheticReportCount
        });
      }
    }
  }

  const unique = new Map();
  for (const cell of cells) {
    unique.set(cell.cellKey, cell);
  }

  return [...unique.values()];
}

async function clearSyntheticArea(client, config) {
  const bounds = buildBounds(config);

  await client.query(
    `
    DELETE FROM safety_cells
    WHERE center_lat BETWEEN $1 AND $2
      AND center_lng BETWEEN $3 AND $4
    `,
    [bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng]
  );
}

async function upsertCells(client, cells) {
  for (const cell of cells) {
    await client.query(
      `
      INSERT INTO safety_cells (cell_key, center_lat, center_lng, avg_rating, report_count)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (cell_key)
      DO UPDATE SET
        center_lat = EXCLUDED.center_lat,
        center_lng = EXCLUDED.center_lng,
        avg_rating = EXCLUDED.avg_rating,
        report_count = EXCLUDED.report_count,
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        cell.cellKey,
        cell.centerLat,
        cell.centerLng,
        cell.avgRating,
        cell.reportCount
      ]
    );
  }
}

async function main() {
  const mode = process.argv[2] || 'seed';
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (mode === 'reset') {
      await clearSyntheticArea(client, TEST_CONFIG);
      await client.query('COMMIT');
      console.log('Reset complete.');
      return;
    }

    const syntheticCells = buildSyntheticCells(TEST_CONFIG);

    await clearSyntheticArea(client, TEST_CONFIG);
    await upsertCells(client, syntheticCells);

    await client.query('COMMIT');

    console.log('Seed complete.');
    console.log(`Inserted/updated ${syntheticCells.length} synthetic safety cells.`);
    console.log(`Origin: ${TEST_CONFIG.origin.name}`);
    console.log(`Destination: ${TEST_CONFIG.destination.name}`);
    console.log('Expected: quickest through center, safest above, best mix through middle corridor if available.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();