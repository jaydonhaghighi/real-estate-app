# ADR-0002: Privacy-by-Default Enforcement

## Status
Accepted (2026-02-20)

## Decision
Use dual-layer controls:

1. API layer role + ownership checks for route-level enforcement.
2. PostgreSQL RLS on restricted tables, keyed by session variables (`app.user_id`, `app.team_id`, `app.role`).

Team Lead raw-access rule:

- Team Leads can only retrieve raw content for `Lead.state = 'Stale'`.
- Each stale raw read inserts an `AuditLog` row with required reason.

## Notes
Team Lead Active/At-Risk oversight endpoint returns derived profile and metadata only.

Production deployment must use a non-owner application DB role so RLS policies are enforced for app traffic.
