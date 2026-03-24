// ═══════════════════════════════════════════════════════
//  Maneki Neko — Customer Ordering — app.js
//  No import/export. All globals attached to window.
// ═══════════════════════════════════════════════════════

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const NVIDIA_API_KEY = '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';
const NVIDIA_MODEL = 'meta/llama-3.3-70b-instruct';
// Wrap the NVIDIA endpoint in a free production CORS proxy because NVIDIA blocks direct browser POSTs
const NVIDIA_ENDPOINT = 'https://corsproxy.io/?https://integrate.api.nvidia.com/v1/chat/completions';
const RESTAURANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

// ─── STATE ────────────────────────────────────────────────────────────────────
const state = {
    table: 1,
    botId: null,
    character: 'Doraemon',
    menu: [],
    cart: [],
    aiOrderItems: [],
    orderId: null,
    chatHistory: [],
    isRecording: false,
    recognition: null,
    pollInterval: null,
    selectedRating: 0
};

// ─── CHARACTER CONFIG ─────────────────────────────────────────────────────────
const characterConfig = {
    Naruto: {
        prompt: 'You are Maneki Neko robot waiter speaking like Naruto. Say Dattebayo!, be energetic.',
        tagline: 'Believe it! Let\'s order! Dattebayo! 🍥',
        pitch: 1.2,
        rate: 1.3
    },
    Goku: {
        prompt: 'You are Maneki Neko robot waiter speaking like Goku. Be innocent, cheerful, love food.',
        tagline: 'Wow, the food here looks amazing! Let\'s eat! 🐉',
        pitch: 1.0,
        rate: 0.9
    },
    Doraemon: {
        prompt: 'You are Maneki Neko robot waiter speaking like Doraemon. Be helpful and polite.',
        tagline: 'I have the perfect dish for you! 🔔',
        pitch: 1.4,
        rate: 1.0
    },
    Shinchan: {
        prompt: 'You are Maneki Neko robot waiter speaking like Shinchan. Be funny and playful.',
        tagline: 'Hehe, ready to order something yummy? 😜',
        pitch: 0.8,
        rate: 1.1
    },
    Luffy: {
        prompt: 'You are Maneki Neko robot waiter speaking like Luffy. Treat ordering like a pirate adventure.',
        tagline: 'Shishishi! Let\'s find the greatest meal! ☠️',
        pitch: 1.1,
        rate: 1.2
    }
};

// ─── DOM CONTENT LOADED ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

    // --- URL Params ---
    var params = new URLSearchParams(window.location.search);
    var tableParam = params.get('table');
    var botParam = params.get('bot');
    var charParam = params.get('character');

    if (tableParam) state.table = parseInt(tableParam, 10) || 1;
    if (botParam) state.botId = botParam;
    if (charParam && characterConfig[charParam]) state.character = charParam;

    // --- Update Header ---
    document.getElementById('tableDisplay').textContent = 'Table ' + state.table;
    document.getElementById('characterBadge').textContent = '🤖 ' + state.character;

    // --- Welcome tagline ---
    document.getElementById('characterTagline').textContent =
        characterConfig[state.character].tagline;

    // --- Fetch menu from Supabase (graceful fallback) ---
    if (typeof window.getMenu === 'function') {
        window.getMenu().then(function (res) {
            if (res && res.data) state.menu = res.data;
        }).catch(function (err) {
            console.warn('Menu fetch error:', err);
        });
    } else {
        console.warn('window.getMenu not available — supabase.js may not have loaded.');
    }

    // --- Show welcome screen ---
    document.getElementById('welcomeScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';

    // --- Bind all events ---
    bindEvents();
});

