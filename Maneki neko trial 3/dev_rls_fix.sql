-- ============================================================
--  Maneki Neko — Dev Portal RLS Fix
--  Run this in Supabase SQL Editor if you get:
--  "new row violates row-level security policy"
--  when using the dev-setup.html portal.
--
--  This adds INSERT / UPDATE / DELETE policies for the
--  restaurants and restaurant_credentials tables so the
--  dev portal (which uses the anon key) can write to them.
-- ============================================================


-- ── restaurants table: allow all operations (dev portal) ─────────────────

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- SELECT (already exists in most setups, safe to re-add)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='restaurants' AND policyname='Public read restaurants'
  ) THEN
    CREATE POLICY "Public read restaurants" ON restaurants FOR SELECT USING (true);
  END IF;
END $$;

-- INSERT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='restaurants' AND policyname='Dev portal insert restaurants'
  ) THEN
    CREATE POLICY "Dev portal insert restaurants" ON restaurants FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- UPDATE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='restaurants' AND policyname='Dev portal update restaurants'
  ) THEN
    CREATE POLICY "Dev portal update restaurants" ON restaurants FOR UPDATE USING (true);
  END IF;
END $$;

-- DELETE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='restaurants' AND policyname='Dev portal delete restaurants'
  ) THEN
    CREATE POLICY "Dev portal delete restaurants" ON restaurants FOR DELETE USING (true);
  END IF;
END $$;


-- ── restaurant_credentials table: allow all operations ───────────────────

ALTER TABLE restaurant_credentials ENABLE ROW LEVEL SECURITY;

-- SELECT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='restaurant_credentials' AND policyname='Public read credentials'
  ) THEN
    CREATE POLICY "Public read credentials" ON restaurant_credentials FOR SELECT USING (true);
  END IF;
END $$;

-- INSERT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='restaurant_credentials' AND policyname='Dev portal insert credentials'
  ) THEN
    CREATE POLICY "Dev portal insert credentials" ON restaurant_credentials FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- DELETE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='restaurant_credentials' AND policyname='Dev portal delete credentials'
  ) THEN
    CREATE POLICY "Dev portal delete credentials" ON restaurant_credentials FOR DELETE USING (true);
  END IF;
END $$;


-- ============================================================
--  DONE! The dev portal can now:
--    ✅ Create restaurants
--    ✅ Delete restaurants (cascades to their credentials)
--    ✅ Add staff credentials
--    ✅ Delete staff credentials
-- ============================================================
