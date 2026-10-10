# Security policy

## Reporting a vulnerability

Please report security issues privately to the repository maintainer. Do not open a public issue for exploitable vulnerabilities.

## Supported version

Only the latest `main` branch is supported.

## Security practices

- Database credentials are stored in `.env`, which is excluded from version control.
- The schema does not grant broad privileges or create external network integrations.
- SQL statements are versioned and reviewed like application code.
- Generated data is synthetic and contains no personal or customer information.

## Deployment recommendations

- Use a dedicated MySQL user with only the required privileges.
- Store credentials in a secret manager rather than `.env` in production.
- Enable TLS for remote database connections.
- Restrict database access by network or firewall policy.
