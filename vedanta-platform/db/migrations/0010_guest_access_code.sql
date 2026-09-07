-- Guest sign-in privacy hardening: email alone must not open someone else's book.
-- Each guest account has a private access code hash.
ALTER TABLE guest_account
  ADD COLUMN IF NOT EXISTS access_code_hash text;