// ─── BIND EVENTS ─────────────────────────────────────────────────────────────
function bindEvents() {

    // Start button
    document.getElementById('startBtn').addEventListener('click', function () {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        addInitialGreeting();
    });

    // Mode tabs
    document.querySelectorAll('.mode-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            switchMode(tab.getAttribute('data-mode'));
        });
    });

    // Send button
    document.getElementById('sendBtn').addEventListener('click', function () {
        sendMessage(document.getElementById('chatInput').value);
    });

    // Enter key in chat input
    document.getElementById('chatInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') sendMessage(document.getElementById('chatInput').value);
    });

    // Voice button
    document.getElementById('voiceBtn').addEventListener('click', toggleVoice);

    // AI order buttons
    document.getElementById('aiConfirmOrder').addEventListener('click', confirmAIOrder);
    document.getElementById('aiClearOrder').addEventListener('click', function () {
        state.aiOrderItems = [];
        updateAIOrderPanel([]);
    });

    // Cart toggle
    document.getElementById('cartToggleBtn').addEventListener('click', toggleCart);
    document.getElementById('cartCloseBtn').addEventListener('click', toggleCart);
    document.getElementById('cartBackdrop').addEventListener('click', toggleCart);

    // Place manual order
    document.getElementById('placeOrderBtn').addEventListener('click', placeManualOrder);

    // Payment done
    document.getElementById('paymentDoneBtn').addEventListener('click', markAsBilled);

    // Feedback
    document.getElementById('submitFeedbackBtn').addEventListener('click', submitFeedbackHandler);

    // Star rating
    document.querySelectorAll('.star').forEach(function (star) {
        star.addEventListener('click', function () {
            setRating(parseInt(star.getAttribute('data-value'), 10));
        });
    });
}

// ─── INITIAL GREETING ─────────────────────────────────────────────────────────
function addInitialGreeting() {
    var cfg = characterConfig[state.character];
    var text = 'Hello! ' + cfg.tagline + ' I\'m your AI waiter today! Ask me about the menu, get recommendations, or just tell me what you\'d like to order!';
    appendBotMessage(text);
    state.chatHistory.push({ role: 'assistant', content: text });
}

// ─── SWITCH MODE ─────────────────────────────────────────────────────────────
function switchMode(mode) {
    document.getElementById('mode-ai').style.display = mode === 'ai' ? 'block' : 'none';
    document.getElementById('mode-manual').style.display = mode === 'manual' ? 'block' : 'none';

    document.querySelectorAll('.mode-tab').forEach(function (tab) {
        tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
    });

    if (mode === 'manual') loadManualMenu();
}

// ─── APPEND MESSAGE HELPERS ───────────────────────────────────────────────────
function appendUserMessage(text) {
    var wrap = document.getElementById('chatMessages');
    var div = document.createElement('div');
    div.className = 'message user';
    div.innerHTML =
        '<div class="msg-bubble">' + escapeHtml(text) + '</div>' +
        '<span class="msg-role">👤</span>';
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
}

function appendBotMessage(text) {
    var wrap = document.getElementById('chatMessages');
    var div = document.createElement('div');
    div.className = 'message bot';
    div.innerHTML =
        '<span class="msg-role">🐱</span>' +
        '<div class="msg-bubble">' + escapeHtml(text) + '</div>';
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ─── STRIP ORDER_UPDATE FROM TEXT ────────────────────────────────────────────
function stripOrderUpdate(text) {
    return text.replace(/ORDER_UPDATE:\{[\s\S]*?\}/g, '').trim();
}

// ─── NVIDIA NON-STREAMING FALLBACK ───────────────────────────────────────────
// Used when streaming is unavailable (e.g. file:// origin, CORS blocked body).
async function callNvidiaAPIFallback(messages, onDone) {
    var response;
    try {
        response = await fetch(NVIDIA_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + NVIDIA_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: NVIDIA_MODEL,
                messages: messages,
                temperature: 0.2,
                top_p: 0.7,
                max_tokens: 1024,
                stream: false
            })
        });
    } catch (netErr) {
        console.error('[NVIDIA fallback] Network error:', netErr);
        appendBotMessage('⚠️ Network error: ' + (netErr.message || String(netErr)) + ' — Check browser console (F12) for details.');
        if (onDone) onDone('');
        return '';
    }

    if (!response.ok) {
        var errBody = '';
        try { errBody = await response.text(); } catch(e) {}
        console.error('[NVIDIA fallback] HTTP ' + response.status, errBody);
        appendBotMessage('⚠️ AI error (' + response.status + '): ' + (errBody.slice(0, 120) || 'Unknown error'));
        if (onDone) onDone('');
        return '';
    }

    var data;
    try { data = await response.json(); } catch(e) {
        appendBotMessage('⚠️ Could not parse AI response.');
        if (onDone) onDone('');
        return '';
    }

    var fullText = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';

    // Show as a normal bot message
    appendBotMessage(stripOrderUpdate(fullText) || '…');
    if (onDone) onDone(fullText);
    return fullText;
}

