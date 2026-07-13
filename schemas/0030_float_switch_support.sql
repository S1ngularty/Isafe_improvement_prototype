ALTER TABLE water_level_readings
  ADD COLUMN float_switch_1m BOOLEAN DEFAULT FALSE,
  ADD COLUMN float_switch_2m BOOLEAN DEFAULT FALSE;

ALTER TABLE flood_alert_log
  DROP CONSTRAINT flood_alert_log_alert_type_check,
  ADD CONSTRAINT flood_alert_log_alert_type_check
    CHECK (alert_type IN ('ALERT', 'ALL_CLEAR', 'BLINDSPOT', 'FLOAT_SWITCH_2M', 'FLOAT_SWITCH_2M_ALL_CLEAR'));
