CREATE TABLE flood_alert_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sensor_id TEXT NOT NULL,
  water_level_cm REAL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('ALERT', 'ALL_CLEAR', 'BLINDSPOT')),
  recipients INT NOT NULL DEFAULT 0,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE flood_alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flood_alert_log_select"
  ON flood_alert_log FOR SELECT
  USING (true);

CREATE POLICY "flood_alert_log_insert"
  ON flood_alert_log FOR INSERT
  WITH CHECK (true);