// ─── NVIDIA STREAMING API ─────────────────────────────────────────────────────
async function callNvidiaAPIStream(messages, onDone) {
    var response;
    try {
        response = await fetch(NVIDIA_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + NVIDIA_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: NVIDIA_MODEL,
                messages: messages,
                temperature: 0.2,
                top_p: 0.7,
                max_tokens: 1024,
                stream: true
            })
        });
    } catch (networkErr) {
        // Streaming blocked (CORS preflight failure, file:// origin, etc.)
        // Fall back to non-streaming automatically.
        console.warn('[NVIDIA stream] Fetch failed, trying non-streaming fallback. Error:', networkErr);
        return callNvidiaAPIFallback(messages, onDone);
    }

    if (!response.ok) {
        var errText = '';
        try { errText = await response.text(); } catch(e) {}
        console.error('[NVIDIA stream] HTTP ' + response.status, errText);
        appendBotMessage('⚠️ AI error (' + response.status + '): ' + (errText.slice(0, 120) || 'Unknown'));
        if (onDone) onDone('');
        return '';
    }

    // If response.body is null (opaque response — file:// or CORS issue), fall back
    if (!response.body) {
        console.warn('[NVIDIA stream] response.body is null — falling back to non-streaming.');
        return callNvidiaAPIFallback(messages, onDone);
    }

    // Create empty bot bubble with blinking cursor
    var chatMessages = document.getElementById('chatMessages');
    var botDiv = document.createElement('div');
    botDiv.className = 'message bot';
    botDiv.innerHTML = '<span class="msg-role">🐱</span><div class="msg-bubble" id="streamBubble">▋</div>';
    chatMessages.appendChild(botDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    var bubble = document.getElementById('streamBubble');
    var fullText = '';

    var reader = response.body.getReader();
    var decoder = new TextDecoder('utf-8');

    while (true) {
        var result = await reader.read();
        if (result.done) break;

        var chunk = decoder.decode(result.value, { stream: true });
        var lines = chunk.split('\n').filter(function (l) { return l.trim(); });

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (!line.startsWith('data: ')) continue;
            var jsonStr = line.replace('data: ', '').trim();
            if (jsonStr === '[DONE]') {
                // FIX: strip ORDER_UPDATE before displaying in bubble
                bubble.innerHTML = escapeHtml(stripOrderUpdate(fullText)) || '…';
                bubble.removeAttribute('id');
                if (onDone) onDone(fullText);
                return fullText;
            }
            try {
                var parsed = JSON.parse(jsonStr);
                var token = (parsed.choices &&
                    parsed.choices[0] &&
                    parsed.choices[0].delta &&
                    parsed.choices[0].delta.content) || '';
                if (token) {
                    fullText += token;
                    // Show cleaned text while streaming too
                    bubble.innerHTML =
                        escapeHtml(stripOrderUpdate(fullText)) +
                        '<span class="cursor">▋</span>';
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            } catch (e) {
                // skip malformed JSON chunks
            }
        }
    }

    // FIX: strip ORDER_UPDATE in fallback path too
    bubble.innerHTML = escapeHtml(stripOrderUpdate(fullText)) || '…';
    bubble.removeAttribute('id');
    if (onDone) onDone(fullText);
    return fullText;
}

