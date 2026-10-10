const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sqlDirectory = path.join(__dirname, "../analysis/sql");

test("schema is idempotent and non-destructive", () => {
  const schema = fs.readFileSync(path.join(sqlDirectory, "01_schema.sql"), "utf8");
  assert.equal(schema.includes("DROP TABLE"), false);
  assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS `raw_sensor_logs`"));
  assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS `pipeline_run_log`"));
});

test("pipeline contains cleaning, analysis, and validation stages", () => {
  const cleaning = fs.readFileSync(path.join(sqlDirectory, "02_clean.sql"), "utf8");
  const analysis = fs.readFileSync(path.join(sqlDirectory, "03_analysis.sql"), "utf8");
  const validation = fs.readFileSync(path.join(sqlDirectory, "05_validate.sql"), "utf8");

  assert.ok(cleaning.includes("INSERT INTO `clean_sensor_logs`"));
  assert.ok(analysis.includes("INSERT INTO `equipment_risk`"));
  assert.ok(validation.includes("INSERT INTO `validation_results`"));
});
