// /admin/app.js — Maneki Neko Admin Dashboard
// Standard script (no import/export). Wrap everything in DOMContentLoaded.

document.addEventListener('DOMContentLoaded', () => {

    // ── State ──────────────────────────────────────────────────────────────
    const state = {
        currentSection: 'dashboard',
        menu: [],
        orders: [],
        customers: [],
        feedback: [],
        bots: [],
        currentMenuFilter: 'all',
        currentFeedbackFilter: 'all',
        dateRange: 'all', // all, 1d, 7d, 1m, custom
        customRange: { start: null, end: null }
    };

    // ── loadCategories() — standalone helper ────────────────────────────────
    async function loadCategories() {
        const { data, error } = await window.supabaseClient
            .from('menu_items')
            .select('category');
        if (error || !data) return [];
        return [...new Set(data.map(item => item.category))].filter(Boolean).sort();
    }

    // ── formatPhoneNumber Helper ──────────────────────────────────────────
    function formatPhoneNumberAdmin(phoneStr) {
        if (!phoneStr) return '—';
        let StringStr = String(phoneStr);
        let digits = StringStr.replace(/\D/g, '');
        if (digits.length === 12 && digits.startsWith('91')) {
            digits = digits.substring(2);
        }
        if (digits.length === 10) {
            return `+91-${digits.substring(0, 5)}-${digits.substring(5)}`;
        }
        return StringStr;
    }

    // ── App Object ─────────────────────────────────────────────────────────
    const app = {

        // ── Init ──────────────────────────────────────────────────────────
        async init() {
            console.log('🐱 Maneki Neko Admin OS Loaded');
            this.bindStaticEvents();
            this.showSection('dashboard');
        },

        // ── Bind static (always-present) events ───────────────────────────
        bindStaticEvents() {
            // Sidebar nav links
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showSection(e.currentTarget.dataset.section);
                });
            });

            // Mobile hamburger
            const hamburger = document.getElementById('mobileNavToggle');
            if (hamburger) {
                hamburger.addEventListener('click', () => {
                    document.getElementById('sidebar').classList.toggle('mobile-open');
                });
            }

            // Menu Manager — Add button, cancel, form submit
            document.getElementById('addItemBtn')
                ?.addEventListener('click', () => this.openMenuForm(null));
            document.getElementById('cancelForm')
                ?.addEventListener('click', () => this.closeMenuForm());
            document.getElementById('itemForm')
                ?.addEventListener('submit', (e) => this.handleMenuSubmit(e));

            // Order status filters
            document.getElementById('orderFilters')
                ?.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('filter-btn')) return;
                    this.setActiveFilter('orderFilters', e.target);
                    this.renderOrders(e.target.dataset.status);
                });

            // Customer search
            document.getElementById('customerSearch')
                ?.addEventListener('input', (e) => this.renderCustomers(e.target.value));

            // Feedback rating filters
            document.getElementById('feedbackFilters')
                ?.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('filter-btn')) return;
                    this.setActiveFilter('feedbackFilters', e.target);
                    state.currentFeedbackFilter = e.target.dataset.rating;
                    this.renderFeedbackCards();
                });

            // Global Date Filters
            document.querySelectorAll('.global-date-filters').forEach(group => {
                group.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('filter-btn')) return;
                    const range = e.target.dataset.range;
                    this.handleDateFilterChange(range);
                });
            });

            // Custom Date Apply
            document.querySelectorAll('.global-apply-date').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const customBox = e.target.closest('.global-custom-range');
                    const start = customBox.querySelector('.global-start-date').value;
                    const end = customBox.querySelector('.global-end-date').value;
                    if (!start || !end) return alert('Please select both start and end dates.');
                    state.customRange = { start, end };
                    
                    // Sync the date inputs across all custom boxes
                    document.querySelectorAll('.global-start-date').forEach(inp => inp.value = start);
                    document.querySelectorAll('.global-end-date').forEach(inp => inp.value = end);
                    
                    this.loadSectionData(state.currentSection);
                });
            });
        },

        handleDateFilterChange(range) {
            state.dateRange = range;
            
            // Sync active button across all global date filters
            document.querySelectorAll('.global-date-filters').forEach(group => {
                group.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                const activeBtn = group.querySelector(`.filter-btn[data-range="${range}"]`);
                if (activeBtn) activeBtn.classList.add('active');
            });

            const customBoxes = document.querySelectorAll('.global-custom-range');
            if (range === 'custom') {
                customBoxes.forEach(box => box.classList.remove('hidden'));
            } else {
                customBoxes.forEach(box => box.classList.add('hidden'));
                this.loadSectionData(state.currentSection);
            }
        },

        // Helper to get Supabase filter parameters
        _getDateQuery(query, table = 'orders') {
            const now = new Date();
            let start = null;

            if (state.dateRange === '1d') {
                start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
            } else if (state.dateRange === '7d') {
                start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            } else if (state.dateRange === '1m') {
                start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();
            } else if (state.dateRange === 'custom' && state.customRange.start && state.customRange.end) {
                const s = new Date(state.customRange.start);
                s.setHours(0, 0, 0, 0);
                const e = new Date(state.customRange.end);
                e.setHours(23, 59, 59, 999);
                return query.gte('created_at', s.toISOString()).lte('created_at', e.toISOString());
            }

            if (start) {
                return query.gte('created_at', start);
            }
            return query;
        },

        // ── Navigation ────────────────────────────────────────────────────
        showSection(sectionId) {
            state.currentSection = sectionId;

            document.querySelectorAll('.section').forEach(s => {
                s.classList.add('hidden');
                s.style.display = 'none';
            });

            const target = document.getElementById(sectionId);
            if (target) {
                target.classList.remove('hidden');
                target.style.display = 'block';
            }

            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            const activeLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
            if (activeLink) activeLink.classList.add('active');

            // Close mobile sidebar
            document.getElementById('sidebar')?.classList.remove('mobile-open');

            // Load section data every time it becomes active
            this.loadSectionData(sectionId);
        },

        async loadSectionData(id) {
            switch (id) {
                case 'dashboard':    await this.loadDashboard();     break;
                case 'menu-manager': await this.loadMenu();           break;
                case 'orders':       await this.loadOrdersPage();     break;
                case 'customers':    await this.loadCustomersPage();  break;
                case 'feedback':     await this.loadFeedbackPage();   break;
                case 'analytics':    await this.loadAnalyticsPage();  break;
            }
        },

        setActiveFilter(parentId, activeBtn) {
            document.querySelectorAll(`#${parentId} .filter-btn`)
                .forEach(b => b.classList.remove('active'));
            activeBtn.classList.add('active');
        },

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // DASHBOARD
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        async loadDashboard() {
            const [ordersRes, botsRes, feedbackRes] = await Promise.all([
                this._getDateQuery(window.supabaseClient.from('orders').select('*')).order('created_at', { ascending: false }),
                window.getBots(),
                this._getDateQuery(window.supabaseClient.from('feedback').select('*')).order('created_at', { ascending: false })
            ]);

            const orders   = ordersRes?.data   || [];
            const bots     = botsRes?.data     || [];
            const feedback = feedbackRes?.data || [];

            // Stats
            const totalOrders = orders.length;
            const revenue     = orders.reduce((acc, o) => acc + parseFloat(o.total_amount || 0), 0);
            const onlineBots  = bots.filter(b => b.status === 'online').length;
            const avgRating   = feedback.length
                ? (feedback.reduce((acc, f) => acc + (f.rating || 0), 0) / feedback.length)
                : 0;

            this._setText('stat-orders',  totalOrders);
            this._setText('stat-revenue', `₹${revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            this._setText('stat-bots',    onlineBots);
            this._setText('stat-rating',  avgRating.toFixed(1));

            // Recent Orders table (last 10)
            const ordersBody = document.getElementById('recentOrdersBody');
            if (ordersBody) {
                ordersBody.innerHTML = '';
                const recent = orders.slice(0, 10);
                if (recent.length === 0) {
                    ordersBody.innerHTML = `<tr><td colspan="5" class="empty-cell">No orders yet</td></tr>`;
                } else {
                    recent.forEach(o => {
                        const tr = document.createElement('tr');
                        const items = Array.isArray(o.items) ? o.items : [];
                        tr.innerHTML = `
                            <td>T-${o.table_number || '—'}</td>
                            <td>${items.length} item${items.length !== 1 ? 's' : ''}</td>
                            <td>₹${parseFloat(o.total_amount || 0).toFixed(2)}</td>
                            <td><span class="badge badge-${o.status}">${o.status}</span></td>
                            <td>${this._formatTime(o.created_at)}</td>
                        `;
                        ordersBody.appendChild(tr);
                    });
                }
            }

            // Bot Fleet list
            const botList = document.getElementById('botOverviewList');
            if (botList) {
                botList.innerHTML = '';
                if (bots.length === 0) {
                    botList.innerHTML = `<p class="text-secondary" style="padding:1rem;text-align:center">No bots connected</p>`;
                } else {
                    bots.forEach(b => {
                        const isOnline = b.status === 'online';
                        const div = document.createElement('div');
                        div.className = 'bot-item';
                        div.innerHTML = `
                            <div class="status-dot ${isOnline ? 'green' : 'grey'}"></div>
                            <div style="flex:1; overflow:hidden;">
                                <div class="bot-name">${b.name || 'Bot'}</div>
                                <div class="bot-meta">${b.character_mode || '—'} · 🔋${b.battery ?? '?'}%</div>
                            </div>
                            <div class="bot-table">T-${b.table_number || '—'}</div>
                        `;
                        botList.appendChild(div);
                    });
                }
            }
        },

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // MENU MANAGER
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        async loadMenu() {
            const categories = await loadCategories();

            // ── Rebuild category filter tabs dynamically ───────────────────
            const filterContainer = document.getElementById('menuFilters');
            if (filterContainer) {
                filterContainer.innerHTML =
                    `<button class="filter-btn active" data-filter="all">All</button>` +
                    categories.map(cat =>
                        `<button class="filter-btn" data-filter="${cat}">${cat}</button>`
                    ).join('');

                filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        filterContainer.querySelectorAll('.filter-btn')
                            .forEach(b => b.classList.remove('active'));
                        e.target.classList.add('active');
                        state.currentMenuFilter = e.target.dataset.filter;
                        this.renderMenuTable(state.currentMenuFilter);
                    });
                });
            }

            // ── Rebuild category select dropdown dynamically ──────────────
            const categorySelect = document.getElementById('itemCategory');
            if (categorySelect) {
                categorySelect.innerHTML =
                    categories.map(cat => `<option value="${cat}">${cat}</option>`).join('') +
                    `<option value="__new__">+ Add New Category</option>`;

                // Remove old listener by replacing the element clone
                const fresh = categorySelect.cloneNode(true);
                categorySelect.parentNode.replaceChild(fresh, categorySelect);
                fresh.addEventListener('change', () => {
                    if (fresh.value === '__new__') {
                        const newCat = prompt('Enter new category name:');
                        if (newCat && newCat.trim()) {
                            const opt = document.createElement('option');
                            opt.value = newCat.trim();
                            opt.textContent = newCat.trim();
                            fresh.insertBefore(opt, fresh.lastElementChild);
                            fresh.value = newCat.trim();
                        } else {
                            fresh.value = categories[0] || '';
                        }
                    }
                });
            }

            // ── Fetch and render menu items ───────────────────────────────
            const { data } = await window.getMenu();
            state.menu = data || [];
            state.currentMenuFilter = 'all';
            this.renderMenuTable('all');
        },

        renderMenuTable(filter = 'all') {
            const body = document.getElementById('menuTableBody');
            if (!body) return;

            // Keep state in sync with whatever was passed
            state.currentMenuFilter = filter;

            const filtered = filter === 'all'
                ? state.menu
                : state.menu.filter(item => item.category === filter);

            body.innerHTML = '';
            if (filtered.length === 0) {
                body.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center;
                            color:var(--text-secondary); padding:2rem">
                            No items in this category
                        </td>
                    </tr>`;
                return;
            }

            filtered.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.name}</td>
                    <td>${item.category}</td>
                    <td>₹${parseFloat(item.price || 0).toFixed(2)}</td>
                    <td>${item.is_veg ? '🟢 Veg' : '🔴 Non-Veg'}</td>
                    <td>${item.is_spicy ? '🌶️' : '—'}</td>
                    <td>
                        <label class="toggle-switch">
                            <input type="checkbox" class="visible-toggle"
                                ${item.is_available ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </td>
                    <td>
                        <button class="btn-edit filter-btn">✏️ Edit</button>
                        <button class="btn-delete filter-btn" style="color:var(--danger)">🗑️ Delete</button>
                    </td>
                `;
                tr.querySelector('.visible-toggle').addEventListener('change', (e) =>
                    this.toggleAvailability(item.id, e.target.checked));
                tr.querySelector('.btn-edit').addEventListener('click', () =>
                    this.openMenuForm(item));
                tr.querySelector('.btn-delete').addEventListener('click', () =>
                    this.deleteItem(item.id));
                body.appendChild(tr);
            });
        },

        openMenuForm(item) {
            const container = document.getElementById('menuItemForm');
            const title     = document.getElementById('formTitle');
            const form      = document.getElementById('itemForm');
            if (!container || !form) return;

            form.reset();
            document.getElementById('editItemId').value = '';

            if (item) {
                // Edit mode
                title.innerText = '✏️ Edit Menu Item';
                document.getElementById('editItemId').value      = item.id;
                document.getElementById('itemName').value         = item.name || '';
                document.getElementById('itemCategory').value     = item.category || '';
                document.getElementById('itemPrice').value        = item.price || '';
                document.getElementById('itemIsVeg').checked      = !!item.is_veg;
                document.getElementById('itemIsSpicy').checked    = !!item.is_spicy;
                document.getElementById('itemAllergens').value    = Array.isArray(item.allergens)
                    ? item.allergens.join(', ')
                    : (item.allergens || '');
            } else {
                title.innerText = '➕ Add New Item';
            }

            container.style.display = 'block';
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },

        closeMenuForm() {
            const container = document.getElementById('menuItemForm');
            if (container) container.style.display = 'none';
            document.getElementById('itemForm')?.reset();
            const editId = document.getElementById('editItemId');
            if (editId) editId.value = '';
        },

        async handleMenuSubmit(e) {
            e.preventDefault();

            const id  = document.getElementById('editItemId')?.value?.trim();
            const raw = document.getElementById('itemAllergens')?.value || '';

            // Get category — handle __new__ edge case
            let category = document.getElementById('itemCategory').value;
            if (category === '__new__') {
                alert('Please select a valid category.');
                return;
            }

            const item = {
                restaurant_id: 'aaaaaaaa-0000-0000-0000-000000000001',
                name:          document.getElementById('itemName').value.trim(),
                category:      category,
                price:         parseFloat(document.getElementById('itemPrice').value),
                is_veg:        document.getElementById('itemIsVeg').checked,
                is_spicy:      document.getElementById('itemIsSpicy').checked,
                allergens:     raw.split(',').map(a => a.trim()).filter(Boolean)
            };

            // Validate
            if (!item.name || isNaN(item.price)) {
                alert('Please fill in all required fields.');
                return;
            }

            let result;
            if (id) {
                // Update existing
                result = await window.supabaseClient
                    .from('menu_items')
                    .update(item)
                    .eq('id', id);
            } else {
                // Insert new
                item.is_available = true;
                result = await window.supabaseClient
                    .from('menu_items')
                    .insert([item]);
            }

            if (result.error) {
                console.error('Menu save error:', result.error.message);
                alert('Error saving item: ' + result.error.message);
                return;
            }

            this.closeMenuForm();
            await this.loadMenu();
        },

        async toggleAvailability(id, val) {
            const { error } = await window.supabaseClient
                .from('menu_items')
                .update({ is_available: val })
                .eq('id', id);
            if (error) {
                console.error('Toggle error:', error.message);
                alert('Could not update availability: ' + error.message);
            }
        },

        async deleteItem(id) {
            if (!confirm('❗ Delete this menu item? This cannot be undone.')) return;
            const { error } = await window.supabaseClient.from('menu_items').delete().eq('id', id);
            if (error) { console.error('Delete error:', error.message); return; }
            await this.loadMenu();
        },

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ORDERS
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        async loadOrdersPage() {
            const { data } = await this._getDateQuery(window.supabaseClient.from('orders').select('*')).order('created_at', { ascending: false });
            state.orders = data || [];
            this.renderOrders('all');
        },

        renderOrders(status) {
            const body = document.getElementById('fullOrdersBody');
            if (!body) return;

            const filtered = (status === 'all' || !status)
                ? state.orders
                : state.orders.filter(o => o.status === status);

            body.innerHTML = '';
            if (filtered.length === 0) {
                body.innerHTML = `<tr><td colspan="7" class="empty-cell">No orders found</td></tr>`;
                return;
            }

            filtered.forEach(o => {
                const items = Array.isArray(o.items) ? o.items : [];
                const mainTr = document.createElement('tr');
                mainTr.className = 'order-main-row';
                mainTr.innerHTML = `
                    <td>#${(o.id || '').slice(0, 8)}</td>
                    <td>T-${o.table_number || '—'}</td>
                    <td>${items.length} item${items.length !== 1 ? 's' : ''}</td>
                    <td>₹${parseFloat(o.total_amount || 0).toFixed(2)}</td>
                    <td><span class="badge badge-${o.status}">${o.status}</span></td>
                    <td>${o.payment_method || '—'}</td>
                    <td>${this._formatTime(o.created_at)}</td>
                `;

                // Expandable sub-row
                const expandTr = document.createElement('tr');
                expandTr.className = 'order-expand-row';
                const itemRows = items.length === 0
                    ? '<tr><td colspan="3" style="color:var(--text-muted)">No item details</td></tr>'
                    : items.map(i => {
                        const instr = i.instructions ? `<div class="item-instructions">"${i.instructions}"</div>` : '';
                        return `<tr><td>${i.name || '—'}${instr}</td><td>${i.qty || 1}</td><td>₹${parseFloat(i.price || 0).toFixed(2)}</td></tr>`;
                    }).join('');
                expandTr.innerHTML = `
                    <td colspan="7">
                        <table class="expand-mini-table">
                            <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
                            <tbody>${itemRows}</tbody>
                        </table>
                    </td>
                `;

                mainTr.addEventListener('click', () => {
                    expandTr.classList.toggle('open');
                });

                body.appendChild(mainTr);
                body.appendChild(expandTr);
            });
        },

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // CUSTOMERS
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        async loadCustomersPage() {
            const { data } = await window.getCustomers();
            state.customers = data || [];
            this.renderCustomers('');
        },

        renderCustomers(query) {
            const body = document.getElementById('customersBody');
            if (!body) return;
            const q = (query || '').toLowerCase();
            const filtered = state.customers.filter(c =>
                (c.name || '').toLowerCase().includes(q) ||
                (c.phone || '').includes(q) ||
                formatPhoneNumberAdmin(c.phone).includes(q)
            );

            body.innerHTML = '';
            if (filtered.length === 0) {
                body.innerHTML = `<tr><td colspan="5" class="empty-cell">No customers yet</td></tr>`;
                return;
            }
            filtered.forEach(c => {
                const tr = document.createElement('tr');
                const prefs = Array.isArray(c.preferences)
                    ? c.preferences.join(', ')
                    : (c.preferences || '—');
                tr.innerHTML = `
                    <td>${c.name || '—'}</td>
                    <td>${formatPhoneNumberAdmin(c.phone)}</td>
                    <td>${c.visit_count ?? 0}</td>
                    <td>${prefs}</td>
                    <td>${this._formatDate(c.created_at)}</td>
                `;
                body.appendChild(tr);
            });
        },

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // FEEDBACK
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        async loadFeedbackPage() {
            const { data } = await this._getDateQuery(window.supabaseClient.from('feedback').select('*')).order('created_at', { ascending: false });
            state.feedback = data || [];
            state.currentFeedbackFilter = 'all';
            this.setActiveFilter('feedbackFilters',
                document.querySelector('#feedbackFilters .filter-btn[data-rating="all"]'));
            this.renderFeedbackSummary();
            this.renderFeedbackCards();
        },

        renderFeedbackSummary() {
            const avgDisplay  = document.getElementById('avg-rating-display');
            const starsDisplay = document.getElementById('avg-stars-display');
            if (!avgDisplay) return;

            if (state.feedback.length === 0) {
                avgDisplay.innerText  = 'N/A';
                if (starsDisplay) starsDisplay.innerText = '';
                return;
            }
            const avg = state.feedback.reduce((a, f) => a + (f.rating || 0), 0) / state.feedback.length;
            avgDisplay.innerText = avg.toFixed(1);
            if (starsDisplay) starsDisplay.innerText = '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));
        },

        renderFeedbackCards() {
            const list = document.getElementById('feedbackList');
            if (!list) return;
            const filter = state.currentFeedbackFilter;
            const filtered = (filter === 'all')
                ? state.feedback
                : state.feedback.filter(f => String(f.rating) === String(filter));

            list.innerHTML = '';
            if (filtered.length === 0) {
                list.innerHTML = `<div class="text-secondary" style="text-align:center;padding:2rem;grid-column:1/-1">No feedback received yet</div>`;
                return;
            }
            filtered.forEach(f => {
                const rating = f.rating || 0;
                const div = document.createElement('div');
                div.className = 'feedback-card glass-card';
                div.innerHTML = `
                    <div class="stars">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</div>
                    <p class="feedback-comment">${f.comment || 'No comment provided.'}</p>
                    <div class="feedback-meta">Order #${(f.order_id || '').slice(0, 8)} · ${this._formatDate(f.created_at)}</div>
                `;
                list.appendChild(div);
            });
        },

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ANALYTICS
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        async loadAnalyticsPage() {
            const [ordersRes, feedbackRes] = await Promise.all([
                this._getDateQuery(window.supabaseClient.from('orders').select('*')).order('created_at', { ascending: false }),
                this._getDateQuery(window.supabaseClient.from('feedback').select('*')).order('created_at', { ascending: false })
            ]);
            const orders   = ordersRes?.data   || [];
            const feedback = feedbackRes?.data || [];

            this.renderPeakHours(orders);
            this.renderTopDishes(orders);
            this.renderRevenueWeek(orders);
            this.renderSatisfactionScore(feedback);
        },

        renderPeakHours(orders) {
            const chart = document.getElementById('peakHoursChart');
            if (!chart) return;

            if (orders.length === 0) {
                chart.innerHTML = new Array(12).fill(0)
                    .map(() => `<div class="bar" style="height:10%" data-val="0"></div>`)
                    .join('');
                return;
            }

            const hourCounts = new Array(24).fill(0);
            orders.forEach(o => {
                const h = new Date(o.created_at).getHours();
                hourCounts[h]++;
            });
            const slice  = hourCounts.slice(11, 23); // 11am–10pm
            const maxVal = Math.max(...slice, 1);

            chart.innerHTML = slice.map((count, i) => `
                <div class="bar"
                     style="height:${Math.max((count / maxVal) * 100, 4)}%"
                     data-val="${count}"></div>
            `).join('');
        },

        renderTopDishes(orders) {
            const list = document.getElementById('topDishesList');
            if (!list) return;

            if (orders.length === 0) {
                list.innerHTML = `<div class="text-secondary" style="text-align:center;padding:1rem">No data yet</div>`;
                return;
            }

            const dishCounts = {};
            orders.forEach(o => {
                const items = Array.isArray(o.items) ? o.items : [];
                items.forEach(i => {
                    dishCounts[i.name] = (dishCounts[i.name] || 0) + (i.qty || 1);
                });
            });

            const top5 = Object.entries(dishCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            if (top5.length === 0) {
                list.innerHTML = `<div class="text-secondary" style="text-align:center;padding:1rem">No data yet</div>`;
                return;
            }

            const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
            list.innerHTML = top5.map(([name, count], idx) => `
                <div class="dish-row">
                    <span class="dish-rank">${medals[idx] || idx + 1}</span>
                    <span style="flex:1">${name}</span>
                    <span class="dish-count">${count} sold</span>
                </div>
            `).join('');
        },

        renderRevenueWeek(orders) {
            const chart = document.getElementById('revenueChart');
            if (!chart) return;

            // Day 0=Sun..6=Sat → reorder Mon-Sun
            const dayRevenue = new Array(7).fill(0);
            orders.forEach(o => {
                const jsDay = new Date(o.created_at).getDay(); // 0=Sun
                dayRevenue[jsDay] += parseFloat(o.total_amount || 0);
            });
            // Reorder: Mon=1 ... Sun=0
            const monToSun = [1, 2, 3, 4, 5, 6, 0].map(d => dayRevenue[d]);
            const maxVal = Math.max(...monToSun, 1);

            chart.innerHTML = monToSun.map((rev, i) => `
                <div class="bar"
                     style="height:${Math.max((rev / maxVal) * 100, 4)}%"
                     data-val="₹${rev.toFixed(2)}"></div>
            `).join('');
        },

        renderSatisfactionScore(feedback) {
            const el = document.getElementById('satisfactionScore');
            if (!el) return;
            if (feedback.length === 0) { el.innerText = '—'; return; }
            const avg  = feedback.reduce((a, f) => a + (f.rating || 0), 0) / feedback.length;
            const pct  = Math.round((avg / 5) * 100);
            el.innerText = `${pct}%`;
        },

        // ── Helpers ────────────────────────────────────────────────────────
        _setText(id, value) {
            const el = document.getElementById(id);
            if (el) el.innerText = value;
        },

        _formatTime(iso) {
            if (!iso) return '—';
            const date = new Date(iso);
            const d = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            const t = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return d + ', ' + t;
        },

        _formatDate(iso) {
            if (!iso) return '—';
            return new Date(iso).toLocaleDateString();
        }
    };

    // ── Boot ────────────────────────────────────────────────────────────────
    app.init();
});