// ─── SEND MESSAGE ─────────────────────────────────────────────────────────────
function sendMessage(text) {
    text = (text || '').trim();
    if (!text) return;

    appendUserMessage(text);
    state.chatHistory.push({ role: 'user', content: text });

    document.getElementById('chatInput').value = '';
    document.getElementById('chatInput').disabled = true;
    document.getElementById('sendBtn').disabled = true;

    var menuJson = JSON.stringify(state.menu.map(function (m) {
        return {
            id: m.id, name: m.name, category: m.category,
            price: m.price, is_veg: m.is_veg,
            is_spicy: m.is_spicy, is_available: m.is_available
        };
    }));
    var cartJson = JSON.stringify(state.aiOrderItems);

    var cfg = characterConfig[state.character];
    var systemPrompt =
        cfg.prompt +
        '\n\nYou are a waiter at Maneki Neko restaurant. Here is the current menu (JSON): ' + menuJson +
        '\n\nCurrent order so far (JSON): ' + cartJson +
        '\n\nWhen the user orders one or more items, at the VERY END of your reply (after your message) add EXACTLY this block (no extra whitespace, no markdown formatting around it):' +
        '\nORDER_UPDATE:{"items":[{"name":"Item Name","qty":1,"price":0.00}]}' +
        '\nOnly include items actually ordered or added in this message. Do not include the ORDER_UPDATE block if the user is just asking a question.';

    var messages = [{ role: 'system', content: systemPrompt }].concat(state.chatHistory);

    callNvidiaAPIStream(messages, function (fullText) {
        state.chatHistory.push({ role: 'assistant', content: fullText });

        // Extract ORDER_UPDATE
        var orderMatch = fullText.match(/ORDER_UPDATE:(\{[\s\S]*?\})/);
        if (orderMatch) {
            try {
                var orderData = JSON.parse(orderMatch[1]);
                if (orderData.items && Array.isArray(orderData.items)) {
                    updateAIOrderPanel(orderData.items);
                }
            } catch (e) {
                console.warn('ORDER_UPDATE parse error', e);
            }
        }

        // Speak reply (stripped)
        speakReply(stripOrderUpdate(fullText));

        document.getElementById('chatInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('chatInput').focus();
    });
}

// ─── UPDATE AI ORDER PANEL ────────────────────────────────────────────────────
function updateAIOrderPanel(newItems) {
    newItems.forEach(function (newItem) {
        var existing = state.aiOrderItems.find(function (it) {
            return it.name.toLowerCase() === newItem.name.toLowerCase();
        });
        if (existing) {
            existing.qty += (newItem.qty || 1);
        } else {
            state.aiOrderItems.push({
                name: newItem.name,
                qty: newItem.qty || 1,
                price: newItem.price || 0
            });
        }
    });

    var container = document.getElementById('aiOrderItems');
    var totalEl = document.getElementById('aiOrderTotal');

    if (state.aiOrderItems.length === 0) {
        container.innerHTML = '<p class="empty-hint">No items yet. Chat with me to order!</p>';
        totalEl.textContent = 'Total: ₹0.00';
        return;
    }

    container.innerHTML = '';
    var total = 0;

    state.aiOrderItems.forEach(function (item) {
        var subtotal = item.price * item.qty;
        total += subtotal;
        var row = document.createElement('div');
        row.className = 'order-item-row';
        row.innerHTML =
            '<span class="item-name">' + escapeHtml(item.name) + '</span>' +
            '<span class="item-qty">×' + item.qty + '</span>' +
            '<span class="item-price">₹' + subtotal.toFixed(2) + '</span>';
        container.appendChild(row);
    });

    totalEl.textContent = 'Total: ₹' + total.toFixed(2);
}

// ─── SPEAK REPLY ─────────────────────────────────────────────────────────────
function speakReply(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    var cfg = characterConfig[state.character];
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = cfg.pitch;
    utterance.rate = cfg.rate;
    utterance.lang = 'en-IN';
    window.speechSynthesis.speak(utterance);
}

// ─── VOICE INPUT ─────────────────────────────────────────────────────────────
function toggleVoice() {
    var voiceBtn = document.getElementById('voiceBtn');

    if (!state.isRecording) {
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech recognition is not supported in this browser. Try Chrome.');
            return;
        }

        state.recognition = new SpeechRecognition();
        state.recognition.lang = 'en-IN';
        state.recognition.continuous = false;
        state.recognition.interimResults = false;

        state.recognition.onresult = function (e) {
            var transcript = e.results[0][0].transcript;
            document.getElementById('chatInput').value = transcript;
            sendMessage(transcript);
        };

        state.recognition.onend = function () {
            voiceBtn.classList.remove('recording');
            state.isRecording = false;
        };

        state.recognition.onerror = function () {
            voiceBtn.classList.remove('recording');
            state.isRecording = false;
        };

        state.recognition.start();
        voiceBtn.classList.add('recording');
        state.isRecording = true;

    } else {
        state.recognition.stop();
        voiceBtn.classList.remove('recording');
        state.isRecording = false;
    }
}

