-- ============================================================
--  Maneki Neko — Fix Login Credentials
--  Paste this entire script into Supabase SQL Editor and run it.
-- ============================================================

-- 1. Add code column to restaurants (safe if already exists)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- 2. Set TOKYO code on your seeded restaurant
UPDATE restaurants
SET    code = 'TOKYO'
WHERE  id   = 'aaaaaaaa-0000-0000-0000-000000000001';

-- 3. Create the credentials table (safe if already exists)
CREATE TABLE IF NOT EXISTS restaurant_credentials (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    username      TEXT NOT NULL,
    pin_hash      TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('admin', 'kds', 'bot_manager')),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (restaurant_id, username)
);

-- 4. Enable Row Level Security + public read policy
ALTER TABLE restaurant_credentials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename  = 'restaurant_credentials'
          AND policyname = 'Public read credentials'
    ) THEN
        CREATE POLICY "Public read credentials"
            ON restaurant_credentials FOR SELECT USING (true);
    END IF;
END
$$;

-- 5. Insert / upsert credentials
--    admin   → username: admin   / PIN: 1234
--    kitchen → username: kitchen / PIN: 5678
--    bots    → username: botmgr  / PIN: 9012
INSERT INTO restaurant_credentials (restaurant_id, username, pin_hash, role)
VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'admin',
    '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
    'admin'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'kitchen',
    'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f',
    'kds'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'botmgr',
    '0ade7c2cf97f75d009975f4d720d1fa6c19f4897f19f56578b27bc0573dcd2b3',
    'bot_manager'
  )
ON CONFLICT (restaurant_id, username) DO UPDATE
  SET pin_hash = EXCLUDED.pin_hash,
      role     = EXCLUDED.role;

-- 6. Verify — should return 3 rows
SELECT r.name AS restaurant, r.code, rc.username, rc.role
FROM   restaurant_credentials rc
JOIN   restaurants r ON r.id = rc.restaurant_id
ORDER  BY rc.role;
