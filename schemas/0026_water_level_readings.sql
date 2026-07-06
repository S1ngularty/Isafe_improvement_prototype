CREATE TABLE water_level_readings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sensor_id TEXT NOT NULL,
  distance_mm REAL NOT NULL,
  water_level_cm REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'SAFE',
  samples INT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE water_level_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "water_level_readings_select"
  ON water_level_readings FOR SELECT
  USING (true);