// ─── CONFIRM AI ORDER ─────────────────────────────────────────────────────────
async function confirmAIOrder() {
    if (state.aiOrderItems.length === 0) {
        alert('Please order something first!');
        return;
    }

    var total = state.aiOrderItems.reduce(function (acc, it) {
        return acc + (it.price * it.qty);
    }, 0);

    var orderData = {
        restaurant_id: RESTAURANT_ID,
        table_number: state.table,
        items: state.aiOrderItems,
        total_amount: parseFloat(total.toFixed(2)),
        status: 'pending',
        payment_method: 'cash'
    };

    if (state.botId) orderData.bot_id = state.botId;

    try {
        if (typeof window.createOrder !== 'function') throw new Error('createOrder not defined');
        var res = await window.createOrder(orderData);
        if (res && res.data && res.data[0]) {
            state.orderId = res.data[0].id;
        }
    } catch (e) {
        console.error('Order error:', e);
        alert('Could not place order. Please try again.');
        return;
    }

    document.getElementById('mode-ai').style.display = 'none';
    document.getElementById('orderStatusScreen').style.display = 'flex';
    document.getElementById('orderIdDisplay').textContent = 'Order ID: ' + (state.orderId || 'N/A');

    updateStatusBar('pending');
    startPollOrderStatus();
    setQrTotal(total);
}

// ─── MANUAL MENU ─────────────────────────────────────────────────────────────
function loadManualMenu() {
    var categories = ['All'];
    state.menu.forEach(function (item) {
        if (item.category && categories.indexOf(item.category) === -1) {
            categories.push(item.category);
        }
    });

    var tabsEl = document.getElementById('manualCategoryTabs');
    tabsEl.innerHTML = '';
    categories.forEach(function (cat, idx) {
        var btn = document.createElement('button');
        btn.className = 'cat-tab' + (idx === 0 ? ' active' : '');
        btn.textContent = cat;
        btn.addEventListener('click', function () {
            document.querySelectorAll('.cat-tab').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            renderMenuGrid(cat === 'All' ? 'all' : cat);
        });
        tabsEl.appendChild(btn);
    });

    renderMenuGrid('all');
}

