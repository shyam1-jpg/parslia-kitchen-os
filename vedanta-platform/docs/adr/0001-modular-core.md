# ADR 0001 — Modular core first, selective microservices later

Date: 2026-09-02 · Status: Accepted

## Decision
Build one modular platform (single deployable API + single PostgreSQL database) with strict
domain boundaries in code (`domains/*`) and an event log. Extract notifications, documents,
integrations, AI and search as separate services only when they have a scaling, security
or vendor reason to be separate.

## Why
A 45-room property with 25 staff does not need a dozen services on day one. What it needs is
correctness: one guest record, one room state, one audit trail. A modular core gets that
quickly and keeps a clean path to services later because domain logic never depends on
the web framework or the database driver.

## Consequences
- `domains/*` contain pure TypeScript, unit-tested without a database.
- The API layer owns transactions, versions and audit writes.
- Every table carries `tenant_id` from the start so multi-property is a configuration change.
