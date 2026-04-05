// shared/supabase.js
// Global script (no import/export). Loaded AFTER the Supabase CDN script.
// Attaches client + all helper functions to window.

window.supabaseClient = window.supabase.createClient(
    'https://znnznynkeamfxrscpnal.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubnpueW5rZWFtZnhyc2NwbmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTAyOTEsImV4cCI6MjA4OTU4NjI5MX0.9PXGZLjQPpSOgstH9BL-VUEoqNnqUU8D7tDr0fCeDVQ'
);

// ─── INITIALIZATION ─────────────────────────────────────────────────────────
console.log('Maneki Neko — Supabase Helper — v2.1.0-manual-upsert loaded');

// ── Menu ──────────────────────────────────────────────────────────────────────
window.getMenu = async () =>
    await window.supabaseClient.from('menu_items').select('*').order('category', { ascending: true });

// ── Orders ────────────────────────────────────────────────────────────────────
window.getOrders = async (status) =>
    (status && status !== 'all')
        ? await window.supabaseClient.from('orders').select('*').eq('status', status).order('created_at', { ascending: false })
        : await window.supabaseClient.from('orders').select('*').order('created_at', { ascending: false });

window.createOrder = async (data) =>
    await window.supabaseClient.from('orders').insert([data]).select();

window.updateOrderStatus = async (id, status) =>
    await window.supabaseClient.from('orders').update({ status }).eq('id', id);

// ── Bots ──────────────────────────────────────────────────────────────────────
window.getBots = async () =>
    await window.supabaseClient.from('bots').select('*').order('table_number', { ascending: true });

window.updateBotStatus = async (id, data) =>
    await window.supabaseClient.from('bots').update(data).eq('id', id);

// ── Customers ─────────────────────────────────────────────────────────────────
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
        // Fallback to direct insert if it's a first time or error
    }

    if (existing) {
        console.log('Customer exists, updating ID:', existing.id);
        return await window.supabaseClient.from('customers').update(data).eq('id', existing.id).select();
    } else {
        console.log('New customer, inserting...');
        return await window.supabaseClient.from('customers').insert([data]).select();
    }
};

// ── Feedback ──────────────────────────────────────────────────────────────────
window.getFeedback = async () =>
    await window.supabaseClient.from('feedback').select('*').order('created_at', { ascending: false });

window.submitFeedback = async (data) =>
    await window.supabaseClient.from('feedback').insert([data]);

// ── Order History ─────────────────────────────────────────────────────────────
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
}