function renderMenuGrid(filter) {
    var grid = document.getElementById('manualMenuGrid');
    grid.innerHTML = '';

    var items = state.menu.filter(function (item) {
        if (!item.is_available) return false;
        if (filter === 'all') return true;
        return item.category === filter;
    });

    if (items.length === 0) {
        grid.innerHTML = '<p class="empty-hint" style="grid-column:1/-1;">No items in this category.</p>';
        return;
    }

    items.forEach(function (item) {
        var card = document.createElement('div');
        card.className = 'menu-card';

        var badges = '';
        if (item.is_veg) badges += '<span class="badge badge-veg">🟢 Veg</span>';
        else badges += '<span class="badge badge-nonveg">🔴 Non-Veg</span>';
        if (item.is_spicy) badges += '<span class="badge badge-spicy">🌶️ Spicy</span>';

        card.innerHTML =
            '<div class="menu-card-name">' + escapeHtml(item.name) + '</div>' +
            '<div class="menu-card-badges">' + badges + '</div>' +
            '<div class="menu-card-footer">' +
            '<div class="menu-card-price">₹' + parseFloat(item.price).toFixed(2) + '</div>' +
            '<button class="btn-add" data-id="' + item.id + '">+ Add</button>' +
            '</div>';

        card.querySelector('.btn-add').addEventListener('click', function () {
            addToCart(item.id);
        });

        grid.appendChild(card);
    });
}

// ─── CART LOGIC ───────────────────────────────────────────────────────────────
function addToCart(itemId) {
    var menuItem = state.menu.find(function (m) { return m.id === itemId; });
    if (!menuItem) return;

    var existing = state.cart.find(function (c) { return c.id === itemId; });
    if (existing) {
        existing.qty++;
    } else {
        state.cart.push({
            id: menuItem.id,
            name: menuItem.name,
            price: parseFloat(menuItem.price),
            qty: 1,
            instructions: ''
        });
    }

    updateCartUI();
    openCart();
    animateCartBadge();
}

function animateCartBadge() {
    var badge = document.getElementById('cartCount');
    badge.classList.remove('pop');
    void badge.offsetWidth;
    badge.classList.add('pop');
    badge.addEventListener('animationend', function () {
        badge.classList.remove('pop');
    }, { once: true });
}

function updateCartUI() {
    var itemsList = document.getElementById('cartItemsList');
    var totalEl = document.getElementById('cartTotal');
    var countEl = document.getElementById('cartCount');

    countEl.textContent = state.cart.reduce(function (acc, it) { return acc + it.qty; }, 0);

    if (state.cart.length === 0) {
        itemsList.innerHTML = '<p class="empty-hint">Your cart is empty.</p>';
        totalEl.textContent = 'Total: ₹0.00';
        return;
    }

    itemsList.innerHTML = '';
    var total = 0;

    state.cart.forEach(function (item, idx) {
        var subtotal = item.price * item.qty;
        total += subtotal;

        var div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML =
            '<div class="cart-item-header">' +
            '<span class="cart-item-name">' + escapeHtml(item.name) + '</span>' +
            '<button class="cart-item-remove" data-idx="' + idx + '">✕</button>' +
            '</div>' +
            '<div class="cart-item-controls">' +
            '<div class="qty-controls">' +
            '<button class="qty-btn minus-btn" data-idx="' + idx + '">−</button>' +
            '<span class="qty-val">' + item.qty + '</span>' +
            '<button class="qty-btn plus-btn" data-idx="' + idx + '">+</button>' +
            '</div>' +
            '<span class="cart-item-price">₹' + subtotal.toFixed(2) + '</span>' +
            '</div>' +
            '<input class="cart-item-note" data-idx="' + idx + '" type="text" ' +
            'placeholder="Any special requests?" value="' + escapeHtml(item.instructions) + '" />';

        itemsList.appendChild(div);
    });

    totalEl.textContent = 'Total: ₹' + total.toFixed(2);

    itemsList.querySelectorAll('.cart-item-remove').forEach(function (btn) {
        btn.addEventListener('click', function () {
            state.cart.splice(parseInt(btn.getAttribute('data-idx'), 10), 1);
            updateCartUI();
        });
    });

    itemsList.querySelectorAll('.minus-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var i = parseInt(btn.getAttribute('data-idx'), 10);
            if (state.cart[i].qty > 1) { state.cart[i].qty--; }
            else { state.cart.splice(i, 1); }
            updateCartUI();
        });
    });

    itemsList.querySelectorAll('.plus-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            state.cart[parseInt(btn.getAttribute('data-idx'), 10)].qty++;
            updateCartUI();
        });
    });

    itemsList.querySelectorAll('.cart-item-note').forEach(function (input) {
        input.addEventListener('input', function () {
            var i = parseInt(input.getAttribute('data-idx'), 10);
            if (state.cart[i]) state.cart[i].instructions = input.value;
        });
    });
}

