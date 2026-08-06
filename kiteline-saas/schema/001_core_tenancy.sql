-- =============================================================================
-- Kiteline Kitchen OS — Phase A core tenancy schema
-- Target: Neon Postgres / any Postgres 14+
-- Every business row is scoped by company_id (+ location_id where applicable)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$ BEGIN
  CREATE ROLE kiteline_app NOINHERIT LOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE company_status AS ENUM ('trial', 'active', 'past_due', 'suspended', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE location_status AS ENUM ('active', 'inactive', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE membership_status AS ENUM ('invited', 'active', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE platform_role AS ENUM ('super_admin', 'support');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE company_role AS ENUM (
    'company_owner',
    'kitchen_admin',
    'location_manager',
    'staff'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE clock_event_type AS ENUM ('clock_in', 'clock_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'trialing', 'active', 'past_due', 'cancelled', 'incomplete'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION kiteline_current_user_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT NULLIF(current_setting('kiteline.user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION kiteline_current_company_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT NULLIF(current_setting('kiteline.company_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION kiteline_is_super_admin() RETURNS boolean
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT COALESCE(current_setting('kiteline.is_super_admin', true), 'false') = 'true'
$$;

CREATE TABLE IF NOT EXISTS users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           citext NOT NULL UNIQUE,
  password_hash   text,
  name            text NOT NULL,
  phone           text,
  status          membership_status NOT NULL DEFAULT 'active',
  email_verified  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_admins (
  user_id     uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role        platform_role NOT NULL DEFAULT 'super_admin',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  legal_name            text,
  status                company_status NOT NULL DEFAULT 'trial',
  plan_code             text NOT NULL DEFAULT 'trial',
  stripe_customer_id    text UNIQUE,
  owner_user_id         uuid REFERENCES users(id),
  legacy_tenant_id      text UNIQUE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS locations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name              text NOT NULL,
  legal_name        text,
  address_line1     text,
  city              text,
  postcode          text,
  country           text NOT NULL DEFAULT 'UK',
  timezone          text NOT NULL DEFAULT 'Europe/London',
  status            location_status NOT NULL DEFAULT 'active',
  manager_user_id   uuid REFERENCES users(id),
  legacy_site_id    text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  UNIQUE (company_id, name),
  UNIQUE (company_id, legacy_site_id)
);

CREATE INDEX IF NOT EXISTS locations_company_idx ON locations(company_id);

CREATE TABLE IF NOT EXISTS memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        company_role NOT NULL DEFAULT 'staff',
  status      membership_status NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS memberships_user_idx ON memberships(user_id);
CREATE INDEX IF NOT EXISTS memberships_company_idx ON memberships(company_id);

CREATE TABLE IF NOT EXISTS location_memberships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL,
  location_id  uuid NOT NULL,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         company_role NOT NULL DEFAULT 'staff',
  status       membership_status NOT NULL DEFAULT 'active',
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, user_id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS location_memberships_user_idx ON location_memberships(user_id, company_id);

-- SECURITY DEFINER: must bypass RLS on memberships to avoid infinite recursion
CREATE OR REPLACE FUNCTION kiteline_user_has_company(cid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT kiteline_is_super_admin()
         OR EXISTS (
           SELECT 1 FROM memberships m
           WHERE m.company_id = cid
             AND m.user_id = kiteline_current_user_id()
             AND m.status = 'active'
         )
$$;

CREATE OR REPLACE FUNCTION kiteline_user_has_location(cid uuid, lid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT kiteline_is_super_admin()
         OR EXISTS (
           SELECT 1 FROM memberships m
           WHERE m.company_id = cid
             AND m.user_id = kiteline_current_user_id()
             AND m.status = 'active'
             AND m.role IN ('company_owner', 'kitchen_admin')
         )
         OR EXISTS (
           SELECT 1 FROM location_memberships lm
           WHERE lm.company_id = cid
             AND lm.location_id = lid
             AND lm.user_id = kiteline_current_user_id()
             AND lm.status = 'active'
         )
$$;

REVOKE ALL ON FUNCTION kiteline_user_has_company(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION kiteline_user_has_location(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kiteline_user_has_company(uuid) TO kiteline_app;
GRANT EXECUTE ON FUNCTION kiteline_user_has_location(uuid, uuid) TO kiteline_app;

CREATE TABLE IF NOT EXISTS staff_pins (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pin_hash     text NOT NULL,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, location_id, user_id),
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id    uuid REFERENCES companies(id) ON DELETE CASCADE,
  location_id   uuid,
  token_hash    text NOT NULL UNIQUE,
  expires_at    timestamptz NOT NULL,
  ip            text,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id            bigserial PRIMARY KEY,
  company_id    uuid REFERENCES companies(id) ON DELETE SET NULL,
  location_id   uuid,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action        text NOT NULL,
  entity_type   text,
  entity_id     text,
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_company_idx ON audit_logs(company_id, created_at DESC);
