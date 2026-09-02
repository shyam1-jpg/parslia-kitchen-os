# Vedanta Oway Retreat — Unified Retreat & Hotel Management Platform

Working repository for the platform described in the Master Specification (v1.0, 2 Sept 2026).

## What is here

```
apps/web-admin        Next.js admin (receptionist, housekeeping, manager screens) — Week 1–2
services/platform-api TypeScript API (NestJS) — Week 1–2
packages/contracts    OpenAPI 3.1 contract — source of truth for every endpoint
domains/*             Pure domain logic: state machines, rules, no framework code
db/migrations         PostgreSQL schema, one numbered file per change
db/seed               Property facts: 45 rooms, restaurant, roles, staff
config/               Property configuration (the spec's [CONFIGURE] values)
infra/                docker-compose for local Postgres + Redis
docs/adr              Architecture decision records
PROGRESS.md           What is done, what is next — read this first every session
```

## Run locally

```
docker compose -f infra/docker-compose.yml up -d
cd services/platform-api && npm install && npm run migrate && npm run dev
# in another terminal:
cd apps/web-admin && npm install && npm run dev
```

Open http://localhost:3000 and pick a user (development sign-in). Production uses Microsoft 365.

## Deploy the trial

Render is the simplest path — `render.yaml` creates `vedanta-db`, `vedanta-api` and `vedanta-admin`. Step-by-step: [docs/deploy.md](docs/deploy.md). Push **this folder** as its own private GitHub repo (see `GET-ON-GITHUB.md`).

## Rules of the repo

- Only command endpoints change state. Every transition records actor, reason and version.
- Money is `numeric(12,2)` with an ISO currency; never floats.
- Every row carries `tenant_id` and (where relevant) `property_id`.
- Anything that touches allergens, payments, refunds or safety is a release gate, not a feature.