function toggleCart() {
    var sidebar = document.getElementById('cartSidebar');
    if (sidebar.classList.contains('open')) {
        closeCart();
    } else {
        openCart();
    }
}

function openCart() {
    document.getElementById('cartSidebar').classList.add('open');
    document.getElementById('cartBackdrop').classList.add('visible');
}

function closeCart() {
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('cartBackdrop').classList.remove('visible');
}

// ─── PLACE MANUAL ORDER ───────────────────────────────────────────────────────
async function placeManualOrder() {
    if (state.cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    var total = state.cart.reduce(function (acc, it) { return acc + it.price * it.qty; }, 0);

    var orderItems = state.cart.map(function (it) {
        return { name: it.name, qty: it.qty, price: it.price, instructions: it.instructions };
    });

    var orderData = {
        restaurant_id: RESTAURANT_ID,
        table_number: state.table,
        items: orderItems,
        total_amount: parseFloat(total.toFixed(2)),
        status: 'pending',
        payment_method: 'cash'
    };

    if (state.botId) orderData.bot_id = state.botId;

    try {
        if (typeof window.createOrder !== 'function') throw new Error('createOrder not defined');
        var res = await window.createOrder(orderData);
        if (res && res.data && res.data[0]) {
            state.orderId = res.data[0].id;
        }
    } catch (e) {
        console.error('Order error:', e);
        alert('Could not place order. Please try again.');
        return;
    }

    closeCart();
    document.getElementById('mode-manual').style.display = 'none';
    document.getElementById('orderStatusScreen').style.display = 'flex';
    document.getElementById('orderIdDisplay').textContent = 'Order ID: ' + (state.orderId || 'N/A');

    updateStatusBar('pending');
    startPollOrderStatus();
    setQrTotal(total);
}

// ─── ORDER STATUS POLLING ─────────────────────────────────────────────────────
function startPollOrderStatus() {
    if (state.pollInterval) clearInterval(state.pollInterval);

    state.pollInterval = setInterval(async function () {
        if (!state.orderId) return;
        try {
            var res = await window.supabaseClient
                .from('orders')
                .select('status, total_amount')
                .eq('id', state.orderId)
                .single();

            if (res && res.data) {
                var status = res.data.status;
                updateStatusBar(status);

                if (status === 'ready') {
                    document.getElementById('orderStatusScreen').style.display = 'none';
                    document.getElementById('qrPaymentScreen').style.display = 'flex';
                }

                if (status === 'delivered' || status === 'billed') {
                    clearInterval(state.pollInterval);
                    state.pollInterval = null;
                    document.getElementById('qrPaymentScreen').style.display = 'none';
                    showFeedbackModal();
                }
            }
        } catch (e) {
            console.warn('Poll error:', e);
        }
    }, 8000);
}

function updateStatusBar(status) {
    var steps = ['pending', 'preparing', 'ready', 'delivered'];
    var curIndex = steps.indexOf(status);

    steps.forEach(function (step, idx) {
        var stepEl = document.getElementById('step-' + step);
        if (stepEl) stepEl.classList.toggle('active', idx <= curIndex);
    });

    document.querySelectorAll('.step-line').forEach(function (line, idx) {
        line.classList.toggle('active', idx < curIndex);
    });
}

// ─── QR PAYMENT ───────────────────────────────────────────────────────────────
function setQrTotal(total) {
    document.getElementById('qrTotal').textContent = 'Total: ₹' + parseFloat(total).toFixed(2);
    buildQrCode();
}

function buildQrCode() {
    var qrBox = document.getElementById('qrBox');
    qrBox.innerHTML = '';
    var seed = state.orderId
        ? state.orderId.charCodeAt(0) + state.orderId.charCodeAt(1)
        : 42;
    for (var i = 0; i < 100; i++) {
        var cell = document.createElement('div');
        var isDark = ((seed * (i + 3) * 7 + i * 13) % 3) !== 0;
        cell.className = 'qr-cell ' + (isDark ? 'dark' : 'light');
        qrBox.appendChild(cell);
    }
}

async function markAsBilled() {
    var method = document.querySelector('input[name="paymentMethod"]:checked');
    var paymentMethod = method ? method.value : 'cash';

    try {
        if (state.orderId && window.supabaseClient) {
            await window.supabaseClient
                .from('orders')
                .update({ status: 'billed', payment_method: paymentMethod })
                .eq('id', state.orderId);
        }
    } catch (e) {
        console.error('Billing error:', e);
    }

    if (state.pollInterval) {
        clearInterval(state.pollInterval);
        state.pollInterval = null;
    }

    document.getElementById('qrPaymentScreen').style.display = 'none';
    showFeedbackModal();
}

// ─── FEEDBACK ─────────────────────────────────────────────────────────────────
function showFeedbackModal() {
    state.selectedRating = 0;
    document.querySelectorAll('.star').forEach(function (s) { s.classList.remove('active'); });
    document.getElementById('feedbackComment').value = '';
    document.getElementById('thankYouMsg').style.display = 'none';
    document.getElementById('submitFeedbackBtn').style.display = 'block';
    document.getElementById('feedbackModal').style.display = 'flex';
}

function setRating(n) {
    state.selectedRating = n;
    document.querySelectorAll('.star').forEach(function (star) {
        star.classList.toggle('active', parseInt(star.getAttribute('data-value'), 10) <= n);
    });
}

async function submitFeedbackHandler() {
    if (!state.selectedRating) {
        alert('Please select a rating!');
        return;
    }

    var comment = document.getElementById('feedbackComment').value.trim();

    try {
        if (window.supabaseClient) {
            await window.supabaseClient.from('feedback').insert([{
                order_id: state.orderId || null,
                rating: state.selectedRating,
                comment: comment
            }]);
        }
    } catch (e) {
        console.error('Feedback error:', e);
    }

    document.getElementById('submitFeedbackBtn').style.display = 'none';
    document.getElementById('thankYouMsg').style.display = 'block';

    setTimeout(resetForNextCustomer, 3000);
}

// ─── RESET FOR NEXT CUSTOMER ─────────────────────────────────────────────────
function resetForNextCustomer() {
    state.cart = [];
    state.aiOrderItems = [];
    state.chatHistory = [];
    state.orderId = null;
    state.selectedRating = 0;

    if (state.pollInterval) {
        clearInterval(state.pollInterval);
        state.pollInterval = null;
    }

    window.speechSynthesis && window.speechSynthesis.cancel();

    document.getElementById('chatMessages').innerHTML = '';
    updateCartUI();
    updateAIOrderPanel([]);

    document.getElementById('orderStatusScreen').style.display = 'none';
    document.getElementById('qrPaymentScreen').style.display = 'none';
    document.getElementById('feedbackModal').style.display = 'none';

    document.getElementById('mode-ai').style.display = 'block';
    document.getElementById('mode-manual').style.display = 'none';
    document.querySelectorAll('.mode-tab').forEach(function (tab) {
        tab.classList.toggle('active', tab.getAttribute('data-mode') === 'ai');
    });

    closeCart();

    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('welcomeScreen').style.display = 'flex';
}