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