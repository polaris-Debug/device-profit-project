const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const javascriptFiles = [
  "analysis/generate_sensor_data.js",
  "analysis/run_mysql_analysis.js",
  "analysis/report_builder.js",
  "scripts/lint.js",
  "tests/generator.test.js",
  "tests/report_builder.test.js",
  "tests/sql_contract.test.js"
];
const requiredFiles = [
  "LICENSE",
  "README.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CODE_OF_CONDUCT.md",
  "CHANGELOG.md",
  "docker-compose.yml",
  ".github/workflows/ci.yml",
  "analysis/sql/01_schema.sql",
  "analysis/sql/02_clean.sql",
  "analysis/sql/03_analysis.sql",
  "analysis/sql/04_export.sql",
  "analysis/sql/05_validate.sql"
];

for (const file of javascriptFiles) {
  execFileSync(process.execPath, ["--check", path.join(projectRoot, file)], { stdio: "inherit" });
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(projectRoot, file))) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const schema = fs.readFileSync(path.join(projectRoot, "analysis/sql/01_schema.sql"), "utf8");
if (schema.includes("DROP TABLE")) {
  throw new Error("Schema must not contain destructive DROP TABLE statements");
}

const reportBuilder = fs.readFileSync(path.join(projectRoot, "analysis/report_builder.js"), "utf8");
if (!reportBuilder.includes("validationResults")) {
  throw new Error("Report builder must render validation results");
}

console.log("Static checks passed: syntax, required files, SQL contract, and report contract");
