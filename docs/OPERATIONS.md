# Operations runbook

## Run the pipeline

```powershell
npm run analyze
```

## Expected outputs

- `outputs/report.html`
- `outputs/quality_summary.json`
- `outputs/equipment_risk.csv`
- `outputs/root_cause_analysis.csv`
- `outputs/strategy_summary.json`
- `outputs/data_lineage.json`
- `outputs/validation_results.json`

## Troubleshooting

| Symptom | Action |
|---|---|
| `ECONNREFUSED 127.0.0.1:3306` | Start MySQL or run `docker compose up -d mysql`. |
| `ER_ACCESS_DENIED_ERROR` | Check `DB_USER` and `DB_PASSWORD` in `.env`. |
| Duplicate import messages | Expected; `INSERT IGNORE` keeps `record_id` idempotent. |
| Quality gate failure | Inspect `outputs/validation_results.json` after fixing data or SQL. |
| Report not generated | A validation assertion failed; do not publish partial results. |

## Reset policy

The repository intentionally avoids automatic destructive resets. To rebuild the demo database from scratch, drop the `device_profit_analysis` database manually or delete the Docker volume. Raw data and run logs are preserved by default.
