-- ============================================================
--  Maneki Neko — Restaurant Tables Migration
--  Run this in Supabase SQL Editor AFTER restaurant_login_migration.sql
--
--  Creates a `restaurant_tables` table so each restaurant can
--  define which table numbers exist (e.g. Table 1 to Table 12).
--  The customer login page will validate against this.
-- ============================================================

-- ── Create restaurant_tables table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    table_number  INTEGER NOT NULL CHECK (table_number > 0),
    label         TEXT,           -- optional custom label, e.g. "Window Seat"
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (restaurant_id, table_number)
);

-- ── RLS: allow full public access (dev portal + customer login) ───────────
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='restaurant_tables' AND policyname='Public read tables') THEN
    CREATE POLICY "Public read tables" ON restaurant_tables FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='restaurant_tables' AND policyname='Dev portal insert tables') THEN
    CREATE POLICY "Dev portal insert tables" ON restaurant_tables FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='restaurant_tables' AND policyname='Dev portal update tables') THEN
    CREATE POLICY "Dev portal update tables" ON restaurant_tables FOR UPDATE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='restaurant_tables' AND policyname='Dev portal delete tables') THEN
    CREATE POLICY "Dev portal delete tables" ON restaurant_tables FOR DELETE USING (true);
  END IF;
END $$;

-- ── Seed tables for Maneki Neko Tokyo (Tables 1-10) ──────────────────────
INSERT INTO restaurant_tables (restaurant_id, table_number, label)
SELECT
    'aaaaaaaa-0000-0000-0000-000000000001',
    t.n,
    'Table ' || t.n
FROM generate_series(1, 10) AS t(n)
ON CONFLICT (restaurant_id, table_number) DO NOTHING;

-- ============================================================
--  DONE!
--  Tokyo now has Tables 1-10 registered.
--  Add more restaurants/tables using dev-setup.html
-- ============================================================
