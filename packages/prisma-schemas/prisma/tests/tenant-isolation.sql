-- ---------------------------------------------------------------------------
-- Tenant isolation test (row-level security)
--
-- Proves that a connection of the application role can only read the rows of
-- the tenant carried in the `app.tenant_id` GUC:
--
--   1. tenant A sees its own rows and nothing else
--   2. tenant B does not see the rows of tenant A
--   3. a connection without tenant context sees nothing at all
--   4. the explicit platform path (`app.bypass_rls`) still sees everything
--
-- The test runs inside a transaction that is rolled back at the end, so it
-- never leaves data behind.
--
-- Run it against a database that has been migrated and seeded:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--        -f packages/prisma-schemas/prisma/tests/tenant-isolation.sql
-- ---------------------------------------------------------------------------
\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  owner_role text := current_user;
  tenant_a text;
  tenant_b text;
  rows_a bigint;
  rows_b bigint;
  rows_none bigint;
  rows_all bigint;
  rows_total bigint;
  suffix text := substr(md5(random()::text), 1, 10);
  probe_id text := 'rls-test-' || substr(md5(random()::text), 1, 12);
BEGIN
  -- The application role must exist, otherwise the test cannot prove
  -- anything: a superuser bypasses every policy.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'smartlogi_app') THEN
    RAISE EXCEPTION
      'Role smartlogi_app does not exist - run the database bootstrap first';
  END IF;

  SELECT id INTO tenant_a
  FROM public."Tenant" WHERE db_schema_name = 'public' ORDER BY created_at LIMIT 1;

  IF tenant_a IS NULL THEN
    RAISE EXCEPTION 'No tenant owns the public schema - seed the database first';
  END IF;

  -- A second tenant is created on the fly so that the test also works on a
  -- freshly seeded (single tenant) database.
  INSERT INTO public."Tenant" (id, name, slug, db_schema_name, status)
  VALUES (
    gen_random_uuid()::text,
    'RLS Test Tenant',
    'rls-test-' || suffix,
    'rls_test_' || suffix,
    'ACTIVE'
  )
  RETURNING id INTO tenant_b;

  -- Reference number, counted as the owner role (row-level security is
  -- bypassed for superusers, which is what the migrator/seed role is).
  EXECUTE 'SELECT count(*) FROM public."orders"' INTO rows_total;

  -- A row that belongs to tenant B only.
  EXECUTE format(
    'INSERT INTO public."orders" (id, tenant_id, tracking_code, recipient_name, '
    'recipient_phone, recipient_address, shipping_fee, updated_at) '
    'VALUES ($1, $2, $3, $4, $5, $6, 0, now())',
    probe_id, tenant_b, 'RLS-' || probe_id, 'RLS Probe', '0000000000', 'RLS probe address');
  EXECUTE format('SELECT set_config(''app.tenant_id'', %L, true)', tenant_a);

  -- 1) Tenant A: sees its own rows, not the probe row of tenant B.
  EXECUTE 'SET LOCAL ROLE smartlogi_app';
  EXECUTE 'SELECT count(*) FROM public."orders"' INTO rows_a;
  EXECUTE format('SET LOCAL ROLE %s', quote_ident(owner_role));

  -- 2) Tenant B: sees its own rows, not the rows of tenant A.
  EXECUTE format('SELECT set_config(''app.tenant_id'', %L, true)', tenant_b);
  EXECUTE 'SET LOCAL ROLE smartlogi_app';
  EXECUTE 'SELECT count(*) FROM public."orders"' INTO rows_b;
  EXECUTE format('SET LOCAL ROLE %s', quote_ident(owner_role));

  -- 3) No tenant context: nothing is visible.
  EXECUTE format('SELECT set_config(''app.tenant_id'', %L, true)', '');
  EXECUTE 'SET LOCAL ROLE smartlogi_app';
  EXECUTE 'SELECT count(*) FROM public."orders"' INTO rows_none;
  EXECUTE format('SET LOCAL ROLE %s', quote_ident(owner_role));

  -- 4) Platform path: everything is visible.
  EXECUTE 'SELECT set_config(''app.bypass_rls'', ''on'', true)';
  EXECUTE 'SET LOCAL ROLE smartlogi_app';
  EXECUTE 'SELECT count(*) FROM public."orders"' INTO rows_all;
  EXECUTE format('SET LOCAL ROLE %s', quote_ident(owner_role));

  RAISE NOTICE 'rows: total=% tenant_a=% tenant_b=% without_tenant=% platform=%',
    rows_total, rows_a, rows_b, rows_none, rows_all;

  IF rows_a <> rows_total THEN
    RAISE EXCEPTION
      'Tenant A must see exactly its own rows (expected %, got %)', rows_total, rows_a;
  END IF;

  IF rows_b <> 1 THEN
    RAISE EXCEPTION
      'Tenant B must only see its own probe row (expected 1, got %)', rows_b;
  END IF;

  IF rows_none <> 0 THEN
    RAISE EXCEPTION
      'A connection without tenant context must not see any row (got %)', rows_none;
  END IF;

  IF rows_all <> rows_total + 1 THEN
    RAISE EXCEPTION
      'The platform path must see every row (expected %, got %)', rows_total + 1, rows_all;
  END IF;
END $$;

ROLLBACK;

\echo 'Tenant isolation test PASSED'
