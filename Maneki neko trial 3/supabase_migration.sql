-- ============================================================
--  Maneki Neko — Additive Migration Script
--  Run this in Supabase SQL Editor AFTER the initial seed.
--  This script is SAFE to re-run (uses IF NOT EXISTS / IF EXISTS).
-- ============================================================

-- ── 1. restaurant_info table ──────────────────────────────────
-- Referenced by shared/supabase.js getRestaurantInfo() but missing
-- from the original seed. Stores per-restaurant metadata.
-- ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS restaurant_info (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    key           TEXT NOT NULL,
    value         JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (restaurant_id, key)
);

-- Seed default restaurant info for Maneki Neko Tokyo
INSERT INTO restaurant_info (restaurant_id, key, value)
SELECT 
    'aaaaaaaa-0000-0000-0000-000000000001', 
    'restaurant_info', 
    '{"name": "Maneki Neko Tokyo", "tagline": "Smart Restaurant Powered by AI", "currency": "INR", "currency_symbol": "₹", "timezone": "Asia/Kolkata", "theme_color": "#6366f1", "address": "12 Sakura Lane, Shinjuku, Tokyo"}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM restaurant_info 
    WHERE restaurant_id = 'aaaaaaaa-0000-0000-0000-000000000001' AND key = 'restaurant_info'
);


-- ── 2. Performance Indexes & Schema Updates ───────────────────────
-- Add missing customer_phone to orders to track guest orders
-- Speed up order history queries (customer login feature)
-- ───────────────────────────────────────────────────────────────

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_customer_id
    ON orders (customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_customer_phone
    ON orders (customer_phone);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status
    ON orders (restaurant_id, status);

CREATE INDEX IF NOT EXISTS idx_customers_phone
    ON customers (phone);

CREATE INDEX IF NOT EXISTS idx_customers_restaurant_id
    ON customers (restaurant_id);


-- ── 3. RLS Policies for customers table ───────────────────────
-- Allow public read/write for the demo (no auth required)
-- ───────────────────────────────────────────────────────────────

-- Enable RLS on customers (if not already enabled)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Public SELECT for customer lookup by phone
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'customers' AND policyname = 'Public read customers'
    ) THEN
        CREATE POLICY "Public read customers" ON customers
            FOR SELECT USING (true);
    END IF;
END
$$;

-- Public INSERT for new customer registration
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'customers' AND policyname = 'Public insert customers'
    ) THEN
        CREATE POLICY "Public insert customers" ON customers
            FOR INSERT WITH CHECK (true);
    END IF;
END
$$;

-- Public UPDATE for visit_count increment and preference updates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'customers' AND policyname = 'Public update customers'
    ) THEN
        CREATE POLICY "Public update customers" ON customers
            FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
END
$$;


-- ── 4. RLS Policies for orders table ──────────────────────────
-- Allow public read/write for the demo
-- ───────────────────────────────────────────────────────────────

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'orders' AND policyname = 'Public read orders'
    ) THEN
        CREATE POLICY "Public read orders" ON orders
            FOR SELECT USING (true);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'orders' AND policyname = 'Public insert orders'
    ) THEN
        CREATE POLICY "Public insert orders" ON orders
            FOR INSERT WITH CHECK (true);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'orders' AND policyname = 'Public update orders'
    ) THEN
        CREATE POLICY "Public update orders" ON orders
            FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
END
$$;


-- ── 5. RLS Policies for restaurant_info table ─────────────────

ALTER TABLE restaurant_info ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'restaurant_info' AND policyname = 'Public read restaurant_info'
    ) THEN
        CREATE POLICY "Public read restaurant_info" ON restaurant_info
            FOR SELECT USING (true);
    END IF;
END
$$;


-- ── 6. RLS Policies for feedback table ────────────────────────

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'feedback' AND policyname = 'Public read feedback'
    ) THEN
        CREATE POLICY "Public read feedback" ON feedback
            FOR SELECT USING (true);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'feedback' AND policyname = 'Public insert feedback'
    ) THEN
        CREATE POLICY "Public insert feedback" ON feedback
            FOR INSERT WITH CHECK (true);
    END IF;
END
$$;


-- ── 7. RLS Policies for conversation_logs ─────────────────────

ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'conversation_logs' AND policyname = 'Public read conversation_logs'
    ) THEN
        CREATE POLICY "Public read conversation_logs" ON conversation_logs
            FOR SELECT USING (true);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'conversation_logs' AND policyname = 'Public insert conversation_logs'
    ) THEN
        CREATE POLICY "Public insert conversation_logs" ON conversation_logs
            FOR INSERT WITH CHECK (true);
    END IF;
END
$$;


-- ── 8. RLS for remaining tables ───────────────────────────────

-- restaurants: read-only for public
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'restaurants' AND policyname = 'Public read restaurants'
    ) THEN
        CREATE POLICY "Public read restaurants" ON restaurants
            FOR SELECT USING (true);
    END IF;
END
$$;

-- bots: read + update for public (status changes)
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'bots' AND policyname = 'Public read bots'
    ) THEN
        CREATE POLICY "Public read bots" ON bots
            FOR SELECT USING (true);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'bots' AND policyname = 'Public update bots'
    ) THEN
        CREATE POLICY "Public update bots" ON bots
            FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- menu_items: already has RLS policies from seed, just enable
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'menu_items' AND policyname = 'Public read menu'
    ) THEN
        CREATE POLICY "Public read menu" ON menu_items
            FOR SELECT USING (true);
    END IF;
END
$$;


-- ============================================================
--  DONE! All tables now have:
--   ✅ restaurant_info table with default data
--   ✅ Performance indexes on orders & customers
--   ✅ RLS policies allowing public read/write for demo
-- ============================================================
