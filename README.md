# Messaging-First Follow-Up Execution Platform (MVP)

Production-focused monorepo for a privacy-first, messaging-first real estate execution platform.

## Stack

- Backend: NestJS (`apps/api`) + NestJS worker (`apps/worker`)
- Frontend: Expo React Native (`apps/mobile`) + Next.js (`apps/web-admin`)
- Data: PostgreSQL + Redis (`packages/db` migrations + RLS)
- Infra: Terraform for GCP Cloud Run baseline (`infra/gcp`)

## Repository Layout

```text
apps/
  api/
  worker/
  mobile/
  web-admin/
packages/
  db/
  shared-types/
  config/
infra/
  gcp/
docs/
  adr/
  api/
```

## Quick Start

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Copy env templates:
   ```bash
   cp .env.example .env
   ```
3. Run database migrations:
   ```bash
   pnpm db:migrate
   ```
4. Start local development:
   ```bash
   pnpm dev
   ```

## Security Model

- API-level RBAC and ownership/stale-state guards in `apps/api`
- DB-level RLS policies in `packages/db/migrations/002_rls.sql`
- Team Leads get raw content only for stale leads; every raw access writes `AuditLog`

## Key API Endpoints

- `POST /v1/webhooks/email/gmail`
- `POST /v1/webhooks/email/outlook`
- `POST /v1/webhooks/twilio/sms`
- `POST /v1/webhooks/twilio/call`
- `GET /v1/task-deck`
- `GET /v1/leads/:id/derived`
- `GET /v1/leads/:id/events/metadata`
- `GET /v1/leads/:id/events/raw?reason=...`
- `POST /v1/messages/email/reply`
- `POST /v1/messages/sms/send`
- `POST /v1/calls/intent`
- `POST /v1/calls/:eventId/outcome`
- `GET|POST|PUT|DELETE /v1/team/templates`
- `GET|PUT /v1/team/rescue-sequences`
- `GET /v1/team/sla-dashboard`
- `PUT /v1/team/rules`

## Monorepo Commands

- `pnpm dev` - run all dev servers
- `pnpm build` - build all packages/apps
- `pnpm lint` - lint all packages/apps
- `pnpm test` - run unit tests
- `pnpm db:migrate` - run DB migrations
- `pnpm db:seed` - seed local database
