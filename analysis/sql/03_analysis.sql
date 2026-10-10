USE `device_profit_analysis`;

TRUNCATE TABLE `equipment_risk`;
TRUNCATE TABLE `root_cause_analysis`;
TRUNCATE TABLE `root_cause_summary`;
TRUNCATE TABLE `strategy_summary`;

INSERT INTO `equipment_risk` (
  `machine_id`, `workshop`, `avg_temperature`, `max_temperature`, `avg_torque`, `max_torque`,
  `avg_tool_wear`, `max_tool_wear`, `avg_vibration`, `avg_defect_rate`, `temperature_trend`,
  `anomaly_rate`, `risk_score`
)
WITH machine_bounds AS (
  SELECT machine_id, MAX(timestamp) AS max_timestamp
  FROM clean_sensor_logs
  GROUP BY machine_id
), recent_rows AS (
  SELECT clean.*
  FROM clean_sensor_logs AS clean
  JOIN machine_bounds AS bounds ON bounds.machine_id = clean.machine_id
  WHERE clean.timestamp > DATE_SUB(bounds.max_timestamp, INTERVAL 72 HOUR)
), aggregated AS (
  SELECT
    machine_id,
    workshop,
    AVG(temperature) AS avg_temperature,
    MAX(temperature) AS max_temperature,
    AVG(torque) AS avg_torque,
    MAX(torque) AS max_torque,
    AVG(tool_wear) AS avg_tool_wear,
    MAX(tool_wear) AS max_tool_wear,
    AVG(vibration) AS avg_vibration,
    AVG(defect_rate) AS avg_defect_rate,
    AVG(temperature) - MIN(timestamp_temperature) AS temperature_trend,
    AVG(
      CASE
        WHEN temperature > 85 OR torque > 75 OR tool_wear > 180 OR vibration > 3.5 THEN 1
        ELSE 0
      END
    ) AS anomaly_rate
  FROM (
    SELECT recent_rows.*,
           FIRST_VALUE(temperature) OVER (PARTITION BY machine_id ORDER BY timestamp) AS timestamp_temperature
    FROM recent_rows
  ) AS ordered_rows
  GROUP BY machine_id, workshop
)
SELECT
  machine_id,
  workshop,
  ROUND(avg_temperature, 2),
  ROUND(max_temperature, 2),
  ROUND(avg_torque, 2),
  ROUND(max_torque, 2),
  ROUND(avg_tool_wear, 2),
  ROUND(max_tool_wear, 2),
  ROUND(avg_vibration, 2),
  ROUND(avg_defect_rate, 2),
  ROUND(temperature_trend, 2),
  ROUND(anomaly_rate * 100, 2),
  LEAST(100, ROUND(
    GREATEST(0, (avg_temperature - 85) / 85 * 100) * 1.6 +
    GREATEST(0, (avg_torque - 75) / 75 * 100) * 1.4 +
    GREATEST(0, (avg_tool_wear - 180) / 180 * 100) * 1.7 +
    GREATEST(0, (avg_vibration - 3.5) / 3.5 * 100) * 1.1 +
    anomaly_rate * 40 +
    GREATEST(0, temperature_trend) * 1.8,
    0
  ))
FROM aggregated;

INSERT INTO `root_cause_analysis` (
  `dimension`, `group_name`, `avg_temperature`, `avg_tool_wear`, `avg_defect_rate`
)
SELECT
  '原料批次',
  CASE WHEN raw_batch = 'B-260777' THEN 'B-260777' ELSE '其他批次' END AS group_name,
  ROUND(AVG(temperature), 2),
  ROUND(AVG(tool_wear), 2),
  ROUND(AVG(defect_rate), 2)
FROM clean_sensor_logs
WHERE machine_id = 'C3-M05'
GROUP BY CASE WHEN raw_batch = 'B-260777' THEN 'B-260777' ELSE '其他批次' END
UNION ALL
SELECT
  '班组',
  CONCAT(operator_shift, '班'),
  ROUND(AVG(temperature), 2),
  ROUND(AVG(tool_wear), 2),
  ROUND(AVG(defect_rate), 2)
FROM clean_sensor_logs
WHERE machine_id = 'C3-M05'
GROUP BY operator_shift;

INSERT INTO `root_cause_summary` (
  `target_machine`, `normal_wear_avg_temperature`, `high_wear_avg_temperature`,
  `normal_wear_avg_defect_rate`, `high_wear_avg_defect_rate`
)
SELECT
  'C3-M05',
  ROUND(AVG(CASE WHEN tool_wear <= 180 THEN temperature END), 2),
  ROUND(AVG(CASE WHEN tool_wear > 180 THEN temperature END), 2),
  ROUND(AVG(CASE WHEN tool_wear <= 180 THEN defect_rate END), 2),
  ROUND(AVG(CASE WHEN tool_wear > 180 THEN defect_rate END), 2)
FROM clean_sensor_logs
WHERE machine_id = 'C3-M05';

INSERT INTO `strategy_summary` (
  `capacity_loss_per_hour`, `scrap_loss_per_unit`, `preventive_maintenance_cost`,
  `estimated_annual_high_risk_machines`, `estimated_downtime_hours_per_high_risk_machine`,
  `scrap_units_per_high_risk_machine`, `target_downtime_reduction`, `target_scrap_reduction`,
  `annual_maintenance_investment`, `annual_downtime_saving`, `annual_scrap_saving`,
  `annual_net_benefit`, `net_benefit_rate`
)
SELECT
  42000,
  128,
  6500,
  9,
  18,
  650,
  0.15,
  0.25,
  216000,
  9 * 18 * 0.15 * 42000,
  9 * 650 * 0.25 * 128,
  9 * 18 * 0.15 * 42000 + 9 * 650 * 0.25 * 128 - 216000,
  ROUND((9 * 18 * 0.15 * 42000 + 9 * 650 * 0.25 * 128 - 216000) /
        (9 * 18 * 0.15 * 42000 + 9 * 650 * 0.25 * 128) * 100, 2);
