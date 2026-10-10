const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const mysql = require("mysql2/promise");
const { buildReport } = require("./report_builder");

const projectRoot = path.resolve(__dirname, "..");
const dataDir = path.join(projectRoot, "data");
const outputDir = path.join(projectRoot, "outputs");
const rawCsvPath = path.join(dataDir, "raw_sensor_logs.csv");
const sqlDir = path.join(__dirname, "sql");

const rawColumns = [
  "record_id", "machine_id", "workshop", "timestamp", "operator_shift", "raw_batch",
  "temperature", "rotation_speed", "torque", "tool_wear", "vibration",
  "ambient_temperature", "defect_rate", "failure_label", "source_system"
];

function loadDotEnv() {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function ensureRawData() {
  if (!fs.existsSync(rawCsvPath)) {
    execFileSync(process.execPath, [path.join(__dirname, "generate_sensor_data.js")], { stdio: "inherit" });
  }
}

function readRawRows() {
  const content = fs.readFileSync(rawCsvPath, "utf8").replace(/^\uFEFF/, "");
  const lines = content.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  if (header.join(",") !== rawColumns.join(",")) {
    throw new Error("raw_sensor_logs.csv 的列结构与导入程序不一致");
  }

  return lines.slice(1).map(line => {
    const values = line.split(",");
    if (values.length !== rawColumns.length) {
      throw new Error("raw_sensor_logs.csv 存在列数异常的记录");
    }
    return rawColumns.map((column, index) => {
      const value = values[index];
      if (value === "") return null;
      if (["temperature", "rotation_speed", "torque", "tool_wear", "vibration", "ambient_temperature", "defect_rate", "failure_label"].includes(column)) {
        return Number(value);
      }
      return value;
    });
  });
}

async function insertRawRows(connection, rows) {
  const rowPlaceholder = `(${rawColumns.map(() => "?").join(", ")})`;
  const batchSize = 1000;

  await connection.query("START TRANSACTION");
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const sql = `
      INSERT IGNORE INTO raw_sensor_logs (${rawColumns.map(column => `\`${column}\``).join(", ")})
      VALUES ${batch.map(() => rowPlaceholder).join(", ")}
    `;
    const [result] = await connection.query(sql, batch.flat());
    console.log(`已处理原始数据：${Math.min(index + batchSize, rows.length).toLocaleString("zh-CN")} / ${rows.length.toLocaleString("zh-CN")}，新增 ${result.affectedRows} 条`);
  }
  await connection.query("COMMIT");
}

async function runSqlFile(connection, filename) {
  const sql = fs.readFileSync(path.join(sqlDir, filename), "utf8");
  await connection.query(sql);
  console.log(`已执行：${filename}`);
}

async function queryOne(connection, sql) {
  const [rows] = await connection.query(sql);
  return rows[0];
}

async function queryAll(connection, sql) {
  const [rows] = await connection.query(sql);
  return rows;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  loadDotEnv();
  ensureRawData();

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
    decimalNumbers: true
  });

  let runId;
  let status = "SUCCESS";
  let errorMessage = null;
  let completedMetrics = null;

  try {
    await runSqlFile(connection, "01_schema.sql");
    const [runResult] = await connection.query(
      "INSERT INTO pipeline_run_log (run_started_at, status) VALUES (NOW(), 'RUNNING')"
    );
    runId = runResult.insertId;
    const rawRows = readRawRows();
    await insertRawRows(connection, rawRows);
    await runSqlFile(connection, "02_clean.sql");
    await runSqlFile(connection, "03_analysis.sql");
    await runSqlFile(connection, "05_validate.sql");

    const qualitySummary = await queryOne(connection, "SELECT * FROM quality_summary");
    const riskRows = await queryAll(connection, "SELECT * FROM equipment_risk ORDER BY risk_score DESC, machine_id");
    const rootCauseRows = await queryAll(connection, "SELECT * FROM root_cause_analysis ORDER BY dimension, group_name");
    const rootCauseSummary = await queryOne(connection, "SELECT * FROM root_cause_summary");
    const strategySummary = await queryOne(connection, "SELECT * FROM strategy_summary");
    const dataLineage = await queryAll(connection, "SELECT target_table, source_table, transformation, description FROM data_lineage ORDER BY lineage_id");
    const dataSources = await queryAll(connection, "SELECT source_id, source_name, source_type, source_location, update_frequency, owner, description, is_external FROM data_source_inventory ORDER BY source_id");
    const pipelineRuns = await queryAll(connection, "SELECT run_id, run_started_at, run_finished_at, status, raw_rows, clean_rows, high_risk_count FROM pipeline_run_log ORDER BY run_id DESC LIMIT 10");
    const validationResults = await queryAll(connection, "SELECT check_name, status, actual_value, expected_value, failure_count, checked_at FROM validation_results ORDER BY check_name");
    const failedValidations = validationResults.filter(row => row.status !== "PASSED");
    if (failedValidations.length > 0) {
      throw new Error(`数据质量门禁未通过：${failedValidations.map(row => `${row.check_name}(${row.actual_value}/${row.expected_value})`).join("、")}`);
    }
    const targetDailyTrend = await queryAll(connection, `
      SELECT
        DATE_FORMAT(timestamp, '%m-%d') AS date_label,
        ROUND(AVG(temperature), 2) AS avg_temperature
      FROM clean_sensor_logs
      WHERE machine_id = 'C3-M05'
      GROUP BY DATE(timestamp), DATE_FORMAT(timestamp, '%m-%d')
      ORDER BY DATE(timestamp)
    `);

    qualitySummary.rules = [
      "缺失温度与刀具磨损按同设备中位数填补",
      "0扭矩与超过物理极限的转速/振动视为传感器故障并修复",
      "所有时间戳按10分钟标准网格重新对齐",
      "原始脏数据与清洗数据分表存放，保证可追溯"
    ];
    strategySummary.immediate_actions = [
      "立即对C3-M05进行预防性维护，更换刀具并复检主轴与散热系统",
      "对C2-M04、C1-M06安排72小时内维护窗口，避免故障扩大",
      "将全线刀具更换标准从180分钟下调至165分钟，并按负荷动态调整"
    ];
    strategySummary.monitoring_actions = [
      "上线温度、扭矩、振动、刀具磨损四指标实时看板",
      "设置黄色预警与红色停机规则，红色预警自动推送至车间主管",
      "每周复盘高风险设备清单，形成维护-验证-迭代闭环"
    ];

    writeJson(path.join(outputDir, "quality_summary.json"), qualitySummary);
    writeJson(path.join(outputDir, "root_cause_analysis.json"), {
      target_machine: rootCauseSummary.target_machine,
      conclusion: "刀具更换周期设置不合理，导致磨损超标，进而引发高温、扭矩异常、振动放大与废品率上升。",
      evidence: rootCauseSummary,
      ruled_out: [
        "原料批次异常：B-260777与其他批次差异不足以解释持续高温",
        "班组操作差异：A/B/C三班废品率差异较小，异常随刀具磨损同步上升",
        "环境温度影响：环境温度已纳入模型，温升幅度远高于环境贡献"
      ],
      root_cause_rows: rootCauseRows
    });
    writeJson(path.join(outputDir, "strategy_summary.json"), strategySummary);
    writeJson(path.join(outputDir, "validation_results.json"), validationResults);
    writeJson(path.join(outputDir, "data_lineage.json"), {
      data_sources: dataSources,
      lineage: dataLineage,
      recent_runs: pipelineRuns
    });

    buildReport({
      qualitySummary,
      riskRows,
      rootCauseRows,
      rootCauseSummary,
      strategySummary,
      dataSources,
      dataLineage,
      pipelineRuns,
      validationResults,
      targetDailyTrend,
      outputDir
    });

    completedMetrics = {
      rawRows: qualitySummary.total_raw_rows,
      cleanRows: qualitySummary.total_raw_rows,
      highRiskCount: riskRows.filter(row => Number(row.risk_score) >= 55).length
    };

    console.log(`MySQL 分析完成：${qualitySummary.total_raw_rows.toLocaleString("zh-CN")}条原始记录`);
    console.log(`修复记录：${qualitySummary.repaired_rows.toLocaleString("zh-CN")}条，占比${qualitySummary.repaired_rows_rate}%`);
    console.log(`最高风险设备：${riskRows[0].machine_id}，风险评分${riskRows[0].risk_score}`);
    console.log(`报告已生成：${path.join(outputDir, "report.html")}`);
  } catch (error) {
    status = "FAILED";
    errorMessage = error.message || String(error);
    throw error;
  } finally {
    if (runId) {
      await connection.query(
        "UPDATE pipeline_run_log SET run_finished_at = NOW(), status = ?, raw_rows = COALESCE(?, 0), clean_rows = COALESCE(?, 0), high_risk_count = COALESCE(?, 0), error_message = ? WHERE run_id = ?",
        [status, completedMetrics?.rawRows ?? null, completedMetrics?.cleanRows ?? null, completedMetrics?.highRiskCount ?? null, errorMessage, runId]
      );
    }
    await connection.end();
  }
}

main().catch(error => {
  if (error && (error.code === "ECONNREFUSED" || error.code === "ER_ACCESS_DENIED_ERROR" || error.code === "ETIMEDOUT")) {
    console.error("无法连接 MySQL。请确认 MySQL 服务已启动，并检查 .env 中的连接信息。");
  }
  console.error(error.message || error);
  process.exitCode = 1;
});
