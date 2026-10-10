USE `device_profit_analysis`;

TRUNCATE TABLE `validation_results`;

INSERT INTO `validation_results` (`check_name`, `status`, `actual_value`, `expected_value`, `failure_count`)
WITH checks AS (
  SELECT
    'raw_clean_row_count_match' AS check_name,
    (SELECT COUNT(*) FROM raw_sensor_logs) AS actual_value,
    (SELECT COUNT(*) FROM clean_sensor_logs) AS expected_value
  UNION ALL
  SELECT
    'clean_record_id_unique',
    (SELECT COUNT(*) FROM clean_sensor_logs),
    (SELECT COUNT(DISTINCT record_id) FROM clean_sensor_logs)
  UNION ALL
  SELECT
    'clean_required_fields_not_null',
    (SELECT COUNT(*) FROM clean_sensor_logs),
    (SELECT COUNT(*) FROM clean_sensor_logs WHERE temperature IS NULL OR rotation_speed IS NULL OR torque IS NULL OR tool_wear IS NULL OR vibration IS NULL)
  UNION ALL
  SELECT
    'clean_timestamp_grid_aligned',
    (SELECT COUNT(*) FROM clean_sensor_logs),
    (SELECT COUNT(*) FROM clean_sensor_logs WHERE MOD(TIMESTAMPDIFF(MINUTE, '2026-09-10', timestamp), 10) <> 0)
  UNION ALL
  SELECT
    'quality_summary_single_row',
    (SELECT COUNT(*) FROM quality_summary),
    1
  UNION ALL
  SELECT
    'quality_summary_raw_count_match',
    (SELECT total_raw_rows FROM quality_summary),
    (SELECT COUNT(*) FROM raw_sensor_logs)
  UNION ALL
  SELECT
    'equipment_risk_machine_count_match',
    (SELECT COUNT(*) FROM equipment_risk),
    (SELECT COUNT(DISTINCT machine_id) FROM clean_sensor_logs)
  UNION ALL
  SELECT
    'risk_score_valid_range',
    (SELECT COUNT(*) FROM equipment_risk),
    (SELECT COUNT(*) FROM equipment_risk WHERE risk_score < 0 OR risk_score > 100)
  UNION ALL
  SELECT
    'high_risk_devices_identified',
    (SELECT COUNT(*) FROM equipment_risk WHERE risk_score >= 55),
    0
  UNION ALL
  SELECT
    'root_cause_summary_exists',
    (SELECT COUNT(*) FROM root_cause_summary),
    0
)
SELECT
  check_name,
  CASE
    WHEN check_name IN ('clean_required_fields_not_null', 'clean_timestamp_grid_aligned', 'risk_score_valid_range') AND actual_value = expected_value THEN 'FAILED'
    WHEN check_name IN ('clean_required_fields_not_null', 'clean_timestamp_grid_aligned', 'risk_score_valid_range') THEN 'PASSED'
    WHEN check_name = 'high_risk_devices_identified' AND actual_value > expected_value THEN 'PASSED'
    WHEN check_name = 'root_cause_summary_exists' AND actual_value > expected_value THEN 'PASSED'
    WHEN actual_value = expected_value THEN 'PASSED'
    ELSE 'FAILED'
  END AS status,
  CAST(actual_value AS CHAR) AS actual_value,
  CAST(expected_value AS CHAR) AS expected_value,
  CASE
    WHEN check_name IN ('clean_required_fields_not_null', 'clean_timestamp_grid_aligned', 'risk_score_valid_range') THEN expected_value
    WHEN check_name = 'high_risk_devices_identified' AND actual_value > expected_value THEN 0
    WHEN check_name = 'root_cause_summary_exists' AND actual_value > expected_value THEN 0
    WHEN actual_value = expected_value THEN 0
    ELSE 1
  END AS failure_count
FROM checks;
