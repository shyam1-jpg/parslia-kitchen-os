-- Named people hold the posts. Retire generic placeholder logins that would
-- sit in the same seats (Julia is housekeeping supervisor; kitchen names are not yet given).
UPDATE app_user SET status = 'LEFT'
WHERE email IN ('housekeeping@thevedanta.org', 'chef@thevedanta.org', 'kitchen@thevedanta.org')
  AND status <> 'LEFT';
