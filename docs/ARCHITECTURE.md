# Architecture

## Goals

- Keep business calculations in SQL for auditability and reproducibility.
- Keep Node.js responsible only for orchestration, import, export, and reporting.
- Make every run traceable through data lineage and run logs.
- Fail closed when data quality checks do not pass.

## Pipeline

```text
Node.js generator
      |
      v
raw_sensor_logs.csv
      |
      v
MySQL raw_sensor_logs
      |
      +--> machine_reference_stats
      |         |
      |         v
      +--> clean_sensor_logs
                |
                +--> quality_summary
                +--> equipment_risk
                +--> root_cause_analysis
                +--> root_cause_summary
                +--> validation_results
                |
                v
             Node.js export
                |
                v
         HTML report + SVG charts
```

## Design decisions

| Decision | Rationale |
|---|---|
| SQL-first analytics | Business logic is inspectable, versioned, and portable to BI tools. |
| Idempotent schema | Repeated setup does not delete historical raw data or run logs. |
| Derived-table rebuilds | Clean and analytical tables are regenerated deterministically from raw data. |
| Quality gate | The pipeline stops before report generation if any SQL assertion fails. |
| Simulated source data | Makes the repository runnable without private manufacturing data. |

## Extension points

1. Replace `raw_sensor_logs.csv` with a real export.
2. Add incremental ingestion based on `record_id` or event timestamp.
3. Add a scheduler around `npm run analyze`.
4. Add BI views on top of `equipment_risk` and `root_cause_summary`.
