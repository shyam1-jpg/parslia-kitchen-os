# Vedanta Platform — Secure Deployment

This document separates the temporary local/Cloudflare trial from a real production deployment.

## 1. Temporary local / Cloudflare trial

The temporary `trycloudflare.com` URL is a development surface. It exists only while the machine, local API and tunnel are running.

Development may use the email-only staff convenience flow because `NODE_ENV` is not `production`. This is for local testing only.

Do not treat the Cloudflare URL as the permanent Vedanta deployment or as proof that production authentication is configured.

## 2. Production security rules

Production has hard safety gates in code:

- Staff email-only login is disabled whenever `NODE_ENV=production`.
- Staff authenticate through Microsoft 365 / Entra ID.
- `SYSTEM_OWNER` is honoured only when the email is explicitly allow-listed through deployment configuration.
- Public seed files do not contain real Vedanta staff identities.
- CORS accepts configured production origins only.
- `x-user` development impersonation is not accepted in production.
- New private guest sessions are not created from an unverified email address by default.
- Existing guest emails must authenticate before they can be reused for My Stay.
- HSTS, frame denial, nosniff, referrer policy and permissions policy are enabled by the API/hosting configuration.

Never change these controls simply to make a deployment easier.

## 3. GitHub source

The active Vedanta work is currently in:

- Repository: `shyam1-jpg/parslia-kitchen-os`
- PR: `#97`
- Branch: `cursor/vedanta-render-deploy-f604`
- Vedanta root: `vedanta-platform/`

Long term, a dedicated private Vedanta repository is still preferable so hotel/guest operational data work is separated from the public Parslia repository.

## 4. CI gate

Before deploying any head commit, confirm **Vedanta CI** is green. It runs:

1. Domain tests
2. API tests
3. Admin web build
4. Guest portal build
5. Staff pocket build

A failed CI run is a deployment stop.

## 5. Render blueprint

When deploying from the current monorepo, use:

`vedanta-platform/render.monorepo.yaml`

For a future dedicated `vedanta-platform` repository, use the `render.yaml` inside that repository root.

The blueprint creates the database, API and admin surface. Guest `/book/` and staff `/pocket/` need a deliberate stable routing/deployment design before public production launch; the temporary local proxy is not the permanent architecture.

## 6. Required production environment

### Core

- `NODE_ENV=production`
- `DATABASE_URL` — provided by the production PostgreSQL service
- `PUBLIC_URL` — public API origin
- `WEB_URL` — admin web origin
- `CORS_ORIGINS` — any additional explicitly approved browser origins

### Owner provisioning

Set at least one trusted owner through a deployment secret:

- `BOOTSTRAP_OWNER_EMAIL`
- `BOOTSTRAP_OWNER_NAME`

Optional additional explicitly trusted owners:

- `BOOTSTRAP_ADMIN_EMAILS`
- `SYSTEM_OWNER_ALLOWLIST`

Do not put real privileged staff emails back into public SQL seed files.

### Staff authentication

Required for production staff access:

- `MS_TENANT_ID`
- `MS_CLIENT_ID`
- `MS_CLIENT_SECRET`

Keep:

- `ALLOW_EMAIL_LOGIN=false`

The API also refuses production staff email-only login at code level even if this flag is accidentally changed.

## 7. Microsoft 365 / Entra setup

Create a Microsoft Entra app registration for Vedanta Admin.

Use a Web redirect URI matching the deployed API, for example:

`https://<vedanta-api-domain>/auth/microsoft/callback`

Use the Vedanta organisational tenant unless there is an explicit business requirement for another account type.

The Microsoft identity proves who the person is. Vedanta roles and permissions still come from `app_user`, `membership`, `role` and `role_permission`.

Do not make every Microsoft user an administrator automatically.

## 8. Guest portal safety

Public users may browse programmes and availability without an account.

Production currently defaults to:

- `GUEST_PORTAL_ENABLED=true`
- `ALLOW_UNVERIFIED_GUEST_BOOTSTRAP=false`

This means public browsing remains available, but a brand-new private **My Stay** session is not granted merely because a browser typed an email address.

Before enabling first-time self-service private guest accounts in production, implement and test email ownership verification using OTP or a one-time magic link. Then explicitly review the production flag and flow.

Existing guests must sign in to their own My Stay before creating further private enquiries under that email.

## 9. Email

Configure outbound email through:

- `SMTP_URL`
- `MAIL_FROM`

Do not expose SMTP passwords, Microsoft secrets or database credentials in GitHub, screenshots, PR descriptions, frontend environment variables or client JavaScript.

## 10. Sessions

Current bearer-token sessions are suitable for the controlled trial but are not the final authentication architecture.

Before a broad public/staff production rollout, migrate browser sessions to Secure + HttpOnly + SameSite cookies with CSRF protection, session rotation, revocation and device/session visibility.

## 11. Rate limiting

Current in-process rate limiting protects the trial but is not sufficient for multiple production API instances.

Before scale-out, use a shared limiter such as Redis or a database-backed mechanism and apply limits by IP plus account/identity where appropriate.

## 12. Data protection

Before real guest data is loaded:

- publish the guest privacy notice;
- define retention periods;
- restrict sensitive dietary/accessibility fields by role;
- document data export/deletion workflows;
- verify backups and restore procedures;
- define incident/breach handling;
- confirm audit log retention.

## 13. Backups and monitoring

Production requires:

- automated off-server database backups;
- tested restore procedure;
- application/API uptime monitoring;
- error alerting;
- database capacity monitoring;
- authentication/security alerting;
- backup failure alerting.

A backup that has never been restored in a test should not be treated as a proven backup.

## 14. Production release gate

Do not call the Vedanta platform production-ready until all of the following are true:

- Vedanta CI is green on the exact deployed commit.
- Microsoft 365 staff authentication works.
- Email-only staff authentication remains disabled.
- Production owner allowlist is explicitly configured.
- Guest first-time identity verification is implemented before private self-service guest accounts are enabled.
- Stable `/book/`, `/house/`, `/sign-in/` and `/pocket/` routing is deployed.
- CORS contains only approved origins.
- Real secrets exist only in deployment secret storage.
- Backups and restore are tested.
- Monitoring and alerts are active.
- Privacy/retention requirements are documented.
- A release rollback procedure exists.

## 15. Updating the temporary Cloudflare preview

Changes committed to PR #97 do not automatically appear on the temporary tunnel.

On the machine running the trial, sync the branch, rebuild the Vedanta apps/API and restart the local services/tunnel. The Cloudflare hostname may change when the tunnel is restarted.

The GitHub PR is the stable source of truth; the `trycloudflare.com` address is only a temporary preview.
