# Vedanta Retreat Operating System

Working house OS for **The Vedanta Way**. Authoritative architecture: [docs/MASTER_ARCHITECTURE_2026.md](docs/MASTER_ARCHITECTURE_2026.md). Progress: [PROGRESS.md](PROGRESS.md).

The older “NestJS / 45-room seed” description is stale. The stack was **not** rewritten to match that text — the documentation is corrected to match the code.

## What is here

```
apps/web-admin        House UI — Next.js static export (not a live App Router server)
apps/web-guest        Guest book at /book/
apps/web-staff        Pocket at /pocket/
services/platform-api Fastify API on port 4000 (not NestJS)
packages/contracts    OpenAPI 3.1 — keep as the contract; live routes are /v1/*
domains/*             Pure domain logic: state machines, rules, no framework code
db/migrations         PostgreSQL schema, one numbered file per change
db/seed               Property seed. Live inventory is 42 imported rooms; config still states 45
config/               Property configuration (rooms_total: 45 is a claim, not invented inventory)
infra/                docker-compose for local Postgres + Redis
docs/                 Architecture, import notes, ADRs
PROGRESS.md           What is done, what is next — read this first every session
```

## Run locally

```
docker compose -f infra/docker-compose.yml up -d
cd services/platform-api && npm install && npm run migrate && npm run dev
# in another terminal:
cd apps/web-admin && npm install && npm run dev
```

Open http://localhost:3000 and pick a user (development sign-in). The live trial also accepts **`shyam_1@hotmail.co.uk`** with no password until Microsoft 365 is connected.

## Deploy the trial

Fastest: Apply `vedanta-platform/render.monorepo.yaml` from this branch on Render (see [docs/deploy.md](docs/deploy.md)). First sign-in: `shyam_1@hotmail.co.uk`. Longer term, push **this folder** as its own private GitHub repo (`GET-ON-GITHUB.md`).

## Rules of the repo

- Only command endpoints change state. Every transition records actor, reason and version.
- Money is `numeric(12,2)` with an ISO currency; never floats.
- Every row carries `tenant_id` and (where relevant) `property_id`.
- Anything that touches allergens, payments, refunds or safety is a release gate, not a feature.
