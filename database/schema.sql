DROP TABLE IF EXISTS safety_reports;

CREATE TABLE safety_reports (
    id SERIAL PRIMARY KEY,

    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lng DOUBLE PRECISION NOT NULL,

    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lng DOUBLE PRECISION NOT NULL,

    route_polyline TEXT NOT NULL,

    safety_rating INTEGER NOT NULL CHECK (safety_rating >= 1 AND safety_rating <= 10),

    notes TEXT DEFAULT '',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ratings(
    id SERIAL PRIMARY KEY,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    safety_ratings INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS safety_cells (
    id SERIAL PRIMARY KEY,
    cell_key TEXT UNIQUE NOT NULL,
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    avg_rating DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    report_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);