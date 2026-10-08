// shared/supabase.js
// Global script (no import/export). Loaded AFTER the Supabase CDN script.
// Attaches window.supabaseClient + all helper functions to window.

(function () {
    'use strict';

    const SUPABASE_URL  = 'https://znnznynkeamfxrscpnal.supabase.co';
    const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubnpueW5rZWFtZnhyc2NwbmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTAyOTEsImV4cCI6MjA4OTU4NjI5MX0.9PXGZLjQPpSOgstH9BL-VUEoqNnqUU8D7tDr0fCeDVQ';

    // ── Resolve createClient from the CDN bundle ─────────────────────────────
    // jsdelivr UMD build exposes: window.supabase = { createClient, ... }
    const _lib = window.supabase;

    if (!_lib) {
        console.error('[Maneki] ❌ window.supabase is undefined — CDN script may not have loaded yet or is blocked.');
    }

    // Handle both UMD shapes: window.supabase.createClient  OR  window.supabase() (unlikely but safe)
    const _createClient = (_lib && typeof _lib.createClient === 'function')
        ? _lib.createClient
        : (typeof _lib === 'function' ? _lib : null);

    if (!_createClient) {
        console.error('[Maneki] ❌ createClient not found on window.supabase. Bundle shape unexpected:', typeof _lib);
    }

    window.supabaseClient = _createClient ? _createClient(SUPABASE_URL, SUPABASE_ANON) : null;

    console.log(
        'Maneki Neko — Supabase Helper — v2.2.0',
        window.supabaseClient ? '✅ client ready' : '❌ CLIENT NULL — login will not work'
    );

    // ── Menu ──────────────────────────────────────────────────────────────────
    window.getMenu = async (restaurantId) => {
        let query = window.supabaseClient.from('menu_items').select('*');
        if (restaurantId) query = query.eq('restaurant_id', restaurantId);
        return await query.order('category', { ascending: true });
    };

    // ── Orders ────────────────────────────────────────────────────────────────
    window.getOrders = async (status) =>
        (status && status !== 'all')
            ? await window.supabaseClient.from('orders').select('*').eq('status', status).order('created_at', { ascending: false })
            : await window.supabaseClient.from('orders').select('*').order('created_at', { ascending: false });

    window.createOrder = async (data) =>
        await window.supabaseClient.from('orders').insert([data]).select();

    window.updateOrderStatus = async (id, status) =>
        await window.supabaseClient.from('orders').update({ status }).eq('id', id);

    // ── Bots ──────────────────────────────────────────────────────────────────
    window.getBots = async () =>
        await window.supabaseClient.from('bots').select('*').order('table_number', { ascending: true });

    window.updateBotStatus = async (id, data) =>
        await window.supabaseClient.from('bots').update(data).eq('id', id);

    // ── Customers ─────────────────────────────────────────────────────────────
    window.getCustomers = async () =>
        await window.supabaseClient.from('customers').select('*').order('visit_count', { ascending: false });

    window.getCustomerByPhone = async (phone) =>
        await window.supabaseClient.from('customers').select('*').eq('phone', phone).maybeSingle();

    window.upsertCustomer = async (data) => {
        console.log('Maneki Neko — Manual Upsert for phone:', data.phone);
        // Manual Upsert: check for phone then update or insert to bypass UNIQUE constraint dependency
        const { data: existing, error: getError } = await window.supabaseClient.from('customers').select('*').eq('phone', data.phone).maybeSingle();

        if (getError) {
            console.error('Manual upsert lookup error:', getError);
        }

        if (existing) {
            console.log('Customer exists, updating ID:', existing.id);
            return await window.supabaseClient.from('customers').update(data).eq('id', existing.id).select();
        } else {
            console.log('New customer, inserting...');
            return await window.supabaseClient.from('customers').insert([data]).select();
        }
    };

    // ── Feedback ──────────────────────────────────────────────────────────────
    window.getFeedback = async () =>
        await window.supabaseClient.from('feedback').select('*').order('created_at', { ascending: false });

    window.submitFeedback = async (data) =>
        await window.supabaseClient.from('feedback').insert([data]);

    // ── Order History ─────────────────────────────────────────────────────────
    window.getCustomerOrders = async (customerId) => {
        if (!customerId) return { data: [], error: null };
        return await window.supabaseClient.from('orders').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
    };

    window.getCustomerOrdersById = async (customerId) =>
        await window.supabaseClient.from('orders').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });

    window.getRestaurantInfo = async function () {
        const { data, error } = await window.supabaseClient
            .from('restaurant_info')
            .select('value')
            .eq('key', 'restaurant_info')
            .single();
        if (error) return null;
        return data?.value || null;
    };

})();