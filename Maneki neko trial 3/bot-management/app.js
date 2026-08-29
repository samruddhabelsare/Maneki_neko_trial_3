// /bot-management/app.js — Maneki Neko Bot Management Panel
// Standard script (no import/export). All logic in DOMContentLoaded.

document.addEventListener('DOMContentLoaded', () => {

    // ── State ──────────────────────────────────────────────────────────────
    const state = {
        bots: [],
        selectedLogBotId: null,
        autoRefresh: true,
        logInterval: null,
        healthInterval: null
    };

    // ── Restaurant context (set after auth) ────────────────────────────────
    let restaurantId = null;

    // ── Character definitions ──────────────────────────────────────────────
    const CHARACTERS = [
        { value: 'Naruto',   label: 'Naruto \uD83C\uDF65',   css: 'char-naruto' },
        { value: 'Goku',     label: 'Goku \uD83D\uDC09',     css: 'char-goku' },
        { value: 'Doraemon', label: 'Doraemon \uD83D\uDD14', css: 'char-doraemon' },
        { value: 'Shinchan', label: 'Shinchan \uD83D\uDE1C', css: 'char-shinchan' },
        { value: 'Luffy',    label: 'Luffy \u2620\uFE0F',    css: 'char-luffy' }
    ];

    const CHARACTER_OPTIONS_HTML = CHARACTERS.map(c =>
        `<option value="${c.value}">${c.label}</option>`
    ).join('');

    // ── Helpers ────────────────────────────────────────────────────────────
    function getCharCss(mode) {
        const c = CHARACTERS.find(c => c.value === mode);
        return c ? c.css : '';
    }

    function getCharLabel(mode) {
        const c = CHARACTERS.find(c => c.value === mode);
        return c ? c.label : (mode || '\u2014');
    }

    function getBatteryColor(pct) {
        if (pct > 50) return '#00e676';
        if (pct > 20) return '#ffa600';
        return '#ff4444';
    }

    function getStatusDotClass(status) {
        if (status === 'online')   return 'green';
        if (status === 'offline')  return 'red';
        if (status === 'charging') return 'yellow';
        return 'grey';
    }

    function formatTime(iso) {
        if (!iso) return '\u2014';
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function formatDateTime(iso) {
        if (!iso) return '\u2014';
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function isCritical(bot) {
        return bot.status === 'offline' || (bot.battery ?? 100) < 20 || (bot.temperature ?? 0) > 70;
    }

    // ── Live Clock ─────────────────────────────────────────────────────────
    function startClock() {
        const el = document.getElementById('liveClock');
        function tick() {
            const now = new Date();
            if (el) el.textContent = [
                String(now.getHours()).padStart(2, '0'),
                String(now.getMinutes()).padStart(2, '0'),
                String(now.getSeconds()).padStart(2, '0')
            ].join(':');
        }
        tick();
        setInterval(tick, 1000);
    }

    // ── Tab Switching ──────────────────────────────────────────────────────
    function showTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active-tab'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

        const target = document.getElementById(`tab-${tabId}`);
        if (target) target.classList.add('active-tab');
        const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (btn) btn.classList.add('active');

        // Per-tab actions
        if (tabId === 'live-logs') {
            populateLogBotSelect();
            if (state.selectedLogBotId) loadLogs(state.selectedLogBotId);
            startLogPolling();
        } else {
            stopLogPolling();
        }

        if (tabId === 'character-control') renderCharacterTable();
        if (tabId === 'health-monitor')    renderHealthTable();
    }

    // ── Load Bots — filtered by restaurant ────────────────────────────────
    async function loadBots() {
        if (!restaurantId) return;
        const { data, error } = await window.supabaseClient
            .from('bots')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('table_number', { ascending: true });
        if (error) { console.error('loadBots error:', error.message); return; }
        state.bots = data || [];
        renderBotCards();
        updateBotCount();
        checkAlerts();
    }

    // ── Navbar: Bot Count ──────────────────────────────────────────────────
    function updateBotCount() {
        const total  = state.bots.length;
        const online = state.bots.filter(b => b.status === 'online').length;
        const el = document.getElementById('botCountDisplay');
        if (el) el.textContent = `${total} Bots | ${online} Online`;
    }

    // ── Navbar: Alert Bell ─────────────────────────────────────────────────
    function checkAlerts() {
        const hasAlert = state.bots.some(b => isCritical(b));
        const bell = document.getElementById('alertBell');
        if (bell) bell.classList.toggle('bell-alert', hasAlert);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TAB 1 — Overview: Bot Cards
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function renderBotCards() {
        const grid = document.getElementById('botCardsGrid');
        if (!grid) return;
        grid.innerHTML = '';

        if (state.bots.length === 0) {
            grid.innerHTML = `<div style="color:rgba(255,255,255,0.3);padding:3rem;text-align:center;grid-column:1/-1">No bots found \uD83E\uDD16</div>`;
            return;
        }

        state.bots.forEach(bot => {
            const card = createBotCard(bot);
            grid.appendChild(card);
        });
    }

    function createBotCard(bot) {
        const card = document.createElement('div');
        const cardStatus  = bot.status || 'offline';
        const battery     = bot.battery ?? 0;
        const temp        = bot.temperature ?? 0;
        const batColor    = getBatteryColor(battery);
        const dotClass    = getStatusDotClass(cardStatus);
        const charLabel   = getCharLabel(bot.character_mode);
        const charCss     = getCharCss(bot.character_mode);
        const tempHot     = temp > 70;
        const lastSeen    = formatTime(bot.created_at);

        card.className   = `bot-card ${cardStatus}`;
        card.id          = `botcard-${bot.id}`;

        // Build character select options with current mode pre-selected
        const charOpts = CHARACTERS.map(c =>
            `<option value="${c.value}" ${c.value === bot.character_mode ? 'selected' : ''}>${c.label}</option>`
        ).join('');

        card.innerHTML = `
            <div class="bot-card-header">
                <span class="bot-name">${bot.name || 'Bot'}</span>
                <span class="status-dot ${dotClass}"></span>
            </div>
            <div class="character-badge ${charCss}">${charLabel}</div>
            <div class="bot-table">Table ${bot.table_number || '\u2014'}</div>
            <div class="battery-bar-wrap">
                <div class="battery-bar-track">
                    <div class="battery-bar" style="width:${battery}%; background:${batColor};"></div>
                </div>
                <span>${battery}%</span>
            </div>
            <div class="temp-reading ${tempHot ? 'temp-hot' : ''}">\uD83C\uDF21\uFE0F ${temp}\u00B0C${tempHot ? ' \u26A0\uFE0F' : ''}</div>
            <div class="last-seen">Last seen: ${lastSeen}</div>
            <div class="bot-actions">
                <select class="character-select" data-bot-id="${bot.id}">
                    ${charOpts}
                </select>
                <div class="bot-btn-row">
                    <button class="btn-restart" data-bot-id="${bot.id}">\uD83D\uDD04 Restart</button>
                    <button class="btn-view-logs" data-bot-id="${bot.id}" data-bot-name="${bot.name}">\uD83D\uDCCB Logs</button>
                </div>
            </div>
        `;

        // Character select — immediate update
        card.querySelector('.character-select').addEventListener('change', async (e) => {
            const newMode = e.target.value;
            await window.updateBotStatus(bot.id, { character_mode: newMode });
            await loadBots();
        });

        // Restart button
        card.querySelector('.btn-restart').addEventListener('click', async () => {
            const btn = card.querySelector('.btn-restart');
            btn.classList.add('restarting');
            btn.textContent = '\u23F3 Restarting...';
            await window.updateBotStatus(bot.id, { status: 'offline' });
            await loadBots();
            setTimeout(async () => {
                await window.updateBotStatus(bot.id, { status: 'online', battery: 100 });
                await loadBots();
            }, 3000);
        });

        // View Logs button
        card.querySelector('.btn-view-logs').addEventListener('click', () => {
            state.selectedLogBotId = bot.id;
            showTab('live-logs');
        });

        return card;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TAB 2 — Live Logs
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function populateLogBotSelect() {
        const sel = document.getElementById('logBotSelect');
        if (!sel) return;
        const current = state.selectedLogBotId || sel.value;
        sel.innerHTML = '<option value="">-- Select a Bot --</option>' +
            state.bots.map(b =>
                `<option value="${b.id}" ${b.id === current ? 'selected' : ''}>${b.name}</option>`
            ).join('');
        if (current) sel.value = current;
    }

    async function loadLogs(botId) {
        const feed = document.getElementById('logFeed');
        if (!feed) return;
        if (!botId) {
            feed.innerHTML = `<div class="log-placeholder">Select a bot to view logs \uD83D\uDCCB</div>`;
            return;
        }

        const { data, error } = await window.supabaseClient
            .from('conversation_logs')
            .select('*')
            .eq('bot_id', botId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) { console.error('Log fetch error:', error.message); return; }

        const logs = (data || []).reverse(); // show oldest first

        if (logs.length === 0) {
            feed.innerHTML = `<div class="log-placeholder">No logs yet for this bot \uD83E\uDD16</div>`;
            return;
        }

        feed.innerHTML = logs.map(log => {
            const role    = log.role || 'user';
            const prefix  = role === 'bot' ? '\uD83D\uDC31 ' : '';
            return `
                <div class="log-entry ${role}">
                    <span class="log-time">${formatDateTime(log.created_at)}</span>
                    <span class="log-role ${role}">${role.toUpperCase()}</span>
                    <span class="log-message">${prefix}${log.message || ''}</span>
                </div>
            `;
        }).join('');

        // Auto-scroll to bottom
        feed.scrollTop = feed.scrollHeight;
    }

    function startLogPolling() {
        if (state.logInterval) return;
        state.logInterval = setInterval(() => {
            if (state.autoRefresh && state.selectedLogBotId) {
                loadLogs(state.selectedLogBotId);
            }
        }, 8000);
    }

    function stopLogPolling() {
        clearInterval(state.logInterval);
        state.logInterval = null;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TAB 3 — Character Control
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function renderCharacterTable() {
        const body = document.getElementById('characterTableBody');
        if (!body) return;
        body.innerHTML = '';

        if (state.bots.length === 0) {
            body.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:rgba(255,255,255,0.3)">No bots connected</td></tr>`;
            return;
        }

        state.bots.forEach(bot => {
            const row = document.createElement('tr');
            const charOpts = CHARACTERS.map(c =>
                `<option value="${c.value}" ${c.value === bot.character_mode ? 'selected' : ''}>${c.label}</option>`
            ).join('');
            const charCss   = getCharCss(bot.character_mode);
            const charLabel = getCharLabel(bot.character_mode);

            row.innerHTML = `
                <td><strong>${bot.name || '\u2014'}</strong></td>
                <td>T-${bot.table_number || '\u2014'}</td>
                <td><span class="character-badge ${charCss}" style="font-size:0.78rem;">${charLabel}</span></td>
                <td><select class="char-row-select">${charOpts}</select></td>
                <td><button class="btn-row-apply">Apply</button></td>
            `;

            const applyBtn = row.querySelector('.btn-row-apply');
            applyBtn.addEventListener('click', async () => {
                const newMode = row.querySelector('.char-row-select').value;
                applyBtn.textContent = '\u23F3...';
                applyBtn.disabled = true;
                await window.updateBotStatus(bot.id, { character_mode: newMode });
                applyBtn.classList.add('success');
                applyBtn.textContent = '\u2705 Done';
                applyBtn.disabled = false;
                await loadBots();
                setTimeout(() => {
                    applyBtn.classList.remove('success');
                    applyBtn.textContent = 'Apply';
                }, 2000);
            });

            body.appendChild(row);
        });
    }

    async function applyCharacterToAll(mode) {
        const msgEl = document.getElementById('applyAllMsg');
        const btn   = document.getElementById('applyAllBtn');
        if (btn) { btn.disabled = true; btn.textContent = '\u23F3 Applying...'; }

        await Promise.all(state.bots.map(b =>
            window.updateBotStatus(b.id, { character_mode: mode })
        ));

        await loadBots();
        renderCharacterTable();

        if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.textContent   = `\u2705 Applied ${getCharLabel(mode)} to all ${state.bots.length} bots!`;
            setTimeout(() => { msgEl.style.display = 'none'; }, 3000);
        }
        if (btn) { btn.disabled = false; btn.textContent = '\uD83C\uDFAD Apply to All'; }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TAB 4 — Health Monitor
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function renderHealthTable() {
        const body = document.getElementById('healthTableBody');
        if (!body) return;

        const total    = state.bots.length;
        const online   = state.bots.filter(b => b.status === 'online').length;
        const offline  = state.bots.filter(b => b.status === 'offline').length;
        const critical = state.bots.filter(b => isCritical(b)).length;

        const setText = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        setText('hTotal',    total);
        setText('hOnline',   online);
        setText('hOffline',  offline);
        setText('hCritical', critical);

        body.innerHTML = '';

        if (state.bots.length === 0) {
            body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:rgba(255,255,255,0.3)">No bots to display</td></tr>`;
            return;
        }

        state.bots.forEach(bot => {
            const crit    = isCritical(bot);
            const battery = bot.battery ?? 0;
            const temp    = bot.temperature ?? 0;
            const row     = document.createElement('tr');
            if (crit) row.classList.add('health-critical');

            row.innerHTML = `
                <td><strong>${bot.name || '\u2014'}</strong></td>
                <td>T-${bot.table_number || '\u2014'}</td>
                <td><span class="badge-status ${bot.status || 'offline'}">${bot.status || 'unknown'}</span></td>
                <td><span class="${battery < 20 ? 'text-danger' : ''}">\uD83D\uDD0B${battery}%</span></td>
                <td><span class="${temp > 70 ? 'text-danger' : temp > 55 ? 'text-warn' : ''}">\uD83C\uDF21\uFE0F${temp}\u00B0C</span></td>
                <td>${formatTime(bot.created_at)}</td>
                <td>${crit ? '<span class="text-danger">\u26A0\uFE0F Critical</span>' : '<span style="color:var(--success)">\u2705 Normal</span>'}</td>
            `;
            body.appendChild(row);
        });
    }

    function startHealthPolling() {
        if (state.healthInterval) return;
        state.healthInterval = setInterval(async () => {
            await loadBots();
            // Only re-render health table if it's the active tab
            const healthTab = document.getElementById('tab-health-monitor');
            if (healthTab && healthTab.classList.contains('active-tab')) {
                renderHealthTable();
            }
        }, 15000);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Bind static events
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function bindEvents() {
        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => showTab(btn.dataset.tab));
        });

        // Live Logs — bot selector
        document.getElementById('logBotSelect')?.addEventListener('change', (e) => {
            state.selectedLogBotId = e.target.value;
            loadLogs(state.selectedLogBotId);
        });

        // Live Logs — manual refresh
        document.getElementById('refreshLogs')?.addEventListener('click', () => {
            loadLogs(state.selectedLogBotId);
        });

        // Live Logs — auto-refresh toggle
        document.getElementById('autoRefreshToggle')?.addEventListener('click', (e) => {
            state.autoRefresh = !state.autoRefresh;
            e.target.textContent = state.autoRefresh ? '\u23F1 Auto ON' : '\u23F1 Auto OFF';
            e.target.classList.toggle('active-ctrl', state.autoRefresh);
        });

        // Character Control — Apply to All
        document.getElementById('applyAllBtn')?.addEventListener('click', () => {
            const mode = document.getElementById('globalCharacterSelect')?.value;
            if (mode) applyCharacterToAll(mode);
        });
    }

    // ── Init ───────────────────────────────────────────────────────────────
    async function init() {
        console.log('\uD83D\uDC31 Bot Control Center Loaded');

        // ── Auth guard: bot_manager role only ─────────────────────────────
        const session = window.RestaurantAuth.requireAuth(['bot_manager']);
        if (!session) return; // redirecting — RestaurantAuth handles navigation

        // Store restaurant context
        restaurantId = session.restaurantId;

        // Update navbar brand with restaurant name
        const brandEl = document.getElementById('botNavRestaurantName');
        if (brandEl) brandEl.textContent = `Bot Control \u2014 ${session.restaurantName}`;

        // Wire logout button
        document.getElementById('botLogoutBtn')
            ?.addEventListener('click', () => window.RestaurantAuth.logout());

        startClock();
        bindEvents();
        await loadBots();
        showTab('overview');
        startHealthPolling();
    }

    init();
});
