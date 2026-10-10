USE `device_profit_analysis`;

TRUNCATE TABLE `machine_reference_stats`;
TRUNCATE TABLE `clean_sensor_logs`;
TRUNCATE TABLE `quality_summary`;

INSERT INTO `machine_reference_stats` (
  `machine_id`, `median_temperature`, `median_rotation_speed`,
  `median_torque`, `median_tool_wear`, `median_vibration`
)
WITH ranked_temperature AS (
  SELECT `machine_id`, `temperature`,
         ROW_NUMBER() OVER (PARTITION BY `machine_id` ORDER BY `temperature`) AS rn,
         COUNT(*) OVER (PARTITION BY `machine_id`) AS record_count
  FROM `raw_sensor_logs`
  WHERE `temperature` BETWEEN 1 AND 119
), median_temperature AS (
  SELECT `machine_id`, AVG(`temperature`) AS median_temperature
  FROM ranked_temperature
  WHERE rn IN (FLOOR((record_count + 1) / 2), FLOOR((record_count + 2) / 2))
  GROUP BY `machine_id`
), ranked_rotation AS (
  SELECT `machine_id`, `rotation_speed`,
         ROW_NUMBER() OVER (PARTITION BY `machine_id` ORDER BY `rotation_speed`) AS rn,
         COUNT(*) OVER (PARTITION BY `machine_id`) AS record_count
  FROM `raw_sensor_logs`
  WHERE `rotation_speed` BETWEEN 1000 AND 2200
), median_rotation AS (
  SELECT `machine_id`, AVG(`rotation_speed`) AS median_rotation_speed
  FROM ranked_rotation
  WHERE rn IN (FLOOR((record_count + 1) / 2), FLOOR((record_count + 2) / 2))
  GROUP BY `machine_id`
), ranked_torque AS (
  SELECT `machine_id`, `torque`,
         ROW_NUMBER() OVER (PARTITION BY `machine_id` ORDER BY `torque`) AS rn,
         COUNT(*) OVER (PARTITION BY `machine_id`) AS record_count
  FROM `raw_sensor_logs`
  WHERE `torque` BETWEEN 0.01 AND 119
), median_torque AS (
  SELECT `machine_id`, AVG(`torque`) AS median_torque
  FROM ranked_torque
  WHERE rn IN (FLOOR((record_count + 1) / 2), FLOOR((record_count + 2) / 2))
  GROUP BY `machine_id`
), ranked_tool_wear AS (
  SELECT `machine_id`, `tool_wear`,
         ROW_NUMBER() OVER (PARTITION BY `machine_id` ORDER BY `tool_wear`) AS rn,
         COUNT(*) OVER (PARTITION BY `machine_id`) AS record_count
  FROM `raw_sensor_logs`
  WHERE `tool_wear` BETWEEN 0 AND 300
), median_tool_wear AS (
  SELECT `machine_id`, AVG(`tool_wear`) AS median_tool_wear
  FROM ranked_tool_wear
  WHERE rn IN (FLOOR((record_count + 1) / 2), FLOOR((record_count + 2) / 2))
  GROUP BY `machine_id`
), ranked_vibration AS (
  SELECT `machine_id`, `vibration`,
         ROW_NUMBER() OVER (PARTITION BY `machine_id` ORDER BY `vibration`) AS rn,
         COUNT(*) OVER (PARTITION BY `machine_id`) AS record_count
  FROM `raw_sensor_logs`
  WHERE `vibration` BETWEEN 0 AND 6
), median_vibration AS (
  SELECT `machine_id`, AVG(`vibration`) AS median_vibration
  FROM ranked_vibration
  WHERE rn IN (FLOOR((record_count + 1) / 2), FLOOR((record_count + 2) / 2))
  GROUP BY `machine_id`
)
SELECT
  median_temperature.machine_id,
  median_temperature.median_temperature,
  median_rotation.median_rotation_speed,
  median_torque.median_torque,
  median_tool_wear.median_tool_wear,
  median_vibration.median_vibration
FROM median_temperature
JOIN median_rotation USING (`machine_id`)
JOIN median_torque USING (`machine_id`)
JOIN median_tool_wear USING (`machine_id`)
JOIN median_vibration USING (`machine_id`);

INSERT INTO `clean_sensor_logs` (
  `id`, `record_id`, `machine_id`, `workshop`, `timestamp`, `operator_shift`, `raw_batch`,
  `temperature`, `rotation_speed`, `torque`, `tool_wear`, `vibration`, `ambient_temperature`,
  `defect_rate`, `failure_label`, `source_system`, `temperature_imputed`, `torque_repaired`,
  `rotation_repaired`, `vibration_repaired`, `tool_wear_imputed`, `timestamp_repaired`
)
SELECT
  raw.id,
  raw.record_id,
  raw.machine_id,
  raw.workshop,
  TIMESTAMPADD(MINUTE, CAST(RIGHT(raw.record_id, 5) AS UNSIGNED) * 10, '2026-09-10'),
  raw.operator_shift,
  raw.raw_batch,
  COALESCE(raw.temperature, stats.median_temperature),
  CASE WHEN raw.rotation_speed = 9999 THEN stats.median_rotation_speed ELSE raw.rotation_speed END,
  CASE WHEN raw.torque = 0 THEN stats.median_torque ELSE raw.torque END,
  COALESCE(raw.tool_wear, stats.median_tool_wear),
  CASE WHEN raw.vibration = 99.99 THEN stats.median_vibration ELSE raw.vibration END,
  raw.ambient_temperature,
  raw.defect_rate,
  raw.failure_label,
  raw.source_system,
  IF(raw.temperature IS NULL, 1, 0),
  IF(raw.torque = 0, 1, 0),
  IF(raw.rotation_speed = 9999, 1, 0),
  IF(raw.vibration = 99.99, 1, 0),
  IF(raw.tool_wear IS NULL, 1, 0),
  IF(raw.timestamp <> TIMESTAMPADD(MINUTE, CAST(RIGHT(raw.record_id, 5) AS UNSIGNED) * 10, '2026-09-10'), 1, 0)
FROM raw_sensor_logs AS raw
JOIN machine_reference_stats AS stats ON stats.machine_id = raw.machine_id;

INSERT INTO `quality_summary` (
  `total_raw_rows`, `total_machines`, `coverage_days`, `sampling_interval_minutes`,
  `missing_temperature`, `zero_torque`, `extreme_vibration`, `extreme_rotation`,
  `missing_tool_wear`, `timestamp_skew`, `repaired_rows`, `repaired_rows_rate`
)
SELECT
  COUNT(*) AS total_raw_rows,
  COUNT(DISTINCT machine_id) AS total_machines,
  30,
  10,
  SUM(temperature_imputed),
  SUM(torque_repaired),
  SUM(vibration_repaired),
  SUM(rotation_repaired),
  SUM(tool_wear_imputed),
  SUM(timestamp_repaired),
  SUM(temperature_imputed + torque_repaired + rotation_repaired + vibration_repaired + tool_wear_imputed + timestamp_repaired > 0),
  ROUND(SUM(temperature_imputed + torque_repaired + rotation_repaired + vibration_repaired + tool_wear_imputed + timestamp_repaired > 0) / COUNT(*) * 100, 2)
FROM clean_sensor_logs;
