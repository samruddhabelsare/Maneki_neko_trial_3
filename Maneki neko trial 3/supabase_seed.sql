-- ============================================================
--  Maneki Neko Smart Restaurant — Supabase Seed
--  Run this in Supabase SQL Editor (Dashboard > SQL Editor)
--  Drops and recreates all tables, then inserts seed data.
-- ============================================================

-- ── Drop existing tables (cascade removes FKs) ────────────────────────────
DROP TABLE IF EXISTS conversation_logs CASCADE;
DROP TABLE IF EXISTS feedback         CASCADE;
DROP TABLE IF EXISTS orders           CASCADE;
DROP TABLE IF EXISTS customers        CASCADE;
DROP TABLE IF EXISTS menu_items       CASCADE;
DROP TABLE IF EXISTS bots             CASCADE;
DROP TABLE IF EXISTS restaurants      CASCADE;

-- ── Enable UUID extension ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── restaurants ───────────────────────────────────────────────────────────
CREATE TABLE restaurants (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    address    TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── bots ──────────────────────────────────────────────────────────────────
CREATE TABLE bots (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id  UUID REFERENCES restaurants(id),
    name           TEXT NOT NULL,
    character_mode TEXT NOT NULL,
    status         TEXT DEFAULT 'offline' CHECK (status IN ('online','offline','charging')),
    battery        INT  DEFAULT 100,
    temperature    INT  DEFAULT 36,
    table_number   INT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── menu_items ────────────────────────────────────────────────────────────
CREATE TABLE menu_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id),
    name         TEXT    NOT NULL,
    category     TEXT    NOT NULL,
    price        NUMERIC(6,2) NOT NULL,
    is_veg       BOOLEAN DEFAULT FALSE,
    is_spicy     BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    allergens    TEXT[]  DEFAULT '{}',
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── customers ─────────────────────────────────────────────────────────────
CREATE TABLE customers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id),
    name          TEXT NOT NULL,
    phone         TEXT,
    visit_count   INT  DEFAULT 1,
    preferences   TEXT[],
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── orders ────────────────────────────────────────────────────────────────
CREATE TABLE orders (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id  UUID REFERENCES restaurants(id),
    customer_id    UUID REFERENCES customers(id),
    table_number   INT  NOT NULL,
    items          JSONB NOT NULL DEFAULT '[]',
    total_amount   NUMERIC(8,2) NOT NULL DEFAULT 0,
    status         TEXT DEFAULT 'pending' CHECK (status IN ('pending','preparing','ready','delivered','billed')),
    payment_method TEXT DEFAULT 'cash',
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── feedback ──────────────────────────────────────────────────────────────
CREATE TABLE feedback (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id   UUID REFERENCES orders(id),
    rating     INT  CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── conversation_logs ─────────────────────────────────────────────────────
CREATE TABLE conversation_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id     UUID REFERENCES bots(id),
    order_id   UUID REFERENCES orders(id),
    role       TEXT CHECK (role IN ('user', 'bot')),
    message    TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═════════════════════════════════════════════════════════════════════════

-- ── Restaurant ────────────────────────────────────────────────────────────
INSERT INTO restaurants (id, name, address) VALUES
(
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Maneki Neko Tokyo',
    '12 Sakura Lane, Shinjuku, Tokyo'
);

-- ── Bots ──────────────────────────────────────────────────────────────────
INSERT INTO bots (restaurant_id, name, character_mode, status, battery, temperature, table_number) VALUES
('aaaaaaaa-0000-0000-0000-000000000001', 'Naru-Bot',    'Naruto',   'online',    92, 42, 1),
('aaaaaaaa-0000-0000-0000-000000000001', 'Goku-Bot',    'Goku',     'online',    78, 55, 3),
('aaaaaaaa-0000-0000-0000-000000000001', 'Dora-Bot',    'Doraemon', 'online',    65, 60, 5),
('aaaaaaaa-0000-0000-0000-000000000001', 'Shin-Bot',    'Shinchan', 'offline',   15, 78, 7),
('aaaaaaaa-0000-0000-0000-000000000001', 'Luffy-Bot',   'Luffy',    'charging',  45, 48, 9);

-- ── Menu Items ────────────────────────────────────────────────────────────
INSERT INTO menu_items (restaurant_id, name, category, price, is_veg, is_spicy, is_available, allergens) VALUES
('aaaaaaaa-0000-0000-0000-000000000001', 'Salmon Sashimi',       'Sushi',    18.99, FALSE, FALSE, TRUE,  '{"fish"}'),
('aaaaaaaa-0000-0000-0000-000000000001', 'Veggie Maki Roll',     'Sushi',    12.50, TRUE,  FALSE, TRUE,  '{"gluten","sesame"}'),
('aaaaaaaa-0000-0000-0000-000000000001', 'Spicy Tuna Nigiri',    'Sushi',    16.00, FALSE, TRUE,  TRUE,  '{"fish"}'),
('aaaaaaaa-0000-0000-0000-000000000001', 'Tonkotsu Ramen',       'Ramen',    14.99, FALSE, FALSE, TRUE,  '{"pork","gluten"}'),
('aaaaaaaa-0000-0000-0000-000000000001', 'Shoyu Ramen',          'Ramen',    13.50, FALSE, FALSE, TRUE,  '{"gluten","soy"}'),
('aaaaaaaa-0000-0000-0000-000000000001', 'Veg Miso Ramen',       'Ramen',    12.00, TRUE,  TRUE,  TRUE,  '{"gluten","soy"}'),
('aaaaaaaa-0000-0000-0000-000000000001', 'Edamame',              'Starters',  5.50, TRUE,  FALSE, TRUE,  '{"soy"}'),
('aaaaaaaa-0000-0000-0000-000000000001', 'Gyoza (Pork)',         'Starters',  8.99, FALSE, TRUE,  TRUE,  '{"gluten","pork"}'),
('aaaaaaaa-0000-0000-0000-000000000001', 'Matcha Latte',         'Drinks',    5.00, TRUE,  FALSE, TRUE,  '{"dairy"}'),
('aaaaaaaa-0000-0000-0000-000000000001', 'Ramune Soda',          'Drinks',    4.50, TRUE,  FALSE, TRUE,  '{}');

-- ── Customers ─────────────────────────────────────────────────────────────
INSERT INTO customers (id, restaurant_id, name, phone, visit_count, preferences) VALUES
('cccccccc-0001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Arjun Sharma',    '+91-98765-43210', 12, '{"Veg","Sushi"}'),
('cccccccc-0002-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Priya Patel',     '+91-90123-45678',  8, '{"Drinks","Starters"}'),
('cccccccc-0003-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Rohit Mehta',     '+91-88765-12345',  3, '{"Ramen"}'),
('cccccccc-0004-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Sneha Kapoor',    '+91-77654-09876',  7, '{"Spicy","Ramen"}'),
('cccccccc-0005-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Vikram Nair',     '+91-86543-21098',  1, '{"Sushi"}');

-- ── Orders (spread across today at different hours) ───────────────────────
-- We use NOW() - INTERVAL to simulate orders during the day
INSERT INTO orders (id, restaurant_id, customer_id, table_number, items, total_amount, status, payment_method, created_at) VALUES
(
    'eeeeeeee-0001-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0001-0000-0000-000000000001',
    1,
    '[{"name":"Salmon Sashimi","qty":1,"price":18.99},{"name":"Matcha Latte","qty":2,"price":5.00}]',
    28.99, 'delivered', 'card',
    NOW() - INTERVAL '9 hours'
),
(
    'eeeeeeee-0002-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0002-0000-0000-000000000001',
    3,
    '[{"name":"Veggie Maki Roll","qty":2,"price":12.50},{"name":"Edamame","qty":1,"price":5.50}]',
    30.50, 'billed', 'cash',
    NOW() - INTERVAL '7 hours'
),
(
    'eeeeeeee-0003-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0003-0000-0000-000000000001',
    5,
    '[{"name":"Tonkotsu Ramen","qty":1,"price":14.99},{"name":"Gyoza (Pork)","qty":2,"price":8.99}]',
    32.97, 'delivered', 'upi',
    NOW() - INTERVAL '5 hours'
),
(
    'eeeeeeee-0004-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0004-0000-0000-000000000001',
    7,
    '[{"name":"Spicy Tuna Nigiri","qty":2,"price":16.00},{"name":"Ramune Soda","qty":1,"price":4.50}]',
    36.50, 'ready', 'card',
    NOW() - INTERVAL '3 hours'
),
(
    'eeeeeeee-0005-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0005-0000-0000-000000000001',
    9,
    '[{"name":"Veg Miso Ramen","qty":1,"price":12.00},{"name":"Edamame","qty":1,"price":5.50}]',
    17.50, 'preparing', 'cash',
    NOW() - INTERVAL '2 hours'
),
(
    'eeeeeeee-0006-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0001-0000-0000-000000000001',
    2,
    '[{"name":"Shoyu Ramen","qty":2,"price":13.50},{"name":"Matcha Latte","qty":1,"price":5.00}]',
    32.00, 'pending', 'card',
    NOW() - INTERVAL '1 hour'
),
(
    'eeeeeeee-0007-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0002-0000-0000-000000000001',
    4,
    '[{"name":"Salmon Sashimi","qty":2,"price":18.99},{"name":"Gyoza (Pork)","qty":1,"price":8.99}]',
    46.97, 'pending', 'upi',
    NOW() - INTERVAL '30 minutes'
),
(
    'eeeeeeee-0008-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0003-0000-0000-000000000001',
    6,
    '[{"name":"Veggie Maki Roll","qty":3,"price":12.50},{"name":"Ramune Soda","qty":2,"price":4.50}]',
    46.50, 'preparing', 'cash',
    NOW() - INTERVAL '15 minutes'
);

-- ── Feedback ──────────────────────────────────────────────────────────────
INSERT INTO feedback (order_id, rating, comment, created_at) VALUES
('eeeeeeee-0001-0000-0000-000000000001', 5, 'Absolutely loved the salmon sashimi! The robot was adorable and funny.', NOW() - INTERVAL '8 hours'),
('eeeeeeee-0002-0000-0000-000000000001', 4, 'Great veg options. Bot kept cracking Shinchan jokes — we loved it!', NOW() - INTERVAL '6 hours'),
('eeeeeeee-0003-0000-0000-000000000001', 5, 'Tonkotsu ramen was perfect. The broth was rich and warm. 10/10!', NOW() - INTERVAL '4 hours'),
('eeeeeeee-0004-0000-0000-000000000001', 3, 'Food was good but spicy level was a bit much for us. Bot was great though.', NOW() - INTERVAL '2 hours'),
('eeeeeeee-0005-0000-0000-000000000001', 4, 'Loved the experience! Miso ramen was excellent. Will come back.', NOW() - INTERVAL '1 hour');

-- ── Conversation Logs ─────────────────────────────────────────────────────
INSERT INTO conversation_logs (bot_id, order_id, role, message, created_at)
SELECT
    b.id,
    'eeeeeeee-0001-0000-0000-000000000001',
    r.role,
    r.message,
    NOW() - r.offset_interval
FROM bots b
CROSS JOIN (VALUES
    ('user', 'Hi! What do you recommend today?',                                  INTERVAL '9 hours 10 minutes'),
    ('bot',  'Believe it! Our Salmon Sashimi is top-tier today, dattebayo! 🍣',   INTERVAL '9 hours 9 minutes'),
    ('user', 'I will take 1 Salmon Sashimi and 2 Matcha Lattes please.',          INTERVAL '9 hours 8 minutes'),
    ('bot',  'Order placed! Naru-Bot is on it! Your total is $28.99.',            INTERVAL '9 hours 7 minutes'),
    ('user', 'How long will it take?',                                            INTERVAL '9 hours 6 minutes'),
    ('bot',  'About 10 minutes! I never go back on my word — Ninja Way! 🥷',     INTERVAL '9 hours 5 minutes'),
    ('user', 'Can I get extra wasabi?',                                           INTERVAL '9 hours 4 minutes'),
    ('bot',  'Of course! Extra wasabi incoming! Power level: 9000! 💪',          INTERVAL '9 hours 3 minutes'),
    ('user', 'Thank you! Food was amazing.',                                      INTERVAL '8 hours 15 minutes'),
    ('bot',  'Thank you for visiting Maneki Neko! Come again, dattebayo! 🐱',    INTERVAL '8 hours 14 minutes')
) AS r(role, message, offset_interval)
WHERE b.name = 'Naru-Bot'
LIMIT 10;

-- ── RLS Policies ────────────────────────────────────────────────────────
-- Allow public access for menu items demo
CREATE POLICY "Public update menu" ON menu_items
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public insert menu" ON menu_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public delete menu" ON menu_items
    FOR DELETE USING (true);
