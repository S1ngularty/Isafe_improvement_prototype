CREATE TABLE IF NOT EXISTS tide_data (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  json_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO tide_data (id, json_data)
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
