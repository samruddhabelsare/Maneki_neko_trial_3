// /kds/app.js — Maneki Neko Kitchen Display System
// Standard script (no import/export). All logic in DOMContentLoaded.

document.addEventListener('DOMContentLoaded', () => {

    // ── State ──────────────────────────────────────────────────────────────
    const state = {
        orders: [],
        knownOrderIds: new Set()
    };

    // ── Constants ──────────────────────────────────────────────────────────
    const COLUMNS = ['pending', 'preparing', 'ready'];
    const REFRESH_INTERVAL_MS  = 10000; // 10 s auto-refresh
    const TIMER_UPDATE_MS      = 60000; // 60 s timer label refresh
    const WARN_THRESHOLD_MINS  = 15;

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

    // ── Fetch Orders (pending / preparing / ready) ─────────────────────────
    async function fetchActiveOrders() {
        // Fetch all 3 statuses in parallel
        const [pendingRes, preparingRes, readyRes] = await Promise.all([
            window.getOrders('pending'),
            window.getOrders('preparing'),
            window.getOrders('ready')
        ]);
        const pending   = pendingRes?.data   || [];
        const preparing = preparingRes?.data || [];
        const ready     = readyRes?.data     || [];
        return [...pending, ...preparing, ...ready];
    }

    // ── Initial Load ───────────────────────────────────────────────────────
    async function init() {
        startClock();

        const orders = await fetchActiveOrders();
        state.orders = orders;
        orders.forEach(o => state.knownOrderIds.add(o.id));
        renderAllColumns();

        // Auto-refresh every 10 seconds
        setInterval(autoRefresh, REFRESH_INTERVAL_MS);

        // Update timer labels every 60 seconds
        setInterval(updateAllTimers, TIMER_UPDATE_MS);

        // Manual refresh button
        document.getElementById('refreshBtn')
            ?.addEventListener('click', () => autoRefresh());
    }

    // ── Auto Refresh ───────────────────────────────────────────────────────
    async function autoRefresh() {
        const freshOrders = await fetchActiveOrders();

        // Detect brand-new order IDs
        const newIds = freshOrders
            .map(o => o.id)
            .filter(id => !state.knownOrderIds.has(id));

        state.orders = freshOrders;
        freshOrders.forEach(o => state.knownOrderIds.add(o.id));

        renderAllColumns();

        // Flash newly arrived cards
        newIds.forEach(id => flashNewCard(id));
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
        const items   = Array.isArray(order.items) ? order.items : [];

        // ── Timer ────────────────────────────────────────────────────────
        const elapsedMins = getElapsedMinutes(order.created_at);
        const timerLabel  = formatElapsed(elapsedMins);
        const timerClass  = elapsedMins >= WARN_THRESHOLD_MINS ? 'timer timer-red' : 'timer';

        // ── Items HTML ───────────────────────────────────────────────────
        const itemsHtml = items.length === 0
            ? '<li><span class="item-name" style="color:rgba(255,255,255,0.3)">No items</span></li>'
            : items.map(i => {
                const isVeg = i.is_veg !== undefined ? i.is_veg : true; // default veg dot green
                return `
                  <li>
                    <span class="item-qty">${i.qty || 1}×</span>
                    <span class="item-name">${i.name || '?'}</span>
                    <span class="veg-dot ${isVeg ? 'veg' : 'nonveg'}"></span>
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
            ${nextStatus !== null ? `<button class="${btnClass}" data-id="${order.id}" data-status="${order.status}">${btnLabel}</button>` : ''}
        `;

        // ── Attach Button Event ───────────────────────────────────────────
        if (nextStatus !== null) {
            const btn = card.querySelector('.action-btn');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    moveOrder(order.id, nextStatus);
                });
            }
        }

        return card;
    }

    // ── Move Order ─────────────────────────────────────────────────────────
    async function moveOrder(orderId, newStatus) {
        // Optimistically remove from current column
        const card = document.getElementById(`card-${orderId}`);
        if (card) card.remove();

        // Update state immediately
        const idx = state.orders.findIndex(o => o.id === orderId);
        if (idx !== -1) state.orders[idx].status = newStatus;

        // Update summary counts
        updateSummaryCounts();

        // Persist to Supabase
        const result = await window.updateOrderStatus(orderId, newStatus);
        if (result.error) {
            console.error('Failed to update order status:', result.error.message);
        }

        // Re-fetch and re-render to ensure consistency
        await autoRefresh();
    }

    // ── Flash New Card ─────────────────────────────────────────────────────
    function flashNewCard(orderId) {
        // Card may not yet be in DOM immediately, wait one tick
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
