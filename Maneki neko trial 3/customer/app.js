// Standard script (no imports)

const state = {
    menu: [],
    cart: [],
    activeOrder: null,
    statusPollInterval: null,
    table: new URLSearchParams(window.location.search).get('table') || '1',
    bot: new URLSearchParams(window.location.search).get('bot') || '1',
    lastRating: 5
};

const app = {
    init() {
        console.log('🐱 Maneki Neko Customer Link Start');
        this.bindEvents();
        this.loadMenu();
        this.updateCartUI();
        
        // Initial UI state
        document.getElementById('tableNumber').innerText = state.table;
        document.getElementById('botBadge').innerText = `${state.bot} Mode`;
    },

    bindEvents() {
        // Welcome Start
        document.getElementById('startBtn').addEventListener('click', () => {
            document.getElementById('welcomeScreen').classList.add('hidden');
        });

        // Cart Toggle
        document.getElementById('cartBtn').addEventListener('click', () => {
            document.getElementById('cartSidebar').classList.add('open');
        });
        document.getElementById('closeCart').addEventListener('click', () => {
            document.getElementById('cartSidebar').classList.remove('open');
        });

        // Checkout
        document.getElementById('checkoutBtn').addEventListener('click', () => this.placeOrder());

        // Category Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.renderMenu(e.target.dataset.category);
            });
        });

        // Feedback
        document.querySelectorAll('.star').forEach(star => {
            star.addEventListener('click', (e) => {
                const val = parseInt(e.target.dataset.value);
                state.lastRating = val;
                document.querySelectorAll('.star').forEach(s => {
                    s.classList.toggle('active', parseInt(s.dataset.value) <= val);
                });
            });
        });

        document.getElementById('submitFeedback').addEventListener('click', () => this.submitFeedback());
    },

    async loadMenu() {
        const { data, error } = await window.getMenu();
        if (error) return;
        state.menu = data || [];
        this.renderMenu('all');
    },

    renderMenu(category) {
        const container = document.getElementById('menuGrid');
        const filtered = category === 'all' ? state.menu : state.menu.filter(m => m.category.toLowerCase() === category.toLowerCase());
        
        container.innerHTML = filtered.map(item => `
            <div class="glass-card menu-card">
                <div class="card-img-placeholder">🍜</div>
                <div class="card-content">
                    <div class="card-tags">
                        ${item.is_veg ? '<span class="tag veg">Veg</span>' : '<span class="tag non-veg">Non-Veg</span>'}
                        ${item.is_spicy ? '<span class="tag spicy">Spicy</span>' : ''}
                    </div>
                    <h3>${item.name}</h3>
                    <p class="price gold">$${item.price}</p>
                    <button class="btn-primary add-to-cart" data-id="${item.id}">Add to Cart</button>
                </div>
            </div>
        `).join('');

        // Attach dynamic events
        container.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', () => this.addToCart(btn.dataset.id));
        });
    },

    addToCart(id) {
        const item = state.menu.find(m => m.id === id);
        const existing = state.cart.find(c => c.id === id);
        if (existing) {
            existing.qty++;
        } else {
            state.cart.push({ ...item, qty: 1 });
        }
        this.updateCartUI();
        
        // Visual feedback
        const btn = document.querySelector(`.add-to-cart[data-id="${id}"]`);
        btn.innerText = 'Added! ✓';
        setTimeout(() => btn.innerText = 'Add to Cart', 1000);
    },

    updateCartUI() {
        const list = document.getElementById('cartItems');
        const count = document.getElementById('cartCount');
        const totalDisp = document.getElementById('cartTotal');

        count.innerText = state.cart.reduce((acc, c) => acc + c.qty, 0);
        
        list.innerHTML = state.cart.map(c => `
            <div class="cart-item">
                <div class="item-info">
                    <h4>${c.name}</h4>
                    <span class="gold">$${c.price} x ${c.qty}</span>
                </div>
                <div class="qty-controls">
                    <button onclick="app.changeQty('${c.id}', -1)">-</button>
                    <span>${c.qty}</span>
                    <button onclick="app.changeQty('${c.id}', 1)">+</button>
                </div>
            </div>
        `).join('');

        const total = state.cart.reduce((acc, c) => acc + (c.price * c.qty), 0);
        totalDisp.innerText = `$${total.toFixed(2)}`;
    },

    changeQty(id, delta) {
        const item = state.cart.find(c => c.id === id);
        if (item) {
            item.qty += delta;
            if (item.qty <= 0) {
                state.cart = state.cart.filter(c => c.id !== id);
            }
        }
        this.updateCartUI();
    },

    async placeOrder() {
        if (state.cart.length === 0) return;

        const total = state.cart.reduce((acc, c) => acc + (parseFloat(c.price) * c.qty), 0);
        const order = {
            table_number: parseInt(state.table),
            bot_id: null,
            items: state.cart.map(c => ({ id: c.id, name: c.name, qty: c.qty })),
            total_amount: total,
            status: 'pending'
        };

        const { data, error } = await window.createOrder(order);
        if (!error && data) {
            state.activeOrder = data[0];
            state.cart = [];
            this.updateCartUI();
            this.showStatusScreen();
        }
    },

    showStatusScreen() {
        document.getElementById('cartSidebar').classList.remove('open');
        document.getElementById('orderStatusScreen').classList.remove('hidden');
        this.startStatusPolling();
    },

    startStatusPolling() {
        state.statusPollInterval = setInterval(async () => {
            const { data } = await window.supabaseClient
                .from('orders')
                .select('status')
                .eq('id', state.activeOrder.id);
            
            if (data && data[0]) {
                const status = data[0].status;
                this.updateStatusUI(status);
                if (status === 'delivered') {
                    clearInterval(state.statusPollInterval);
                    setTimeout(() => document.getElementById('feedbackModal').classList.remove('hidden'), 2000);
                }
            }
        }, 5000);
    },

    updateStatusUI(status) {
        const steps = ['pending', 'preparing', 'ready', 'delivered'];
        const currentIdx = steps.indexOf(status);
        
        document.querySelectorAll('.step').forEach((step, idx) => {
            step.classList.toggle('active', idx <= currentIdx);
        });
    },

    async submitFeedback() {
        const comment = document.getElementById('feedbackComment').value;
        const feedbackData = {
            order_id: state.activeOrder.id,
            rating: state.lastRating || 5,
            comment: comment
        };

        const { error } = await window.submitFeedback(feedbackData);
        if (!error) {
            document.getElementById('feedbackModal').classList.add('hidden');
            alert('Arigato! Your feedback powers our bots.');
        }
    }
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
