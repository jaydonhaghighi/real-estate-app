# ADR-0001: Monorepo Architecture

## Status
Accepted (2026-02-20)

## Context
The MVP requires API + worker + mobile + web-admin with shared schema and strict RBAC constraints.

## Decision
Use a pnpm/Turborepo TypeScript monorepo with:

- NestJS API for external-facing endpoints and webhook ingestion
- NestJS worker for stale detection, rescue task automation, and sync jobs
- Expo mobile app for agent daily execution
- Next.js web admin for Team Lead oversight
- Shared types package and centralized DB migrations

## Consequences
- Faster cross-surface changes with shared contracts
- Single CI pipeline and consistent lint/type standards
- Requires disciplined package boundaries and clear ownership
