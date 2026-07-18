DELETE FROM flood_alert_log;

ALTER TABLE flood_alert_log
  DROP CONSTRAINT IF EXISTS flood_alert_log_alert_type_check,
  ADD CONSTRAINT flood_alert_log_alert_type_check
    CHECK (alert_type IN (
      'CRITICAL_ALERT', 'ALL_CLEAR',
      'FLOAT_SWITCH_2M', 'FLOAT_SWITCH_2M_ALL_CLEAR',
      'FLOAT_SWITCH_1M', 'FLOAT_SWITCH_1M_ALL_CLEAR'
    ));
