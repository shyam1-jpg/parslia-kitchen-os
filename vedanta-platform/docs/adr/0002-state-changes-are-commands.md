# ADR 0002 — State changes only through command endpoints

Date: 2026-09-02 · Status: Accepted

No client may PATCH a `status` column. Reservations, rooms and purchase orders change state
through `POST .../commands/{command}` endpoints which: check permission, run the domain
state machine, require `If-Match` version, bump the version, write an `audit_event` with
actor + reason + from/to state, and publish a domain event — all in one transaction.
