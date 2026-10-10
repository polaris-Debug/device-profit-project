CREATE DATABASE IF NOT EXISTS `device_profit_analysis`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `device_profit_analysis`;

CREATE TABLE IF NOT EXISTS `raw_sensor_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `record_id` VARCHAR(32) NOT NULL,
  `machine_id` VARCHAR(16) NOT NULL,
  `workshop` VARCHAR(32) NOT NULL,
  `timestamp` DATETIME NOT NULL,
  `operator_shift` CHAR(1) NOT NULL,
  `raw_batch` VARCHAR(32) NOT NULL,
  `temperature` DECIMAL(6,2) NULL,
  `rotation_speed` INT NOT NULL,
  `torque` DECIMAL(6,2) NOT NULL,
  `tool_wear` DECIMAL(6,2) NULL,
  `vibration` DECIMAL(5,2) NOT NULL,
  `ambient_temperature` DECIMAL(5,2) NOT NULL,
  `defect_rate` DECIMAL(5,2) NOT NULL,
  `failure_label` TINYINT NOT NULL,
  `source_system` VARCHAR(16) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_raw_record_id` (`record_id`),
  KEY `idx_raw_machine_time` (`machine_id`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `clean_sensor_logs` (
  `id` BIGINT UNSIGNED NOT NULL,
  `record_id` VARCHAR(32) NOT NULL,
  `machine_id` VARCHAR(16) NOT NULL,
  `workshop` VARCHAR(32) NOT NULL,
  `timestamp` DATETIME NOT NULL,
  `operator_shift` CHAR(1) NOT NULL,
  `raw_batch` VARCHAR(32) NOT NULL,
  `temperature` DECIMAL(6,2) NOT NULL,
  `rotation_speed` INT NOT NULL,
  `torque` DECIMAL(6,2) NOT NULL,
  `tool_wear` DECIMAL(6,2) NOT NULL,
  `vibration` DECIMAL(5,2) NOT NULL,
  `ambient_temperature` DECIMAL(5,2) NOT NULL,
  `defect_rate` DECIMAL(5,2) NOT NULL,
  `failure_label` TINYINT NOT NULL,
  `source_system` VARCHAR(16) NOT NULL,
  `temperature_imputed` TINYINT NOT NULL,
  `torque_repaired` TINYINT NOT NULL,
  `rotation_repaired` TINYINT NOT NULL,
  `vibration_repaired` TINYINT NOT NULL,
  `tool_wear_imputed` TINYINT NOT NULL,
  `timestamp_repaired` TINYINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_clean_record_id` (`record_id`),
  KEY `idx_clean_machine_time` (`machine_id`, `timestamp`),
  KEY `idx_clean_tool_wear` (`tool_wear`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `machine_reference_stats` (
  `machine_id` VARCHAR(16) NOT NULL,
  `median_temperature` DECIMAL(6,2) NOT NULL,
  `median_rotation_speed` INT NOT NULL,
  `median_torque` DECIMAL(6,2) NOT NULL,
  `median_tool_wear` DECIMAL(6,2) NOT NULL,
  `median_vibration` DECIMAL(5,2) NOT NULL,
  PRIMARY KEY (`machine_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `quality_summary` (
  `total_raw_rows` BIGINT NOT NULL,
  `total_machines` INT NOT NULL,
  `coverage_days` INT NOT NULL,
  `sampling_interval_minutes` INT NOT NULL,
  `missing_temperature` BIGINT NOT NULL,
  `zero_torque` BIGINT NOT NULL,
  `extreme_vibration` BIGINT NOT NULL,
  `extreme_rotation` BIGINT NOT NULL,
  `missing_tool_wear` BIGINT NOT NULL,
  `timestamp_skew` BIGINT NOT NULL,
  `repaired_rows` BIGINT NOT NULL,
  `repaired_rows_rate` DECIMAL(5,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `metric_thresholds` (
  `metric_name` VARCHAR(32) NOT NULL,
  `lower_bound` DECIMAL(8,2) NULL,
  `upper_bound` DECIMAL(8,2) NOT NULL,
  `unit` VARCHAR(16) NOT NULL,
  PRIMARY KEY (`metric_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `equipment_risk` (
  `machine_id` VARCHAR(16) NOT NULL,
  `workshop` VARCHAR(32) NOT NULL,
  `avg_temperature` DECIMAL(6,2) NOT NULL,
  `max_temperature` DECIMAL(6,2) NOT NULL,
  `avg_torque` DECIMAL(6,2) NOT NULL,
  `max_torque` DECIMAL(6,2) NOT NULL,
  `avg_tool_wear` DECIMAL(6,2) NOT NULL,
  `max_tool_wear` DECIMAL(6,2) NOT NULL,
  `avg_vibration` DECIMAL(5,2) NOT NULL,
  `avg_defect_rate` DECIMAL(5,2) NOT NULL,
  `temperature_trend` DECIMAL(6,2) NOT NULL,
  `anomaly_rate` DECIMAL(5,2) NOT NULL,
  `risk_score` INT NOT NULL,
  PRIMARY KEY (`machine_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `root_cause_analysis` (
  `dimension` VARCHAR(32) NOT NULL,
  `group_name` VARCHAR(64) NOT NULL,
  `avg_temperature` DECIMAL(6,2) NOT NULL,
  `avg_tool_wear` DECIMAL(6,2) NOT NULL,
  `avg_defect_rate` DECIMAL(5,2) NOT NULL,
  PRIMARY KEY (`dimension`, `group_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `root_cause_summary` (
  `target_machine` VARCHAR(16) NOT NULL,
  `normal_wear_avg_temperature` DECIMAL(6,2) NOT NULL,
  `high_wear_avg_temperature` DECIMAL(6,2) NOT NULL,
  `normal_wear_avg_defect_rate` DECIMAL(5,2) NOT NULL,
  `high_wear_avg_defect_rate` DECIMAL(5,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `strategy_summary` (
  `capacity_loss_per_hour` DECIMAL(12,2) NOT NULL,
  `scrap_loss_per_unit` DECIMAL(10,2) NOT NULL,
  `preventive_maintenance_cost` DECIMAL(10,2) NOT NULL,
  `estimated_annual_high_risk_machines` INT NOT NULL,
  `estimated_downtime_hours_per_high_risk_machine` INT NOT NULL,
  `scrap_units_per_high_risk_machine` INT NOT NULL,
  `target_downtime_reduction` DECIMAL(5,2) NOT NULL,
  `target_scrap_reduction` DECIMAL(5,2) NOT NULL,
  `annual_maintenance_investment` DECIMAL(12,2) NOT NULL,
  `annual_downtime_saving` DECIMAL(12,2) NOT NULL,
  `annual_scrap_saving` DECIMAL(12,2) NOT NULL,
  `annual_net_benefit` DECIMAL(12,2) NOT NULL,
  `net_benefit_rate` DECIMAL(6,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `data_source_inventory` (
  `source_id` VARCHAR(64) NOT NULL,
  `source_name` VARCHAR(128) NOT NULL,
  `source_type` VARCHAR(64) NOT NULL,
  `source_location` VARCHAR(255) NOT NULL,
  `update_frequency` VARCHAR(64) NOT NULL,
  `owner` VARCHAR(64) NOT NULL,
  `description` TEXT NOT NULL,
  `is_external` TINYINT NOT NULL,
  PRIMARY KEY (`source_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `data_lineage` (
  `lineage_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `target_table` VARCHAR(64) NOT NULL,
  `source_table` VARCHAR(128) NOT NULL,
  `transformation` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`lineage_id`),
  KEY `idx_lineage_target` (`target_table`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pipeline_run_log` (
  `run_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `run_started_at` DATETIME NOT NULL,
  `run_finished_at` DATETIME NULL,
  `status` VARCHAR(16) NOT NULL,
  `raw_rows` BIGINT NULL,
  `clean_rows` BIGINT NULL,
  `high_risk_count` INT NULL,
  `error_message` TEXT NULL,
  PRIMARY KEY (`run_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `validation_results` (
  `check_name` VARCHAR(64) NOT NULL,
  `status` VARCHAR(8) NOT NULL,
  `actual_value` VARCHAR(128) NOT NULL,
  `expected_value` VARCHAR(128) NOT NULL,
  `failure_count` BIGINT NOT NULL,
  `checked_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`check_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `metric_thresholds` (`metric_name`, `lower_bound`, `upper_bound`, `unit`) VALUES
  ('temperature', 45, 85, '°C'),
  ('rotation_speed', 1200, 1800, 'RPM'),
  ('torque', 0, 75, 'N·m'),
  ('tool_wear', 0, 180, 'minute'),
  ('vibration', 0, 3.5, 'mm/s')
ON DUPLICATE KEY UPDATE
  `lower_bound` = VALUES(`lower_bound`),
  `upper_bound` = VALUES(`upper_bound`),
  `unit` = VALUES(`unit`);

INSERT INTO `data_source_inventory` (
  `source_id`, `source_name`, `source_type`, `source_location`,
  `update_frequency`, `owner`, `description`, `is_external`
) VALUES
  ('sensor_log_simulator', '设备传感器日志模拟器', 'Node.js确定性生成器', 'analysis/generate_sensor_data.js', '按需生成', '数据分析项目', '生成86,400条包含缺失值、0值、极值和时间戳错位的模拟传感器日志，用于演示完整分析链路。', 0),
  ('business_threshold_config', '设备健康阈值配置', 'SQL配置表', 'analysis/sql/01_schema.sql', '随业务标准变更', '生产线主管', '定义温度、转速、扭矩、刀具磨损和振动的健康上下限。', 0),
  ('financial_assumption_config', '财务预估假设', 'SQL配置', 'analysis/sql/03_analysis.sql', '随经营口径变更', '厂长/财务', '定义产能损失、废品损失、维护投入和目标改善比例，用于计算年化净收益。', 0)
ON DUPLICATE KEY UPDATE
  `source_name` = VALUES(`source_name`),
  `source_type` = VALUES(`source_type`),
  `source_location` = VALUES(`source_location`),
  `update_frequency` = VALUES(`update_frequency`),
  `owner` = VALUES(`owner`),
  `description` = VALUES(`description`),
  `is_external` = VALUES(`is_external`);

TRUNCATE TABLE `data_lineage`;

INSERT INTO `data_lineage` (`target_table`, `source_table`, `transformation`, `description`) VALUES
  ('raw_sensor_logs', 'data/raw_sensor_logs.csv', 'Node.js批量导入', '由generate_sensor_data.js生成原始CSV，再由run_mysql_analysis.js批量写入MySQL原始表。'),
  ('machine_reference_stats', 'raw_sensor_logs', 'SQL窗口函数计算中位数', '按设备计算温度、转速、扭矩、刀具磨损和振动的有效中位数，作为清洗参考值。'),
  ('clean_sensor_logs', 'raw_sensor_logs + machine_reference_stats', 'SQL清洗与修复', '填补缺失值，修复0值和物理极限外极值，并将时间戳对齐到10分钟标准网格。'),
  ('quality_summary', 'clean_sensor_logs', 'SQL质量审计', '统计总记录数、修复记录数、各类异常数量和修复比例。'),
  ('equipment_risk', 'clean_sensor_logs', 'SQL滚动窗口聚合', '计算近72小时温度、扭矩、刀具磨损、振动、异常率和综合风险评分。'),
  ('root_cause_analysis', 'clean_sensor_logs', 'SQL分组对比', '按原料批次和班组对比温度、刀具磨损与废品率。'),
  ('root_cause_summary', 'clean_sensor_logs', 'SQL条件聚合', '对比刀具磨损未超标与超标时的平均温度和废品率。'),
  ('strategy_summary', '业务财务假设', 'SQL财务计算', '基于停机下降和废品率下降目标，计算年化节约、投入和净收益。');
