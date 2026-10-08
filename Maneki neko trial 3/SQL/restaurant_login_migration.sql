-- ============================================================
--  Maneki Neko — Restaurant Login Migration (Multi-Tenant)
--  Run this in Supabase SQL Editor AFTER the main seed.
--
--  What this does:
--  1. Adds a short `code` column to the restaurants table
--     so each restaurant has a unique login code (e.g. TOKYO)
--  2. Creates the restaurant_credentials table
--  3. Seeds credentials for Maneki Neko Tokyo (code = TOKYO)
--  4. Shows how to add a second restaurant as an example
-- ============================================================


-- ── 1. Add `code` column to restaurants ───────────────────────────────────
--  Each restaurant gets a short, memorable code staff type at login.
--  UNIQUE ensures no two restaurants share a code.

ALTER TABLE restaurants
    ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- Set the code for the existing seeded restaurant (Maneki Neko Tokyo)
UPDATE restaurants
SET    code = 'TOKYO'
WHERE  id   = 'aaaaaaaa-0000-0000-0000-000000000001';


-- ── 2. Create restaurant_credentials table ────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_credentials (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    username      TEXT NOT NULL,
    pin_hash      TEXT NOT NULL,       -- SHA-256 hex of the PIN
    role          TEXT NOT NULL CHECK (role IN ('admin', 'kds', 'bot_manager')),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (restaurant_id, username)   -- same username can exist in different restaurants
);


-- ── 3. Enable RLS — public SELECT (client verifies hash) ──────────────────
ALTER TABLE restaurant_credentials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename  = 'restaurant_credentials'
          AND policyname = 'Public read credentials'
    ) THEN
        CREATE POLICY "Public read credentials" ON restaurant_credentials
            FOR SELECT USING (true);
    END IF;
END
$$;


-- ── 4. Seed credentials for Maneki Neko Tokyo (code = TOKYO) ─────────────
--
--  Role           | Username | PIN  | SHA-256 hash
--  ---------------|----------|------|-------------------------------------------
--  admin          | admin    | 1234 | 03ac674216f3e15c761ee1a5e255f067953623c8b…
--  kds            | kitchen  | 5678 | ef797c8118f02dfb649607dd5d3f8c7623048c9c…
--  bot_manager    | botmgr   | 9012 | 0ade7c2cf97f75d009975f4d720d1fa6c19f4897…

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
ON CONFLICT (restaurant_id, username) DO NOTHING;


-- ── 5. EXAMPLE: Adding a second restaurant (Maneki Neko Osaka) ───────────
--  Uncomment the block below to add a second tenant.
--  Notice: usernames are the SAME ('admin', 'kitchen', 'botmgr') but they
--  are completely isolated because they belong to a different restaurant_id.
--
-- INSERT INTO restaurants (id, name, address, code)
-- VALUES (
--     'bbbbbbbb-0000-0000-0000-000000000002',
--     'Maneki Neko Osaka',
--     '5-10 Dotonbori, Osaka',
--     'OSAKA'
-- ) ON CONFLICT DO NOTHING;
--
-- INSERT INTO restaurant_credentials (restaurant_id, username, pin_hash, role)
-- VALUES
-- (
--     'bbbbbbbb-0000-0000-0000-000000000002',
--     'admin',
--     '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',  -- PIN 1234
--     'admin'
-- ),
-- (
--     'bbbbbbbb-0000-0000-0000-000000000002',
--     'kitchen',
--     'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f',  -- PIN 5678
--     'kds'
-- ),
-- (
--     'bbbbbbbb-0000-0000-0000-000000000002',
--     'botmgr',
--     '0ade7c2cf97f75d009975f4d720d1fa6c19f4897f19f56578b27bc0573dcd2b3',  -- PIN 9012
--     'bot_manager'
-- )
-- ON CONFLICT (restaurant_id, username) DO NOTHING;


-- ============================================================
--  DONE! Login credentials:
--
--  Restaurant: Maneki Neko Tokyo  →  Code: TOKYO
--    Admin Dashboard  → username: admin   / PIN: 1234
--    Kitchen Display  → username: kitchen / PIN: 5678
--    Bot Management   → username: botmgr  / PIN: 9012
--
--  How multi-tenancy works:
--    Staff enter their Restaurant Code + Username + PIN.
--    The system first looks up the restaurant by its code,
--    then verifies the credential only within that restaurant.
--    A 'kitchen' login at TOKYO never sees OSAKA's data.
-- ============================================================
