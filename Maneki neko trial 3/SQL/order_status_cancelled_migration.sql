-- ═══════════════════════════════════════════════════════════════════════════
-- Allow 'cancelled' as an order status
-- ---------------------------------------------------------------------------
-- The KDS "Cancel" action writes status = 'cancelled' and the admin Orders
-- page filters by it, but supabase_seed.sql only allowed
-- pending | preparing | ready | delivered | billed, so the update was rejected
-- by Postgres (the card vanished optimistically, then came back on the next
-- poll). Run this once in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders
    ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'billed', 'cancelled'));
