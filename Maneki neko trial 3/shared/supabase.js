// shared/supabase.js
// Global script (no import/export). Loaded AFTER the Supabase CDN script.
// Attaches client + all helper functions to window.

window.supabaseClient = window.supabase.createClient(
    'https://znnznynkeamfxrscpnal.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubnpueW5rZWFtZnhyc2NwbmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTAyOTEsImV4cCI6MjA4OTU4NjI5MX0.9PXGZLjQPpSOgstH9BL-VUEoqNnqUU8D7tDr0fCeDVQ'
);

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

// ── Feedback ──────────────────────────────────────────────────────────────────
window.getFeedback = async () =>
    await window.supabaseClient.from('feedback').select('*').order('created_at', { ascending: false });

window.submitFeedback = async (data) =>
    await window.supabaseClient.from('feedback').insert([data]);
