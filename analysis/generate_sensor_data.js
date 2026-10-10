const fs = require("fs");
const path = require("path");

const dataDir = path.resolve(__dirname, "../data");
const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(dataDir, "raw_sensor_logs.csv");

function generateSensorData(outputPath) {
let seed = 20261010;

function random() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

function randomInt(min, max) {
  return Math.floor(min + random() * (max - min + 1));
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isoLocal(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 19);
}

fs.mkdirSync(dataDir, { recursive: true });

const machines = [];
for (let workshop = 1; workshop <= 3; workshop += 1) {
  for (let machine = 1; machine <= 7; machine += 1) {
    machines.push({
      machineId: `C${workshop}-M${String(machine).padStart(2, "0")}`,
      workshop
    });
  }
}
machines.pop();

const startTime = new Date("2026-09-10T00:00:00");
const minutesPerInterval = 10;
const intervalsPerDay = (24 * 60) / minutesPerInterval;
const days = 30;
const intervals = days * intervalsPerDay;
const columns = [
  "record_id", "machine_id", "workshop", "timestamp", "operator_shift", "raw_batch",
  "temperature", "rotation_speed", "torque", "tool_wear", "vibration",
  "ambient_temperature", "defect_rate", "failure_label", "source_system"
];
const rows = [columns.join(",")];

for (const machine of machines) {
  const isTarget = machine.machineId === "C3-M05";
  const isSecondRisk = machine.machineId === "C2-M04";
  const isThirdRisk = machine.machineId === "C1-M06";
  let toolWear = randomInt(20, 45);
  const toolChangeCycle = randomInt(120, 160);

  for (let intervalIndex = 0; intervalIndex < intervals; intervalIndex += 1) {
    const timestamp = new Date(startTime.getTime() + intervalIndex * minutesPerInterval * 60000);
    const day = Math.floor(intervalIndex / intervalsPerDay);
    const hour = timestamp.getHours();
    const operatorShift = hour < 8 ? "A" : hour < 16 ? "B" : "C";

    if (intervalIndex > 0 && intervalIndex % toolChangeCycle === 0) {
      toolWear = randomInt(20, 40);
    }
    toolWear += 0.65;

    const ambientTemperature = 24 + 4 * Math.sin(((hour - 6) / 24) * 2 * Math.PI) + random() * 1.5;
    let temperature = 63 + Math.sin((hour / 24) * 2 * Math.PI) * 3 + random() * 2;
    let rotationSpeed = 1520 + Math.sin((hour / 24) * 2 * Math.PI) * 80 + random() * 45;
    let torque = 48 + random() * 9;
    let vibration = 1.6 + random() * 0.6;
    let rawBatch = `B-260${randomInt(100, 999)}`;

    if (isTarget && day >= 21) {
      const pressure = Math.min((day - 21) / 8, 1);
      temperature += pressure * 27 + random() * 3;
      torque += pressure * 27 + random() * 6;
      vibration += pressure * 2.3 + random() * 0.4;
      rotationSpeed += pressure * 100;
      toolWear = Math.min(toolWear + 28 * ((day - 21) / 8), 250);
      rawBatch = "B-260777";
    } else if (isSecondRisk && day >= 24) {
      const pressure = Math.min((day - 24) / 6, 1);
      temperature += pressure * 16;
      torque += pressure * 16;
      vibration += pressure * 1;
      toolWear = Math.min(toolWear + 40 * pressure, 210);
    } else if (isThirdRisk && day >= 26) {
      const pressure = Math.min((day - 26) / 4, 1);
      temperature += pressure * 10;
      vibration += pressure * 0.55;
      toolWear = Math.min(toolWear + 45 * pressure, 205);
    }

    temperature += (ambientTemperature - 24) * 0.25;
    const defectRate = Math.max(
      0.5,
      (temperature > 85 ? (temperature - 85) * 0.55 : 0) +
        (torque > 75 ? (torque - 75) * 0.42 : 0) +
        (toolWear > 180 ? (toolWear - 180) * 0.045 : 0) +
        random() * 0.3
    );
    const failed = temperature > 88 && torque > 78 && toolWear > 185;

    const row = [
      `${machine.machineId}-${String(intervalIndex).padStart(5, "0")}`,
      machine.machineId,
      `${machine.workshop}号车间`,
      isoLocal(timestamp),
      operatorShift,
      rawBatch,
      round(temperature, 2),
      Math.round(rotationSpeed),
      round(torque, 2),
      round(toolWear, 2),
      round(vibration, 2),
      round(ambientTemperature, 2),
      round(Math.min(defectRate, 14), 2),
      failed ? 1 : 0,
      machine.workshop === 3 ? "MES-V2" : "MES-V1"
    ];

    if (random() < 0.011) row[6] = "";
    if (random() < 0.008) row[8] = 0;
    if (random() < 0.006) row[10] = 99.99;
    if (random() < 0.005) row[7] = 9999;
    if (random() < 0.004) row[9] = "";
    if (random() < 0.003) {
      row[3] = isoLocal(new Date(timestamp.getTime() - randomInt(30, 240) * 60000));
    }
    rows.push(row.join(","));
  }
}

fs.writeFileSync(outputPath, `\uFEFF${rows.join("\n")}\n`, "utf8");
console.log(`原始传感器数据已生成：${outputPath}`);
console.log(`记录数：${rows.length - 1}`);
}

if (require.main === module) {
  generateSensorData(outputPath);
}

module.exports = { generateSensorData };
