const fs = require("fs");
const path = require("path");

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map(row => columns.map(column => csvEscape(row[column])).join(","))
  ].join("\n");
}

function writeCsv(filePath, rows, columns) {
  fs.writeFileSync(filePath, `\uFEFF${toCsv(rows, columns)}\n`, "utf8");
}

function formatMoney(value) {
  return `¥${Number(value).toLocaleString("zh-CN")}`;
}

function lineChart(filePath, title, points, threshold) {
  const width = 920;
  const height = 360;
  const padding = 55;
  const values = points.map(point => point.value).concat(threshold);
  const minY = Math.min(...values) - 5;
  const maxY = Math.max(...values) + 5;
  const xScale = index => padding + (index / (points.length - 1)) * (width - padding * 2);
  const yScale = value => height - padding - ((value - minY) / (maxY - minY)) * (height - padding * 2);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${round(xScale(index), 1)},${round(yScale(point.value), 1)}`).join(" ");
  const thresholdY = yScale(threshold);
  const labelIndexes = [0, Math.floor(points.length / 3), Math.floor(points.length * 2 / 3), points.length - 1];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <text x="${padding}" y="28" font-family="Arial" font-size="18" font-weight="700" fill="#172033">${title}</text>
  <line x1="${padding}" y1="${thresholdY}" x2="${width - padding}" y2="${thresholdY}" stroke="#d64545" stroke-width="2" stroke-dasharray="6 5"/>
  <text x="${width - padding - 125}" y="${thresholdY - 8}" font-family="Arial" font-size="12" fill="#d64545">红色阈值 ${threshold}°C</text>
  <path d="${path}" fill="none" stroke="#2f6fed" stroke-width="2.5"/>
  ${labelIndexes.map(index => `<circle cx="${round(xScale(index), 1)}" cy="${round(yScale(points[index].value), 1)}" r="4" fill="#2f6fed"/><text x="${round(xScale(index), 1)}" y="${height - 22}" text-anchor="middle" font-family="Arial" font-size="11" fill="#667085">${points[index].label}</text>`).join("\n  ")}
  <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#d0d5dd"/>
  <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#d0d5dd"/>
</svg>`;
  fs.writeFileSync(filePath, svg, "utf8");
}

