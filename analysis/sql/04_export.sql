USE `device_profit_analysis`;

SELECT * FROM quality_summary;
SELECT * FROM equipment_risk ORDER BY risk_score DESC, machine_id;
SELECT * FROM root_cause_analysis ORDER BY dimension, group_name;
SELECT * FROM root_cause_summary;
SELECT * FROM strategy_summary;
