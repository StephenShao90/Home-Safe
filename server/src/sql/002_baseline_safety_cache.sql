CREATE TABLE IF NOT EXISTS baseline_safety_cache (
  cell_id TEXT NOT NULL,
  hour_of_day INTEGER NOT NULL,
  baseline_score NUMERIC(10,2) NOT NULL,
  crime_component NUMERIC(10,2),
  time_component NUMERIC(10,2),
  density_component NUMERIC(10,2),
  transit_component NUMERIC(10,2),
  confidence NUMERIC(10,4),
  bucket TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cell_id, hour_of_day)
);