function barChart(filePath, title, rows) {
  const width = 920;
  const height = 420;
  const padding = 60;
  const maxValue = Math.max(...rows.map(row => row.value));
  const step = (width - padding * 2) / rows.length;
  const barWidth = step * 0.62;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <text x="${padding}" y="30" font-family="Arial" font-size="18" font-weight="700" fill="#172033">${title}</text>
  ${rows.map((row, index) => {
    const barHeight = (row.value / maxValue) * (height - padding * 2);
    const x = padding + index * step + (step - barWidth) / 2;
    const y = height - padding - barHeight;
    const color = index === 0 ? "#d64545" : row.value >= 55 ? "#f2a93b" : "#63a5f2";
    return `<rect x="${round(x, 1)}" y="${round(y, 1)}" width="${round(barWidth, 1)}" height="${round(barHeight, 1)}" rx="6" fill="${color}"/><text x="${round(x + barWidth / 2, 1)}" y="${round(y - 8, 1)}" text-anchor="middle" font-family="Arial" font-size="12" fill="#344054">${row.value}</text><text x="${round(x + barWidth / 2, 1)}" y="${height - 35}" text-anchor="middle" font-family="Arial" font-size="12" fill="#475467">${row.label}</text>`;
  }).join("\n  ")}
  <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#d0d5dd"/>
</svg>`;
  fs.writeFileSync(filePath, svg, "utf8");
}

function buildReport(context) {
  const {
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
  } = context;
  const chartsDir = path.join(outputDir, "charts");
  fs.mkdirSync(chartsDir, { recursive: true });

  writeCsv(
    path.join(outputDir, "equipment_risk.csv"),
    riskRows,
    ["machine_id", "workshop", "avg_temperature", "max_temperature", "avg_torque", "max_torque", "avg_tool_wear", "max_tool_wear", "avg_vibration", "avg_defect_rate", "temperature_trend", "anomaly_rate", "risk_score"]
  );

  writeCsv(
    path.join(outputDir, "validation_results.csv"),
    validationResults,
    ["check_name", "status", "actual_value", "expected_value", "failure_count", "checked_at"]
  );

  writeCsv(
    path.join(outputDir, "data_lineage.csv"),
    dataLineage,
    ["target_table", "source_table", "transformation", "description"]
  );
  writeCsv(
    path.join(outputDir, "root_cause_analysis.csv"),
    rootCauseRows,
    ["dimension", "group_name", "avg_temperature", "avg_tool_wear", "avg_defect_rate"]
  );

  const trendPoints = targetDailyTrend.map((row, index) => ({
    label: `D${index + 1} ${row.date_label}`,
    value: Number(row.avg_temperature)
  }));
  lineChart(path.join(chartsDir, "c3_m05_temperature_trend.svg"), "C3-M05 日均温度趋势（近30天）", trendPoints, 85);
  barChart(
    path.join(chartsDir, "equipment_risk_score.svg"),
    "近72小时设备风险评分TOP5",
    riskRows.slice(0, 5).map(row => ({ label: row.machine_id, value: Number(row.risk_score) }))
  );
  barChart(path.join(chartsDir, "tool_wear_defect_impact.svg"), "刀具磨损对废品率的影响", [
    { label: "磨损≤180分钟", value: Number(rootCauseSummary.normal_wear_avg_defect_rate) },
    { label: "磨损>180分钟", value: Number(rootCauseSummary.high_wear_avg_defect_rate) }
  ]);

  const highRiskRows = riskRows.filter(row => Number(row.risk_score) >= 55);
  const reportHtml = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>设备异常诊断与利润提升经营诊断报告</title>
<style>
body{margin:0;background:#f5f7fb;color:#172033;font-family:"Microsoft YaHei",Arial,sans-serif}
.container{max-width:1080px;margin:0 auto;padding:36px}
.cover{background:linear-gradient(135deg,#172033,#2f6fed);color:white;border-radius:18px;padding:48px;margin-bottom:28px}
.cover h1{font-size:36px;margin:0 0 14px}
.cover p{font-size:16px;opacity:.88;margin:4px 0}
.card{background:white;border-radius:16px;padding:28px;margin-bottom:20px;box-shadow:0 6px 20px rgba(23,32,51,.06)}
h2{font-size:24px;margin:0 0 14px}
h3{font-size:18px;margin:20px 0 8px}
p{line-height:1.8}
.kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.kpi{background:#f7f9fc;border-radius:12px;padding:18px}
.kpi strong{display:block;font-size:27px;color:#2f6fed;margin-bottom:5px}
.kpi span{color:#667085;font-size:13px}
table{width:100%;border-collapse:collapse;margin-top:14px}
th{background:#eef4ff;color:#25324b;text-align:left;padding:11px}
td{border-bottom:1px solid #e8ecf3;padding:11px}
img{width:100%;height:auto;margin-top:16px;border-radius:10px}
.callout{background:#fff8e8;border-left:5px solid #f2a93b;padding:16px;margin-top:14px}
.risk{background:#fff1f1;border-left:5px solid #d64545;padding:16px;margin-top:14px}
ul{line-height:1.9}
.footer{color:#667085;font-size:12px;text-align:center;padding:10px}
@media (max-width:760px){.kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.container{padding:18px}.cover h1{font-size:27px}}
</style>
</head>
<body>
<div class="container">
  <section class="cover">
    <h1>设备异常诊断与利润提升经营诊断报告</h1>
    <p>报告对象：厂长 / 生产运营负责人 / 设备维护负责人</p>
    <p>分析周期：2026-09-10 至 2026-10-09</p>
    <p>数据链路：MySQL 建表 → SQL 清洗 → SQL 分析 → Node 导出 → HTML 报告</p>
  </section>

  <section class="card">
    <h2>数据质量门禁</h2>
    <p>每次分析完成后，SQL 会自动执行数据质量断言。只有全部检查通过，报告才会生成；任何失败都会终止管道并记录到运行日志。</p>
    <table>
      <thead><tr><th>检查项</th><th>状态</th><th>实际值</th><th>期望值</th><th>失败数</th></tr></thead>
      <tbody>
        ${validationResults.map(row => `<tr><td>${row.check_name}</td><td>${row.status}</td><td>${row.actual_value}</td><td>${row.expected_value}</td><td>${row.failure_count}</td></tr>`).join("")}
      </tbody>
    </table>
  </section>

  <section class="card">
    <h2>数据来源与血缘</h2>
    <p>当前项目使用的是由 <code>analysis/generate_sensor_data.js</code> 生成的模拟传感器数据，不是真实生产数据。MySQL 中的结果表均由 SQL 从原始表逐层加工生成，来源和转换规则记录在 data_source_inventory 与 data_lineage 表中。</p>
    <table>
      <thead><tr><th>结果表</th><th>来源</th><th>转换方式</th></tr></thead>
      <tbody>
        ${dataLineage.map(row => `<tr><td>${row.target_table}</td><td>${row.source_table}</td><td>${row.transformation}</td></tr>`).join("")}
      </tbody>
    </table>
    <h3>最近运行记录</h3>
    <table>
      <thead><tr><th>运行ID</th><th>开始时间</th><th>结束时间</th><th>状态</th><th>原始记录</th><th>高风险设备</th></tr></thead>
      <tbody>
        ${pipelineRuns.map(row => `<tr><td>${row.run_id}</td><td>${row.run_started_at}</td><td>${row.run_finished_at || "-"}</td><td>${row.status}</td><td>${row.raw_rows ?? "-"}</td><td>${row.high_risk_count ?? "-"}</td></tr>`).join("")}
      </tbody>
    </table>
  </section>

  <section class="card">
    <h2>一、业务理解与目标设定</h2>
    <p>本次分析围绕“利润管理”回答三个经营问题：利润在哪里流失、异常由什么导致、采取什么动作可以止损并形成闭环。项目目标是通过设备运行数据提前识别高风险机床，优化刀具更换与维护策略，降低维护成本、减少停机损失并提升生产线利润。</p>
    <div class="kpi-grid">
      <div class="kpi"><strong>${Number(qualitySummary.total_raw_rows).toLocaleString("zh-CN")}</strong><span>传感器记录</span></div>
      <div class="kpi"><strong>${qualitySummary.total_machines}</strong><span>机床数量</span></div>
      <div class="kpi"><strong>${highRiskRows.length}</strong><span>高风险设备</span></div>
      <div class="kpi"><strong>${formatMoney(strategySummary.annual_net_benefit)}</strong><span>预计年化净收益</span></div>
    </div>
  </section>

  <section class="card">
    <h2>二、数据摸底与治理</h2>
    <p>原始传感器日志由 Node 生成 CSV 并批量导入 MySQL。数据治理、异常修复、时间轴对齐和质量统计全部在 SQL 层完成，避免 JavaScript 内存计算造成口径漂移。</p>
    <table>
      <thead><tr><th>治理项</th><th>处理规则</th><th>记录数</th></tr></thead>
      <tbody>
        <tr><td>温度缺失</td><td>按同设备中位数填补</td><td>${Number(qualitySummary.missing_temperature).toLocaleString("zh-CN")}</td></tr>
        <tr><td>扭矩0值</td><td>视为传感器故障并修复</td><td>${Number(qualitySummary.zero_torque).toLocaleString("zh-CN")}</td></tr>
        <tr><td>振动极值</td><td>超过物理极限并修复</td><td>${Number(qualitySummary.extreme_vibration).toLocaleString("zh-CN")}</td></tr>
        <tr><td>转速极值</td><td>超过物理极限并修复</td><td>${Number(qualitySummary.extreme_rotation).toLocaleString("zh-CN")}</td></tr>
        <tr><td>刀具磨损缺失</td><td>按同设备中位数填补</td><td>${Number(qualitySummary.missing_tool_wear).toLocaleString("zh-CN")}</td></tr>
        <tr><td>时间戳错位</td><td>统一到10分钟标准网格</td><td>${Number(qualitySummary.timestamp_skew).toLocaleString("zh-CN")}</td></tr>
      </tbody>
    </table>
    <p>治理后，${Number(qualitySummary.repaired_rows).toLocaleString("zh-CN")}条记录被修复或填补，占全部记录的${qualitySummary.repaired_rows_rate}%。原始表与清洗表在 MySQL 中分表存放，任何口径变化均可追溯。</p>
  </section>

  <section class="card">
    <h2>三、评价指标体系</h2>
    <p>MySQL 中的 metric_thresholds 表固化健康设备标准：温度45–85°C、转速1200–1800 RPM、扭矩不超过75 N·m、刀具磨损不超过180分钟、振动不超过3.5 mm/s。指标体系分为三层：传感器健康、设备风险、经营损失。</p>
    <table>
      <thead><tr><th>层级</th><th>代表指标</th><th>经营含义</th></tr></thead>
      <tbody>
        <tr><td>传感器健康</td><td>缺失率、0值率、极值率、时间戳错位率</td><td>决定数据可信度</td></tr>
        <tr><td>设备风险</td><td>温升趋势、扭矩超标、刀具磨损、振动</td><td>决定是否需要维护</td></tr>
        <tr><td>经营损失</td><td>非计划停机小时、废品率、产能损失</td><td>决定利润改善空间</td></tr>
      </tbody>
    </table>
  </section>

  <section class="card">
    <h2>四、异常检测与锁定</h2>
    <p>风险评分、近72小时滚动统计和异常率全部由 SQL 计算。结果显示，${riskRows[0].machine_id}风险评分${riskRows[0].risk_score}分，显著高于其他设备；其日均温度自第22天起持续上升，同时伴随扭矩波动、振动放大和废品率上升，已处于高风险状态。</p>
    <div class="risk"><strong>高风险设备：</strong>${highRiskRows.map(row => `${row.machine_id}（${row.risk_score}分）`).join("、")}。其中${rootCauseSummary.target_machine}最可能在下一班次发生故障，建议立即处理。</div>
    <img src="charts/c3_m05_temperature_trend.svg" alt="C3-M05日均温度趋势图"/>
    <img src="charts/equipment_risk_score.svg" alt="设备风险评分TOP5"/>
  </section>

  <section class="card">
    <h2>五、业务归因与根因下钻</h2>
    <p>SQL 按原料批次、班组与刀具磨损状态交叉统计。批次与班组差异不足以解释持续高温，而刀具磨损超过180分钟后，温度与废品率同步显著上升。</p>
    <table>
      <thead><tr><th>对比项</th><th>正常磨损</th><th>磨损超标</th><th>结论</th></tr></thead>
      <tbody>
        <tr><td>平均温度</td><td>${rootCauseSummary.normal_wear_avg_temperature}°C</td><td>${rootCauseSummary.high_wear_avg_temperature}°C</td><td>温度显著上升</td></tr>
        <tr><td>平均废品率</td><td>${rootCauseSummary.normal_wear_avg_defect_rate}%</td><td>${rootCauseSummary.high_wear_avg_defect_rate}%</td><td>废品率被放大</td></tr>
      </tbody>
    </table>
    <img src="charts/tool_wear_defect_impact.svg" alt="刀具磨损对废品率的影响"/>
    <div class="callout"><strong>根因结论：</strong>刀具更换周期设置不合理，导致磨损超标，进而引发高温、扭矩异常、振动放大与废品率上升。</div>
  </section>

  <section class="card">
    <h2>六、策略输出与效果预估</h2>
    <h3>立即执行</h3>
    <ul>${strategySummary.immediate_actions.map(action => `<li>${action}</li>`).join("")}</ul>
    <h3>长期机制</h3>
    <ul>${strategySummary.monitoring_actions.map(action => `<li>${action}</li>`).join("")}</ul>
    <h3>财务预估</h3>
    <table>
      <thead><tr><th>项目</th><th>预估金额/比例</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td>停机损失节约</td><td>${formatMoney(strategySummary.annual_downtime_saving)}</td><td>非计划停机时间减少15%</td></tr>
        <tr><td>废品损失节约</td><td>${formatMoney(strategySummary.annual_scrap_saving)}</td><td>废品率相关损失减少25%</td></tr>
        <tr><td>维护与监控投入</td><td>${formatMoney(strategySummary.annual_maintenance_investment)}</td><td>预防性维护与看板建设</td></tr>
        <tr><td>年化净收益</td><td>${formatMoney(strategySummary.annual_net_benefit)}</td><td>SQL 计算并扣减投入</td></tr>
      </tbody>
    </table>
    <div class="callout"><strong>经营闭环：</strong>建议一周后复盘高风险设备清单、实际停机小时与废品率，验证策略是否达成15%停机下降目标；若达成，则将刀具更换标准固化到设备维护制度。</div>
  </section>

  <div class="footer">数据说明：本报告基于模拟生产数据与 MySQL 分析管道生成，用于展示数据治理、异常识别、根因分析与经营价值量化方法。</div>
</div>
</body>
</html>`;
  fs.writeFileSync(path.join(outputDir, "report.html"), reportHtml, "utf8");
}

module.exports = { buildReport };
