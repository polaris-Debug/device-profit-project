# Data dictionary

## `raw_sensor_logs`

| Column | Type | Description |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | Auto-increment primary key. |
| `record_id` | `VARCHAR(32)` | Unique source record identifier. |
| `machine_id` | `VARCHAR(16)` | Machine identifier, for example `C3-M05`. |
| `workshop` | `VARCHAR(32)` | Workshop label. |
| `timestamp` | `DATETIME` | Source event timestamp; may be skewed. |
| `operator_shift` | `CHAR(1)` | A, B, or C shift. |
| `raw_batch` | `VARCHAR(32)` | Material batch identifier. |
| `temperature` | `DECIMAL(6,2)` | Machine temperature in °C; nullable in raw data. |
| `rotation_speed` | `INT` | Rotation speed in RPM. |
| `torque` | `DECIMAL(6,2)` | Torque in N·m. |
| `tool_wear` | `DECIMAL(6,2)` | Tool wear in minutes; nullable in raw data. |
| `vibration` | `DECIMAL(5,2)` | Vibration in mm/s. |
| `ambient_temperature` | `DECIMAL(5,2)` | Workshop ambient temperature in °C. |
| `defect_rate` | `DECIMAL(5,2)` | Observed defect rate in percent. |
| `failure_label` | `TINYINT` | 1 when the simulated failure condition is met. |
| `source_system` | `VARCHAR(16)` | Source system version. |

## Cleaning flags in `clean_sensor_logs`

| Column | Meaning |
|---|---|
| `temperature_imputed` | Temperature was null and replaced by the machine median. |
| `torque_repaired` | Torque was zero and replaced by the machine median. |
| `rotation_repaired` | Rotation was an impossible extreme and repaired. |
| `vibration_repaired` | Vibration was an impossible extreme and repaired. |
| `tool_wear_imputed` | Tool wear was null and replaced by the machine median. |
| `timestamp_repaired` | Timestamp was aligned to the ten-minute grid. |

## Business thresholds

| Metric | Healthy range |
|---|---|
| Temperature | 45–85 °C |
| Rotation speed | 1200–1800 RPM |
| Torque | 0–75 N·m |
| Tool wear | 0–180 minutes |
| Vibration | 0–3.5 mm/s |
