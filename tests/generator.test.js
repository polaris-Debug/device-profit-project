const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { generateSensorData } = require("../analysis/generate_sensor_data");

test("generator creates the expected CSV contract", () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "device-profit-"));
  const outputPath = path.join(temporaryDirectory, "raw.csv");
  generateSensorData(outputPath);

  const content = fs.readFileSync(outputPath, "utf8").replace(/^\uFEFF/, "");
  const lines = content.trim().split(/\r?\n/);
  assert.equal(lines.length, 86401);
  assert.equal(lines[0], "record_id,machine_id,workshop,timestamp,operator_shift,raw_batch,temperature,rotation_speed,torque,tool_wear,vibration,ambient_temperature,defect_rate,failure_label,source_system");
  assert.equal(lines[1].split(",").length, 15);
});
