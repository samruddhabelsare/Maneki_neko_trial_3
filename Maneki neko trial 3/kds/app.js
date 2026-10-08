// /kds/app.js — Maneki Neko Kitchen Display System
// Resilient dual-source architecture: Supabase Realtime + Direct DB Query + MCP Server fallback.
// Standard script (no import/export). All logic in DOMContentLoaded.

document.addEventListener('DOMContentLoaded', () => {

    // ── State ──────────────────────────────────────────────────────────────
    const state = {
        orders: [],
        knownOrderIds: new Set()
    };

    let isRefreshing = false;
    let realtimeChannel = null;

    // ── Restaurant context (set after auth) ────────────────────────────────
    let restaurantId = null;

    // ── Constants ──────────────────────────────────────────────────────────
    const COLUMNS = ['pending', 'preparing', 'ready'];
    const REFRESH_INTERVAL_MS = 4000;  // Polling heartbeat (backup to Realtime)
    const TIMER_UPDATE_MS     = 30000; // 30s timer label refresh
    const WARN_THRESHOLD_MINS = 15;

    const EMPTY_MESSAGES = {
        pending:   { icon: '🎉', text: 'No new orders' },
        preparing: { icon: '🍳', text: 'Nothing cooking yet' },
        ready:     { icon: '✅', text: 'Nothing ready yet' }
    };

    // ── Live Clock ─────────────────────────────────────────────────────────
    function startClock() {
        const el = document.getElementById('liveClock');
        function tick() {
            const now = new Date();
            const hh  = String(now.getHours()).padStart(2, '0');
            const mm  = String(now.getMinutes()).padStart(2, '0');
            const ss  = String(now.getSeconds()).padStart(2, '0');
            if (el) el.textContent = `${hh}:${mm}:${ss}`;
        }
        tick();
        setInterval(tick, 1000);
    }

    // ── MCP Server Config ──────────────────────────────────────────────────
    const MCP_BASE = 'https://mcp-server-for-maneki-neko.onrender.com';
    const ADMIN_API_KEY = window.ADMIN_API_KEY || localStorage.getItem('mneko_admin_key') || 'maneki-admin-secret-2026';

    // ── Audio Notification (Web Audio API chime, no external files) ─────────
    function playNewOrderChime() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const now = ctx.currentTime;

            // Tone 1
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(587.33, now); // D5
            gain1.gain.setValueAtTime(0.15, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.35);

            // Tone 2
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880, now + 0.18); // A5
            gain2.gain.setValueAtTime(0.18, now + 0.18);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.18);
            osc2.stop(now + 0.65);
        } catch (e) {
            // AudioContext might be blocked until user gesture, safely ignore
        }
    }

    // ── Update Connection Status Indicator ──────────────────────────────────
    function updateStatusIndicator(isOnline, label) {
        const dot = document.querySelector('.kds-status-dot');
        if (dot) {
            dot.style.background = isOnline ? 'var(--success)' : 'var(--danger)';
            dot.style.boxShadow = isOnline
                ? '0 0 10px rgba(16, 185, 129, 0.6)'
                : '0 0 10px rgba(239, 68, 68, 0.6)';
        }
    }

    // ── Resilient Order Fetcher (Supabase Direct + MCP fallback/enrich) ──────
    async function fetchActiveOrders() {
        const targetRestId = restaurantId || 'aaaaaaaa-0000-0000-0000-000000000001';
        let supaOrders = null;
        let mcpOrders = null;

        // 1. Primary Source: Direct Supabase query (fastest, guaranteed, real database)
        if (window.supabaseClient) {
            try {
                const { data, error } = await window.supabaseClient
                    .from('orders')
                    .select('*')
                    .eq('restaurant_id', targetRestId)
                    .in('status', COLUMNS)
                    .order('created_at', { ascending: true });

                if (!error && Array.isArray(data)) {
                    supaOrders = data;
                } else if (error) {
                    console.warn('[KDS] Supabase fetch error:', error.message);
                }
            } catch (err) {
                console.warn('[KDS] Supabase client exception:', err);
            }
        }

        // 2. Secondary Source: MCP Server (timeout 3.5s so slow Render cold-start never freezes KDS)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const res = await fetch(`${MCP_BASE}/admin/orders/active?restaurant_id=${encodeURIComponent(targetRestId)}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Key': ADMIN_API_KEY
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.orders)) {
                    mcpOrders = data.orders;
                }
            }
        } catch (err) {
            // MCP timeout or offline — completely normal if Render is idling
        }

        // 3. Harmonize data
        if (supaOrders && mcpOrders) {
            // Union orders from both sources by ID so neither is dropped
            const supaMap = new Map(supaOrders.map(o => [o.id, o]));
            const mcpMap = new Map(mcpOrders.map(o => [o.id, o]));
            const allIds = new Set([...supaMap.keys(), ...mcpMap.keys()]);
            const merged = [];

            for (const id of allIds) {
                const so = supaMap.get(id);
                const mo = mcpMap.get(id);
                if (so && mo) {
                    merged.push({ ...so, ...mo, status: mo.status || so.status });
                } else if (so) {
                    merged.push(so);
                } else if (mo) {
                    merged.push(mo);
                }
            }
            return merged.filter(o => COLUMNS.includes(o.status));
        }

        if (supaOrders) return supaOrders;
        if (mcpOrders) return mcpOrders;

        // If both failed, return null (DO NOT return [] to avoid wiping out current state)
        return null;
    }

    // ── Realtime Setup via Supabase ─────────────────────────────────────────
    function initRealtime() {
        if (!window.supabaseClient) return;

        try {
            const targetRestId = restaurantId || 'aaaaaaaa-0000-0000-0000-000000000001';

            if (realtimeChannel) {
                window.supabaseClient.removeChannel(realtimeChannel);
            }

            realtimeChannel = window.supabaseClient
                .channel('kds-orders-realtime')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'orders'
                    },
                    (payload) => {
                        const rec = payload.new || payload.old;
                        if (!rec || !rec.restaurant_id || rec.restaurant_id === targetRestId) {
                            console.log('[KDS Realtime] Order update detected:', payload.eventType);
                            autoRefresh();
                        }
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('[KDS Realtime] Subscribed to orders successfully');
                        updateStatusIndicator(true);
                    }
                });
        } catch (err) {
            console.warn('[KDS Realtime] Setup error:', err);
        }
    }

    // ── Initial Load ───────────────────────────────────────────────────────
    async function init() {
        // ── Auth guard: kds and admin roles permitted ──────────────────────
        const session = window.RestaurantAuth.requireAuth(['kds', 'admin']);
        if (!session) return; // redirecting

        restaurantId = session.restaurantId || 'aaaaaaaa-0000-0000-0000-000000000001';

        // Show restaurant name in header
        const nameEl = document.getElementById('kdsRestaurantName');
        if (nameEl) nameEl.textContent = session.restaurantName || 'Kitchen Display';

        // Show + wire logout button
        const logoutBtn = document.getElementById('kdsLogoutBtn');
        if (logoutBtn) {
            logoutBtn.style.display = '';
            logoutBtn.addEventListener('click', () => window.RestaurantAuth.logout());
        }

        startClock();

        // Initial fetch
        const orders = await fetchActiveOrders();
        if (orders !== null) {
            state.orders = orders;
            orders.forEach(o => state.knownOrderIds.add(o.id));
            renderAllColumns();
            updateStatusIndicator(true);
        }

        // Initialize Supabase Realtime channel
        initRealtime();

        // Polling fallback every 4 seconds
        setInterval(autoRefresh, REFRESH_INTERVAL_MS);

        // Update timer labels every 30 seconds
        setInterval(updateAllTimers, TIMER_UPDATE_MS);

        // Manual refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                refreshBtn.style.opacity = '0.5';
                autoRefresh().finally(() => {
                    setTimeout(() => { refreshBtn.style.opacity = '1'; }, 300);
                });
            });
        }
    }

    // ── Auto Refresh ───────────────────────────────────────────────────────
    async function autoRefresh() {
        if (isRefreshing) return;
        isRefreshing = true;

        try {
            const freshOrders = await fetchActiveOrders();

            // If fetch failed completely, preserve current state and mark warning
            if (freshOrders === null) {
                updateStatusIndicator(false);
                return;
            }

            updateStatusIndicator(true);

            // Detect brand-new order IDs
            const newIds = freshOrders
                .map(o => o.id)
                .filter(id => !state.knownOrderIds.has(id));

            state.orders = freshOrders;
            freshOrders.forEach(o => state.knownOrderIds.add(o.id));

            renderAllColumns();

            // Flash newly arrived cards & play chime
            if (newIds.length > 0) {
                playNewOrderChime();
                newIds.forEach(id => flashNewCard(id));
            }
        } finally {
            isRefreshing = false;
        }
    }

    // ── Render All Columns ─────────────────────────────────────────────────
    function renderAllColumns() {
        COLUMNS.forEach(status => renderColumn(status));
        updateSummaryCounts();
    }

    function renderColumn(status) {
        const container = document.getElementById(`cards-${status}`);
        if (!container) return;

        container.innerHTML = '';

        const filtered = state.orders
            .filter(o => o.status === status)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        if (filtered.length === 0) {
            const msg = EMPTY_MESSAGES[status] || { icon: '—', text: 'Empty' };
            const empty = document.createElement('div');
            empty.className = 'col-empty';
            empty.innerHTML = `<span>${msg.icon}</span><p>${msg.text}</p>`;
            container.appendChild(empty);
            return;
        }

        filtered.forEach(order => {
            const card = createOrderCard(order);
            container.appendChild(card);
        });
    }

    // ── Create Order Card ──────────────────────────────────────────────────
    function createOrderCard(order) {
        const card = document.createElement('div');
        card.className = `order-card status-${order.status}`;
        card.id = `card-${order.id}`;

        const shortId = (order.id || '').slice(0, 8);

        // Safely parse items whether array or JSON string
        let rawItems = order.items;
        if (typeof rawItems === 'string') {
            try { rawItems = JSON.parse(rawItems); } catch(e) { rawItems = []; }
        }
        const items = Array.isArray(rawItems) ? rawItems : [];

        // ── Timer ────────────────────────────────────────────────────────
        const elapsedMins = getElapsedMinutes(order.created_at);
        const timerLabel  = formatElapsed(elapsedMins);
        const timerClass  = elapsedMins >= WARN_THRESHOLD_MINS ? 'timer timer-red' : 'timer';

        // ── Items HTML ───────────────────────────────────────────────────
        const itemsHtml = items.length === 0
            ? '<li><span class="item-name" style="color:rgba(255,255,255,0.3)">No items</span></li>'
            : items.map(i => {
                const isVeg = i.is_veg !== undefined ? Boolean(i.is_veg) : true;
                const instructionsHtml = i.instructions ? `<div class="item-instructions">"${i.instructions}"</div>` : '';
                return `
                  <li>
                    <div class="item-main">
                        <span class="item-qty">${i.qty || 1}×</span>
                        <span class="item-name">${i.name || '?'}</span>
                        <span class="veg-dot ${isVeg ? 'veg' : 'nonveg'}"></span>
                    </div>
                    ${instructionsHtml}
                  </li>
                `;
              }).join('');

        // ── Action Button ────────────────────────────────────────────────
        let btnLabel = '';
        let btnClass = 'action-btn';
        let nextStatus = null;

        if (order.status === 'pending') {
            btnLabel  = '▶ Start Preparing';
            btnClass += ' btn-start';
            nextStatus = 'preparing';
        } else if (order.status === 'preparing') {
            btnLabel  = '✅ Mark Ready';
            btnClass += ' btn-ready';
            nextStatus = 'ready';
        } else if (order.status === 'ready') {
            btnLabel  = '🍽 Serve & Complete';
            btnClass += ' btn-serve';
            nextStatus = 'delivered';
        }

        card.innerHTML = `
            <div class="card-top">
                <span class="table-badge">T-${order.table_number || '—'}</span>
                <span class="order-id">#${shortId}</span>
                <span class="${timerClass}" id="timer-${order.id}">${timerLabel}</span>
            </div>
            <ul class="items-list">
                ${itemsHtml}
            </ul>
            <div class="card-actions">
                ${order.status === 'pending' ? `<button class="action-btn btn-cancel" data-action="cancel">Cancel</button>` : ''}
                ${nextStatus !== null ? `<button class="${btnClass}" data-id="${order.id}" data-status="${order.status}" data-action="next">${btnLabel}</button>` : ''}
            </div>
        `;

        // ── Attach Button Events ─────────────────────────────────────────
        card.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                if (action === 'cancel') {
                    if (confirm('Are you sure you want to cancel this order?')) {
                        moveOrder(order.id, 'cancelled');
                    }
                } else if (action === 'next') {
                    btn.disabled = true;
                    btn.style.opacity = '0.7';
                    moveOrder(order.id, nextStatus);
                }
            });
        });

        return card;
    }

    // ── Move Order with Instant Optimistic UI + Dual Persistence ─────────────
    async function moveOrder(orderId, newStatus) {
        const orderIdx = state.orders.findIndex(o => o.id === orderId);
        if (orderIdx === -1) return;

        const previousStatus = state.orders[orderIdx].status;

        // 1. Instant Optimistic UI: Immediately move or remove card
        if (newStatus === 'delivered' || newStatus === 'cancelled') {
            state.orders.splice(orderIdx, 1);
        } else {
            state.orders[orderIdx].status = newStatus;
        }

        // Render changes immediately without waiting for server network responses
        renderAllColumns();

        // 2. Primary Persistence: Direct to Supabase (fast, guaranteed)
        let supaSuccess = false;
        if (window.supabaseClient) {
            try {
                const { error } = await window.supabaseClient
                    .from('orders')
                    .update({ status: newStatus })
                    .eq('id', orderId);

                if (!error) {
                    supaSuccess = true;
                } else {
                    console.error('[KDS] Supabase status update error:', error.message);
                }
            } catch (err) {
                console.error('[KDS] Supabase update exception:', err);
            }
        }

        // 3. Secondary Persistence: MCP Server PATCH (runs non-blocking with 5s timeout)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            let res = await fetch(`${MCP_BASE}/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Key': ADMIN_API_KEY
                },
                body: JSON.stringify({ status: newStatus }),
                signal: controller.signal
            }).catch(() => null);

            if (!res || !res.ok) {
                await fetch(`${MCP_BASE}/admin/orders/${orderId}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Key': ADMIN_API_KEY
                    },
                    body: JSON.stringify({ status: newStatus }),
                    signal: controller.signal
                }).catch(() => null);
            }
            clearTimeout(timeoutId);
        } catch (err) {
            console.warn('[KDS] MCP status PATCH non-blocking notice:', err.message);
        }

        // 4. Fallback recovery if totally disconnected
        if (!supaSuccess && !window.supabaseClient) {
            alert('Failed to update status. Please check network connection.');
            await autoRefresh();
        }
    }

    // ── Flash New Card ─────────────────────────────────────────────────────
    function flashNewCard(orderId) {
        setTimeout(() => {
            const card = document.getElementById(`card-${orderId}`);
            if (!card) return;
            card.classList.add('flash-new');
            setTimeout(() => card.classList.remove('flash-new'), 3000);
        }, 50);
    }

    // ── Update All Timer Spans ─────────────────────────────────────────────
    function updateAllTimers() {
        state.orders.forEach(order => {
            const timerEl = document.getElementById(`timer-${order.id}`);
            if (!timerEl) return;
            const mins = getElapsedMinutes(order.created_at);
            timerEl.textContent = formatElapsed(mins);
            if (mins >= WARN_THRESHOLD_MINS) {
                timerEl.classList.add('timer-red');
            } else {
                timerEl.classList.remove('timer-red');
            }
        });
    }

    // ── Update Summary Counts ──────────────────────────────────────────────
    function updateSummaryCounts() {
        ['pending', 'preparing', 'ready'].forEach(status => {
            const count = state.orders.filter(o => o.status === status).length;
            const el = document.getElementById(`count${capitalize(status)}`);
            if (el) el.textContent = count;
        });
    }

    // ── Helpers ────────────────────────────────────────────────────────────
    function getElapsedMinutes(isoString) {
        if (!isoString) return 0;
        const diff = Date.now() - new Date(isoString).getTime();
        return Math.floor(diff / 60000);
    }

    function formatElapsed(mins) {
        if (mins < 1)  return 'Just now';
        if (mins === 1) return '1 min ago';
        return `${mins} min ago`;
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ── Boot ────────────────────────────────────────────────────────────────
    init();
});
