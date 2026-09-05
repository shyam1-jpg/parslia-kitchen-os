-- No real staff identities or privileged memberships are seeded here.
-- Production owners/admins must be provisioned explicitly with deployment secrets
-- (BOOTSTRAP_OWNER_EMAIL / BOOTSTRAP_ADMIN_EMAILS) and authenticate with Microsoft 365.
-- This file intentionally remains as a no-op so existing migration ordering and
-- schema_applied history stay compatible.
SELECT 1;
