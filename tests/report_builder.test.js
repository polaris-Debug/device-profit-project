const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { buildReport } = require("../analysis/report_builder");

test("report builder renders quality, lineage, and business results", () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "device-profit-report-"));
  buildReport({
    qualitySummary: {
      total_raw_rows: 86400,
      total_machines: 20,
      missing_temperature: 1006,
      zero_torque: 649,
      extreme_vibration: 601,
      extreme_rotation: 480,
      missing_tool_wear: 281,
      timestamp_skew: 245,
      repaired_rows: 3179,
      repaired_rows_rate: 3.68
    },
    riskRows: [
      { machine_id: "C3-M05", risk_score: 100 },
      { machine_id: "C2-M04", risk_score: 68 },
      { machine_id: "C1-M06", risk_score: 60 }
    ],
    rootCauseRows: [],
    rootCauseSummary: {
      target_machine: "C3-M05",
      normal_wear_avg_temperature: 64.69,
      high_wear_avg_temperature: 81.22,
      normal_wear_avg_defect_rate: 0.52,
      high_wear_avg_defect_rate: 5.02
    },
    strategySummary: {
      immediate_actions: ["Inspect C3-M05"],
      monitoring_actions: ["Monitor tool wear"],
      annual_downtime_saving: 1020600,
      annual_scrap_saving: 187200,
      annual_maintenance_investment: 216000,
      annual_net_benefit: 991800
    },
    dataSources: [],
    dataLineage: [
      { target_table: "equipment_risk", source_table: "clean_sensor_logs", transformation: "SQL rolling window" }
    ],
    pipelineRuns: [
      { run_id: 1, run_started_at: "2026-10-10 10:00:00", run_finished_at: "2026-10-10 10:00:11", status: "SUCCESS", raw_rows: 86400, high_risk_count: 3 }
    ],
    validationResults: [
      { check_name: "raw_clean_row_count_match", status: "PASSED", actual_value: "86400", expected_value: "86400", failure_count: 0 }
    ],
    targetDailyTrend: [
      { date_label: "09-10", avg_temperature: 63 },
      { date_label: "10-09", avg_temperature: 89 }
    ],
    outputDir
  });

  const report = fs.readFileSync(path.join(outputDir, "report.html"), "utf8");
  assert.match(report, /数据质量门禁/);
  assert.match(report, /数据来源与血缘/);
  assert.match(report, /C3-M05/);
  assert.match(report, /¥991,800/);
});
