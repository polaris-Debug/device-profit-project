# Contributing

Thank you for considering a contribution.

## Development setup

```powershell
npm install
Copy-Item .env.example .env
npm run generate-data
npm run analyze
```

## Before submitting a pull request

1. Run `npm run lint`.
2. Run `npm test`.
3. Run `npm run analyze` against a local MySQL 8 database.
4. Confirm every row in `validation_results` is `PASSED`.
5. Add or update documentation for any schema or business-rule change.

## SQL change guidelines

- Prefer window functions and CTEs for readability.
- Do not add destructive `DROP` statements to setup scripts.
- Keep derived-table rebuilds deterministic.
- Add a validation assertion for every new critical business rule.

## Commit style

Use concise, imperative commit messages, for example:

```text
Add tool-wear quality gate
Fix 72-hour risk window boundary
Document financial assumptions
```
