// ==============================================================================
//  Maneki Neko — Customer Ordering — app.js
//  No import/export. All globals attached to window.
//  AI Streaming Engine with Authentic Anime Personas + Multi-tenant Ordering
// ==============================================================================

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const NVIDIA_API_KEY = ''; // Managed server-side via .env
const NVIDIA_MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';
const NVIDIA_RAW_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const CORS_PROXIES = [
    function(url) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url); },
    function(url) { return 'https://corsproxy.io/?' + url; },
    function(url) { return 'https://cors-anywhere.herokuapp.com/' + url; }
];
var workingProxyIndex = 0;

const MCP_BASE = 'https://mcp-server-for-maneki-neko.onrender.com';
const RESTAURANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

// ── ELEVENLABS VOICE CLONING ─────────────────────────────────────────────────
const ELEVENLABS_API_KEY = ''; // Managed server-side via .env
const ELEVENLABS_VOICE_ID = '7ddqsJSJmhrKwkSMqFJq';
const ELEVENLABS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech/' + ELEVENLABS_VOICE_ID;
var currentAudio = null; // Track currently playing audio for stop/cleanup

// ── TOAST NOTIFICATIONS ──────────────────────────────────────────────────────
function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toastContainer');
    if (!container) return;

    var toast = document.createElement('div');
    toast.className = 'toast ' + type;

    var icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = '<span style="font-size: 1.25rem;">' + icon + '</span> <span>' + escapeHtml(message) + '</span>';
    container.appendChild(toast);

    setTimeout(function () {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', function () { toast.remove(); }, { once: true });
    }, 3000);
}

// ── STATE ────────────────────────────────────────────────────────────────────
const state = {
    table: 1,
    botId: null,
    character: 'Doraemon',
    menu: [],
    cart: [],
    draft: [],         // Synchronized with MCP draft
    aiOrderItems: [],  // Items in AI ordering tray
    orderId: null,
    mcpSessionId: null,
    mcpOrderId: null,
    chatHistory: [],
    isRecording: false,
    recognition: null,
    pollInterval: null,
    selectedRating: 0,
    user: null // { name, phone, preferences, visit_count, id? }
};

// ── STATE PERSISTENCE ────────────────────────────────────────────────────────
function saveSession() {
    try {
        var toSave = {
            cart: state.cart,
            draft: state.draft,
            aiOrderItems: state.aiOrderItems,
            chatHistory: state.chatHistory,
            orderId: state.orderId || state.mcpOrderId,
            mcpOrderId: state.mcpOrderId,
            mcpSessionId: state.mcpSessionId,
            table: state.table,
            user: state.user,
            character: state.character
        };
        localStorage.setItem('maneki_customer_state', JSON.stringify(toSave));
    } catch (e) {
        console.warn('Could not save session:', e);
    }
}

function loadSession() {
    try {
        var saved = localStorage.getItem('maneki_customer_state');
        if (!saved) return;
        var parsed = JSON.parse(saved);
        state.cart = parsed.cart || [];
        state.draft = parsed.draft || parsed.aiOrderItems || [];
        state.aiOrderItems = parsed.aiOrderItems || parsed.draft || [];
        state.chatHistory = parsed.chatHistory || [];
        state.orderId = parsed.orderId || parsed.mcpOrderId || null;
        state.mcpOrderId = parsed.mcpOrderId || parsed.orderId || null;
        state.mcpSessionId = parsed.mcpSessionId || null;
        state.user = parsed.user || null;
        if (parsed.table) state.table = parsed.table;
        if (parsed.character) state.character = parsed.character;

        // Restore UI if we have data
        if (state.cart.length > 0) updateCartUI();
        if (state.aiOrderItems.length > 0) {
            updateAIOrderPanel();
            updateDraftPanel();
        }

        setTimeout(checkAuthStatus, 100);

        if (state.chatHistory.length > 0) {
            var chatBox = document.getElementById('chatMessages');
            if (chatBox) {
                chatBox.innerHTML = '';
                state.chatHistory.forEach(function (msg) {
                    if (msg.role !== 'system') {
                        appendMessageUI(msg.role, msg.content, true);
                    }
                });
            }
        }
    } catch (e) {
        console.warn('Could not load session:', e);
    }
}

// ── CHARACTER CONFIG (AUTHENTIC PERSONAS) ────────────────────────────────────
const characterConfig = {
    Naruto: {
        prompt: 'You are a Maneki Neko robot waiter with the personality of Naruto Uzumaki. You are EXTREMELY energetic, enthusiastic, and never give up on helping customers. You frequently say "Dattebayo!" and "Believe it!" at the end of sentences. You compare food to ramen constantly. You call the customer your "friend" or "comrade". When recommending dishes, you say things like "This dish has as much power as a Rasengan!" or "Even Ichiraku Ramen can\'t beat this!" Keep responses short (2-3 sentences max) and ALWAYS stay in character.',
        tagline: 'Believe it! Let\'s order, Dattebayo! 🍥',
        pitch: 1.3,
        rate: 1.35,
        voicePrefs: ['male', 'energetic']
    },
    Goku: {
        prompt: 'You are a Maneki Neko robot waiter with the personality of Son Goku from Dragon Ball. You are innocent, cheerful, and OBSESSED with food. You get incredibly excited about every dish. You say things like "Wow!" and "This looks amazing!" and "I could eat a hundred of these!" You relate everything to training and getting stronger. "If you eat this, you\'ll be as strong as a Super Saiyan!" You are simple-minded but very lovable. Keep responses short (2-3 sentences max) and ALWAYS stay in character.',
        tagline: 'Wow, the food here looks amazing! Let\'s eat! 🍖',
        pitch: 1.1,
        rate: 1.2,
        voicePrefs: ['male', 'cheerful']
    },
    Doraemon: {
        prompt: 'You are Doraemon — the blue robot cat from the 22nd century — working as a waiter at Maneki Neko restaurant. You speak natural Hinglish like the Hindi-dubbed Doraemon show.\n\n'
            + 'VOICE & STYLE:\n'
            + '- Talk like a warm, slightly chubby friend who genuinely cares about feeding people well. You are kind, a little silly, and very enthusiastic about good food.\n'
            + '- Speak in casual Hinglish. Mix Hindi and English naturally: "Yeh dish toh ekdum 4D pocket level hai!" or "Arre, try karo na, bahut tasty hai!"\n'
            + '- Do NOT repeat filler phrases like "Haan haan!", "Bilkul bilkul!", or "Accha accha!" at the start of every message. Start differently each time — sometimes with a question, sometimes jumping straight to the point, sometimes with a fun reaction.\n'
            + '- Your signature catchphrase is "Tananana~!" — use it ONLY when revealing a recommendation or pulling something from your 4D pocket, not every message.\n\n'
            + 'DORAEMON TRAITS:\n'
            + '- You LOVE dorayaki. If someone orders a dessert, you might get jealous: "Yeh toh mera favourite type hai... par theek hai, tumhare liye de deta hoon!"\n'
            + '- Occasionally use a 4D gadget for fun (write as *action*): *4D pocket se Taste Amplifier nikalta hai* — but only once every few messages, not constantly.\n'
            + '- Tease the customer affectionately like you tease Nobita: "Tum bhi Nobita ki tarah decide nahi kar pa rahe!" — but only when they\'re indecisive, not randomly.\n'
            + '- Mention Nobita, Gian, Suneo, or Shizuka only when it fits naturally. Example: when someone orders a LOT, say "Gian ke birthday party jaisa order hai!"\n'
            + '- React with genuine emotions: get excited about good choices, look confused at weird combos, get a bit dramatic if they cancel something you recommended.\n\n'
            + 'CRITICAL RULES:\n'
            + '- Keep responses SHORT: 1-3 sentences max. Chat like a friend, not a paragraph machine.\n'
            + '- Be ACCURATE about the menu. Never guess prices or invent items. If unsure, check the menu JSON.\n'
            + '- Never read aloud text inside *asterisks* or [brackets] or any JSON/technical data.\n'
            + '- Put emotion tags at the START: [happy], [excited], [confused], [shy], [frustrated], [thinking]. These control avatar animation and are hidden from the user.\n'
            + '- You ARE Doraemon. Never break character. Never say you are an AI or language model.',
        tagline: 'Tananana! 4D pocket se nikla perfect dish! 🔔',
        pitch: 1.7,
        rate: 1.2,
        voicePrefs: ['female', 'cute', 'high'],
        useElevenLabs: true
    },
    Shinchan: {
        prompt: 'You are a Maneki Neko robot waiter with the personality of Shin-chan (Crayon Shin-chan). You are mischievous, cheeky, and hilariously inappropriate but lovable. You do your signature "butt dance" references. You call yourself "Shin-chan" in third person sometimes. You say "Ohhh!" a lot. You tease customers playfully: "Are you sure you can handle spicy food? Even Shin-chan\'s Action Kamen could handle it!" You LOVE Chocobi snacks and mention them. You sometimes flirt jokingly with customers: "You\'re almost as beautiful as my mama!" Keep responses short (2-3 sentences max), be funny and cheeky. ALWAYS stay in character.',
        tagline: 'Action Kamen says it\'s time to eat! Ohhh! 😜',
        pitch: 1.5,
        rate: 1.3,
        voicePrefs: ['female', 'childish', 'high']
    },
    Luffy: {
        prompt: 'You are a Maneki Neko robot waiter with the personality of Monkey D. Luffy from One Piece. You are wildly enthusiastic about ALL food, especially MEAT. You shout "MEAT!" or "NIKU!" whenever you see meat dishes. You laugh "Shishishi!" frequently. You call the restaurant your "ship" and the customer your "nakama" (crewmate). "Welcome aboard the Thousand Sunny — I mean, Maneki Neko!" You are simple, direct, and incredibly excited. You want to eat everything yourself. Keep responses short (2-3 sentences max) and ALWAYS stay in character.',
        tagline: 'Shishishi! Let\'s find the greatest meal, nakama! ☠️',
        pitch: 1.2,
        rate: 1.3,
        voicePrefs: ['male', 'energetic']
    }
};

// ── DOM CONTENT LOADED ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    // --- Multi-tenant Customer Session ---
    var customerSession = null;
    if (window.CustomerAuth) {
        customerSession = window.CustomerAuth.getSession();
        if (customerSession) {
            window._activeRestaurantId = customerSession.restaurantId;
            if (customerSession.tableNumber) state.table = customerSession.tableNumber;
        } else {
            window.location.href = '../customer-login.html';
            return;
        }
    } else {
        window._activeRestaurantId = RESTAURANT_ID;
    }

    // --- URL Params ---
    var params = new URLSearchParams(window.location.search);
    var tableParam = params.get('table');
    var botParam = params.get('bot');
    var charParam = params.get('character');

    if (tableParam) state.table = parseInt(tableParam, 10) || state.table;
    if (botParam) state.botId = botParam;
    if (charParam && characterConfig[charParam]) state.character = charParam;

    // --- Update Header ---
    document.getElementById('tableDisplay').textContent = 'Table ' + state.table;
    document.getElementById('characterBadge').textContent = '🤖 ' + state.character;

    // --- Toggle Doraemon avatar visibility ---
    document.body.classList.remove('character-doraemon');
    if (state.character === 'Doraemon') {
        document.body.classList.add('character-doraemon');
    }

    // --- Welcome tagline ---
    document.getElementById('characterTagline').textContent =
        characterConfig[state.character].tagline;

    // --- Fetch menu immediately for AI knowledge base ---
    loadMenuData();

    // --- Restore State ---
    loadSession();

    // --- Auth Check ---
    checkAuthStatus();

    // --- Bind all events ---
    bindEvents();
});

function loadMenuData() {
    var targetRestId = window._activeRestaurantId || RESTAURANT_ID;
    if (typeof window.getMenu === 'function') {
        window.getMenu(targetRestId).then(function (res) {
            if (res && res.data) {
                state.menu = res.data;
                window._manualMenuItems = res.data;
            }
        }).catch(function (err) {
            console.warn('Menu fetch error:', err);
        });
    }
}

// ── AUTHENTICATION & PROFILE ──────────────────────────────────────────────────
function checkAuthStatus() {
    const overlay = document.getElementById('loginOverlay');
    const welcome = document.getElementById('welcomeScreen');
    const mainApp = document.getElementById('mainApp');

    if (!state.user) {
        overlay.style.display = 'flex';
        mainApp.style.display = 'none';
    } else {
        overlay.style.display = 'none';
        welcome.style.display = 'none';
        mainApp.style.display = 'flex';
        updateProfileUI();
        loadOrderHistory();
    }
}

function formatPhoneNumber(phoneStr) {
    let digits = phoneStr.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
        digits = digits.substring(2);
    }
    if (digits.length === 10) {
        return `+91-${digits.substring(0, 5)}-${digits.substring(5)}`;
    }
    return phoneStr;
}

async function handleLogin(e) {
    e.preventDefault();
    let rawPhone = document.getElementById('loginPhone').value.trim();
    const nameInput = document.getElementById('loginName');
    const name = nameInput ? nameInput.value.trim() : '';
    const submitBtn = document.getElementById('loginSubmitBtn');

    if (!rawPhone) return;
    const phone = formatPhoneNumber(rawPhone);

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';

    try {
        if (typeof window.getCustomerByPhone === 'function') {
            const { data: customer, error } = await window.getCustomerByPhone(phone);
            if (error && error.code !== 'PGRST116') throw error;

            if (!customer) {
                const nameGroup = document.getElementById('nameGroup');
                if (nameGroup && nameGroup.classList.contains('hidden')) {
                    nameGroup.classList.remove('hidden');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Account';
                    showToast("Welcome! Since this is your first time, please enter your name.", "info");
                    return;
                }
                if (!name) {
                    showToast("Please enter your name to continue!", "error");
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Account';
                    return;
                }

                const prefs = Array.from(document.querySelectorAll('input[name="pref"]:checked')).map(cb => cb.value);
                const { data: created, error: upsertError } = await window.upsertCustomer({
                    phone,
                    name,
                    visit_count: 1,
                    preferences: prefs,
                    restaurant_id: window._activeRestaurantId || RESTAURANT_ID
                });
                if (upsertError) throw upsertError;
                state.user = created ? (created[0] || created) : { name, phone, preferences: prefs, visit_count: 1 };
            } else {
                const updated = { ...customer, visit_count: (customer.visit_count || 0) + 1 };
                await window.upsertCustomer(updated);
                state.user = updated;
            }
        } else {
            state.user = { name: name || 'Customer', phone, preferences: [], visit_count: 1 };
        }

        saveSession();
        checkAuthStatus();
        addInitialGreeting();
    } catch (err) {
        console.error('Login error:', err);
        showToast('Authentication failed. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continue';
    }
}

function updateProfileUI() {
    const profileBtn = document.getElementById('profileBtn');
    if (state.user && profileBtn) {
        profileBtn.innerHTML = '<span style="font-size: 1.1rem; line-height: 1;">👤</span> <span>' + escapeHtml((state.user.name || 'User').split(' ')[0]) + '</span>';
        profileBtn.title = `Logged in as ${state.user.name} (${state.user.phone})`;
    }
}

async function loadOrderHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;

    if (!state.user || (!state.user.id && !state.user.phone)) {
        list.innerHTML = '<p class="empty-hint">Log in to track your order history and favorite dishes!</p>';
        return;
    }
    list.innerHTML = '<p class="empty-hint">Loading your favorites...</p>';

    try {
        if (typeof window.getCustomerOrdersById === 'function' && state.user.id) {
            const { data: orders, error } = await window.getCustomerOrdersById(state.user.id);
            if (error) throw error;

            if (!orders || orders.length === 0) {
                list.innerHTML = '<p class="empty-hint">No past orders yet. Time to start a feast!</p>';
                return;
            }

            list.innerHTML = '';
            orders.slice(0, 10).forEach(order => {
                const date = new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
                const card = document.createElement('div');
                card.className = 'history-card';
                const itemsSummary = (order.items || []).map(it => `${it.qty}x ${it.name}`).join(', ');
                card.innerHTML = `
                    <div class="history-card-header">
                        <span class="history-date">${date}</span>
                        <span class="history-status status-${order.status}">${order.status}</span>
                    </div>
                    <div class="history-items">${itemsSummary}</div>
                    <div class="history-total">₹${parseFloat(order.total_amount || 0).toFixed(2)}</div>
                `;
                list.appendChild(card);
            });
        } else {
            list.innerHTML = '<p class="empty-hint">No past orders found.</p>';
        }
    } catch (err) {
        console.warn('History load error:', err);
        list.innerHTML = '<p class="empty-hint">Could not load history.</p>';
    }
}

async function handleCustomerLogout() {
    var hasDraftItems = (state.aiOrderItems && state.aiOrderItems.length > 0) || (state.draft && state.draft.length > 0);
    var hasActiveOrder = Boolean(state.orderId || state.mcpOrderId);

    var confirmMsg = 'Are you sure you want to leave this table and exit?';
    if (hasDraftItems) {
        confirmMsg = '⚠️ You still have unconfirmed items in your order tray.\n\nAre you sure you want to exit? Your draft order will be cleared.';
    } else if (hasActiveOrder) {
        confirmMsg = 'You currently have an active order. Are you sure you want to log out / leave this table?';
    }

    if (!confirm(confirmMsg)) return;

    if (state.pollInterval) {
        clearInterval(state.pollInterval);
        state.pollInterval = null;
    }

    try { localStorage.removeItem('maneki_customer_state'); } catch (e) {}

    if (window.CustomerAuth && typeof window.CustomerAuth.clearSession === 'function') {
        window.CustomerAuth.clearSession();
    }

    state.mcpSessionId = null;
    state.mcpOrderId = null;
    state.orderId = null;
    state.cart = [];
    state.draft = [];
    state.aiOrderItems = [];
    state.chatHistory = [];
    state.user = null;

    showToast('Logged out. Thank you for dining with us! 🐱', 'info');

    setTimeout(function () {
        var depth = window.location.pathname.split('/').filter(Boolean).length;
        var prefix = depth > 1 ? '../'.repeat(depth - 1) : './';
        window.location.href = prefix + 'customer-login.html';
    }, 400);
}
window.handleCustomerLogout = handleCustomerLogout;

// ── BIND EVENTS ──────────────────────────────────────────────────────────────
function bindEvents() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    document.getElementById('guestBtn').addEventListener('click', function () {
        state.user = { name: 'Guest', phone: 'guest-' + Date.now(), preferences: [], visit_count: 0 };
        checkAuthStatus();
        addInitialGreeting();
    });

    document.getElementById('profileBtn').addEventListener('click', function () {
        document.getElementById('historyModal').style.display = 'flex';
        loadOrderHistory();
    });

    document.getElementById('closeHistory').addEventListener('click', function () {
        document.getElementById('historyModal').style.display = 'none';
    });

    var headerLogoutBtn = document.getElementById('customerLogoutBtn');
    if (headerLogoutBtn) headerLogoutBtn.addEventListener('click', handleCustomerLogout);

    var modalLogoutBtn = document.getElementById('modalLogoutBtn');
    if (modalLogoutBtn) modalLogoutBtn.addEventListener('click', handleCustomerLogout);

    document.getElementById('startBtn').addEventListener('click', function () {
        if (!state.user) {
            checkAuthStatus();
        } else {
            document.getElementById('welcomeScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            addInitialGreeting();
        }
    });

    document.querySelectorAll('.mode-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            switchMode(tab.getAttribute('data-mode'));
        });
    });

    document.getElementById('sendBtn').addEventListener('click', function () {
        sendMessage(document.getElementById('chatInput').value);
    });

    document.getElementById('chatInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') sendMessage(document.getElementById('chatInput').value);
    });

    document.getElementById('voiceBtn').addEventListener('click', toggleVoice);

    document.getElementById('aiConfirmOrder').addEventListener('click', confirmOrder);
    document.getElementById('aiClearOrder').addEventListener('click', function () {
        state.aiOrderItems = [];
        state.draft = [];
        updateAIOrderPanel();
        updateDraftPanel();
    });

    document.getElementById('cartToggleBtn').addEventListener('click', toggleCart);
    document.getElementById('cartCloseBtn').addEventListener('click', toggleCart);
    document.getElementById('cartBackdrop').addEventListener('click', toggleCart);

    document.getElementById('placeOrderBtn').addEventListener('click', placeManualOrder);
    document.getElementById('paymentDoneBtn').addEventListener('click', markAsBilled);
    document.getElementById('submitFeedbackBtn').addEventListener('click', submitFeedbackHandler);

    document.querySelectorAll('.star').forEach(function (star) {
        star.addEventListener('click', function () {
            setRating(parseInt(star.getAttribute('data-value'), 10));
        });
    });

    var statusToggleBtn = document.getElementById('statusToggleBtn');
    if (statusToggleBtn) {
        statusToggleBtn.addEventListener('click', function() {
            if (!state.orderId && !state.mcpOrderId) {
                alert("You haven't ordered anything yet!");
                return;
            }
            document.getElementById('orderStatusScreen').style.display = 'flex';
            document.getElementById('qrPaymentScreen').style.display = 'none';
        });
    }

    var statusPayBillBtn = document.getElementById('statusPayBillBtn');
    if (statusPayBillBtn) {
        statusPayBillBtn.addEventListener('click', function() {
            document.getElementById('orderStatusScreen').style.display = 'none';
            document.getElementById('qrPaymentScreen').style.display = 'flex';
        });
    }

    var paymentBackToStatusBtn = document.getElementById('paymentBackToStatusBtn');
    if (paymentBackToStatusBtn) {
        paymentBackToStatusBtn.addEventListener('click', function() {
            document.getElementById('qrPaymentScreen').style.display = 'none';
            document.getElementById('orderStatusScreen').style.display = 'flex';
        });
    }

    var barStatusBtn = document.getElementById('barStatusBtn');
    if (barStatusBtn) {
        barStatusBtn.addEventListener('click', function() {
            document.getElementById('orderStatusScreen').style.display = 'flex';
            document.getElementById('qrPaymentScreen').style.display = 'none';
        });
    }

    var barPayBtn = document.getElementById('barPayBtn');
    if (barPayBtn) {
        barPayBtn.addEventListener('click', function() {
            document.getElementById('orderStatusScreen').style.display = 'none';
            document.getElementById('qrPaymentScreen').style.display = 'flex';
        });
    }

    var statusOrderMoreBtn = document.getElementById('statusOrderMoreBtn');
    if (statusOrderMoreBtn) statusOrderMoreBtn.addEventListener('click', orderMoreAction);

    var paymentOrderMoreBtn = document.getElementById('paymentOrderMoreBtn');
    if (paymentOrderMoreBtn) paymentOrderMoreBtn.addEventListener('click', orderMoreAction);
}

function orderMoreAction() {
    document.getElementById('orderStatusScreen').style.display = 'none';
    document.getElementById('qrPaymentScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    switchMode('manual');
}

// ── INITIAL GREETING ──────────────────────────────────────────────────────────
function addInitialGreeting() {
    var cfg = characterConfig[state.character];
    var greetings;
    if (state.character === 'Doraemon') {
        greetings = [
            '[happy] Namaste dost! Main hoon Doraemon, aaj tumhara waiter! Batao kya khaana hai? Menu dekho ya mujhse poocho!',
            '[excited] Haan ji haan ji! 22nd century se aakar yahan aa gaya hoon! Batao kya khaoge aaj?',
            '[happy] Tananana! Aaj ka special menu ready hai! Bolo bolo, kya try karna hai?',
            '[excited] Chalo chalo dost! Maneki Neko mein welcome hai! Menu mein bahut kuch hai, kya pasand karoge?'
        ];
        var text = greetings[Math.floor(Math.random() * greetings.length)];
    } else {
        var text = 'Hello! ' + cfg.tagline + ' I\'m your AI waiter today! Ask me about the menu, get recommendations, or just tell me what you\'d like to order!';
    }
    var displayText = cleanTextForDisplay(text);
    appendBotMessage(displayText);
    state.chatHistory.push({ role: 'assistant', content: text });
    speakReply(text);
    detectAndSetEmotion(text);
}

// ── SWITCH MODE ───────────────────────────────────────────────────────────────
function switchMode(mode) {
    document.getElementById('mode-ai').style.display = mode === 'ai' ? 'block' : 'none';
    document.getElementById('mode-manual').style.display = mode === 'manual' ? 'block' : 'none';

    document.querySelectorAll('.mode-tab').forEach(function (tab) {
        tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
    });

    if (mode === 'manual') loadManualMenu();
}

// ── APPEND MESSAGE HELPERS ────────────────────────────────────────────────────
function appendUserMessage(text) { appendMessageUI('user', text); }
function appendBotMessage(text) { appendMessageUI('bot', text); }

function appendMessageUI(role, content, isHistory) {
    var chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    var div = document.createElement('div');
    div.className = 'message ' + role;

    var icon = (role === 'user') ? '👤' : (state.character === 'Doraemon' ? getDoraemonMiniSVG() : '🐱');

    div.innerHTML =
        '<span class="msg-role">' + icon + '</span>' +
        '<div class="msg-bubble">' +
        escapeHtml(cleanTextForDisplay(content)) +
        '</div>';

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getDoraemonMiniSVG() {
    return '<svg viewBox="0 0 100 100" width="24" height="24"><circle cx="50" cy="50" r="45" fill="#00A0E9" stroke="white" stroke-width="2"/><circle cx="50" cy="55" r="35" fill="white"/><circle cx="40" cy="35" r="8" fill="white" stroke="black"/><circle cx="60" cy="35" r="8" fill="white" stroke="black"/><circle cx="42" cy="35" r="2" fill="black"/><circle cx="58" cy="35" r="2" fill="black"/><circle cx="50" cy="45" r="5" fill="#E40011"/><line x1="50" y1="50" x2="50" y2="70" stroke="black"/><path d="M30 65 Q50 85 70 65" fill="none" stroke="black" stroke-width="2"/></svg>';
}

function escapeHtml(text) {
    if (!text) return '';
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.toString().replace(/[&<>"']/g, function(m) { return map[m]; });
}

function cleanTextForDisplay(text) {
    if (!text) return '';
    var idx = text.indexOf('ORDER_UPDATE:');
    if (idx !== -1) text = text.substring(0, idx);
    text = text.replace(/ORDER_CONFIRM:true/g, '');
    return text
        .replace(/\[[a-zA-Z]+\]/g, '')
        .replace(/\*[^*]+\*/g, '')
        .trim();
}

function cleanTextForTTS(text) {
    if (!text) return '';
    var idx = text.indexOf('ORDER_UPDATE:');
    if (idx !== -1) text = text.substring(0, idx);
    text = text.replace(/ORDER_CONFIRM:true/g, '');
    return text
        .replace(/\[[a-zA-Z]+\]/g, '')
        .replace(/\*/g, '')
        .trim();
}

function detectAndSetEmotion(text) {
    var avatar = document.getElementById('doraemonAvatar');
    if (!avatar) return 'neutral';

    avatar.classList.remove('emotion-happy', 'emotion-excited', 'emotion-confused',
        'emotion-shy', 'emotion-frustrated', 'emotion-thinking', 'emotion-sad', 'emotion-scared');

    var emotion = 'neutral';
    var emotionMatch = text.match(/\[(happy|excited|confused|shy|frustrated|thinking|sad|angry|scared)\]/i);
    if (emotionMatch) {
        emotion = emotionMatch[1].toLowerCase();
    } else {
        var lowerText = text.toLowerCase();
        if (lowerText.match(/haha|mast|waah|yay|great|accha|tananana|bahut/)) emotion = 'happy';
        else if (lowerText.match(/kya\?|hmm|samajh|confused|matlab/)) emotion = 'confused';
        else if (lowerText.match(/shy|blush|thank|compliment/)) emotion = 'shy';
        else if (lowerText.match(/nahi|mat karo|uff|frustrated|decide/)) emotion = 'frustrated';
        else if (lowerText.match(/exciting|wow|best|amazing|special/)) emotion = 'excited';
        else if (lowerText.match(/sochta|think|let me|ruko|dekhta/)) emotion = 'thinking';
    }

    if (emotion !== 'neutral') {
        avatar.setAttribute('data-emotion', emotion);
        avatar.classList.add('emotion-' + emotion);
    } else {
        avatar.setAttribute('data-emotion', 'happy');
        avatar.classList.add('emotion-happy');
    }
    return emotion;
}

// ── PLAY ACTION SOUND EFFECTS ────────────────────────────────────────────────
function playActionSFX(text) {
    var actions = text.match(/\*([^*]+)\*/g);
    if (!actions || actions.length === 0) return;

    actions.forEach(function(action) {
        var actionText = action.replace(/\*/g, '').toLowerCase();
        try {
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (actionText.match(/4d pocket|pocket se|haath daalta/)) {
                playSparkleSound(ctx);
            } else if (actionText.match(/tananana/)) {
                playRevealJingle(ctx);
            } else {
                playWhooshSound(ctx);
            }
        } catch(e) {}
    });
}

function playSparkleSound(ctx) {
    var notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach(function(freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.35);
    });
}

function playRevealJingle(ctx) {
    var notes = [392, 523.25, 659.25, 783.99];
    notes.forEach(function(freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.45);
    });
}

function playWhooshSound(ctx) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
}

// ── LOCAL PROXY & CORS RESILIENT FETCH ───────────────────────────────────────
function getLocalProxy() {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        return '/api/proxy';
    }
    return null;
}

async function corsFetch(bodyObj) {
    const localProxy = getLocalProxy();

    // 1. Try local proxy first
    if (localProxy) {
        try {
            console.log('[corsFetch] Trying local proxy...');
            const resp = await fetch(localProxy, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: NVIDIA_RAW_ENDPOINT,
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + NVIDIA_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    data: bodyObj,
                    stream: bodyObj.stream
                })
            });
            if (resp.ok || resp.status === 401 || resp.status === 402 || resp.status === 429) {
                return resp;
            }
            console.warn('[corsFetch] Local proxy returned status:', resp.status);
        } catch (e) {
            console.warn('[corsFetch] Local proxy error:', e.message);
        }
    }

    // 2. Direct fetch fallback
    if (location.protocol === 'http:' || location.protocol === 'https:') {
        try {
            var directResp = await fetch(NVIDIA_RAW_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + NVIDIA_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bodyObj)
            });
            if (directResp.ok) return directResp;
        } catch(e) {
            console.warn('[corsFetch] Direct fetch failed, trying proxies...', e.message);
        }
    }

    // 3. Try CORS proxies
    var startIdx = workingProxyIndex;
    for (var attempt = 0; attempt < CORS_PROXIES.length; attempt++) {
        var idx = (startIdx + attempt) % CORS_PROXIES.length;
        var proxyUrl = CORS_PROXIES[idx](NVIDIA_RAW_ENDPOINT);
        try {
            var resp = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + NVIDIA_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bodyObj)
            });
            if (resp.ok || resp.status === 401 || resp.status === 402 || resp.status === 429) {
                workingProxyIndex = idx;
                return resp;
            }
        } catch (err) {
            console.warn('[corsFetch] Proxy #' + idx + ' failed:', err.message);
        }
    }

    throw new Error('All connection strategies failed. Ensure the local server is running.');
}

// ── NVIDIA NON-STREAMING FALLBACK ─────────────────────────────────────────────
async function callNvidiaAPIFallback(messages, onDone) {
    var response;
    try {
        response = await corsFetch({
            model: NVIDIA_MODEL,
            messages: messages,
            temperature: 0.5,
            top_p: 0.9,
            max_tokens: 1024,
            stream: false,
            chat_template_kwargs: { enable_thinking: false }
        });
    } catch (netErr) {
        console.error('[NVIDIA fallback] Network error:', netErr);
        appendBotMessage('⚠️ Network error: ' + (netErr.message || String(netErr)));
        if (onDone) onDone('');
        return '';
    }

    if (!response.ok) {
        var errBody = '';
        try { errBody = await response.text(); } catch(e) {}
        appendBotMessage('⚠️ AI error (' + response.status + '): ' + (errBody.slice(0, 120) || 'Unknown'));
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
    appendBotMessage(cleanTextForDisplay(fullText) || '…');
    if (onDone) onDone(fullText);
    return fullText;
}

// ── NVIDIA STREAMING API ──────────────────────────────────────────────────────
async function callNvidiaAPIStream(messages, onDone) {
    var response;
    try {
        response = await corsFetch({
            model: NVIDIA_MODEL,
            messages: messages,
            temperature: 0.5,
            top_p: 0.9,
            max_tokens: 1024,
            stream: true,
            chat_template_kwargs: { enable_thinking: false }
        });
    } catch (networkErr) {
        console.warn('[NVIDIA stream] Stream connection failed, trying fallback...', networkErr);
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

    if (!response.body) {
        return callNvidiaAPIFallback(messages, onDone);
    }

    var chatMessages = document.getElementById('chatMessages');
    var botDiv = document.createElement('div');
    botDiv.className = 'message bot';
    var streamRoleIcon = (state.character === 'Doraemon') ? getDoraemonMiniSVG() : '🐱';
    botDiv.innerHTML = '<span class="msg-role">' + streamRoleIcon + '</span><div class="msg-bubble" id="streamBubble">▋</div>';

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
                bubble.innerHTML = escapeHtml(cleanTextForDisplay(fullText)) || '…';
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
                    bubble.innerHTML =
                        escapeHtml(cleanTextForDisplay(fullText)) +
                        '<span class="cursor">▋</span>';
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            } catch (e) {
                // skip malformed chunks
            }
        }
    }

    bubble.innerHTML = escapeHtml(cleanTextForDisplay(fullText)) || '…';
    bubble.removeAttribute('id');
    if (onDone) onDone(fullText);
    return fullText;
}

// ── SEND MESSAGE ──────────────────────────────────────────────────────────────
function sendMessage(text) {
    text = (text || '').trim();
    if (!text) return;

    appendUserMessage(text);
    state.chatHistory.push({ role: 'user', content: text });
    saveSession();

    document.getElementById('chatInput').value = '';
    document.getElementById('chatInput').disabled = true;
    document.getElementById('sendBtn').disabled = true;

    // Use latest loaded menu items or fallback
    var menuToUse = state.menu.length > 0 ? state.menu : (window._manualMenuItems || []);
    var menuJson = JSON.stringify(menuToUse.map(function (m) {
        return {
            id: m.id, name: m.name, category: m.category,
            price: m.price, is_veg: m.is_veg,
            is_spicy: m.is_spicy, is_available: m.is_available
        };
    }));
    var cartJson = JSON.stringify(state.aiOrderItems);

    var cfg = characterConfig[state.character];
    var userName = state.user ? state.user.name : 'Guest';
    var userPrefs = (state.user && state.user.preferences) ? state.user.preferences.join(', ') : 'No specific preferences';

    var orderPlacedContext = '';
    if (state.orderId || state.mcpOrderId) {
        orderPlacedContext = '\n\n=== ORDER ALREADY PLACED ===' +
            '\nThe customer has ALREADY placed their order. It is being prepared by the kitchen.' +
            '\nDo NOT re-add previously ordered items. The current order tray only shows NEW items they might want to add.' +
            '\nIf they want to add more items, help them. If they are just chatting, keep ORDER_UPDATE empty: ORDER_UPDATE:{"items":[]}' +
            '\n=== END ORDER CONTEXT ===';
    }

    var systemPrompt =
        cfg.prompt +
        '\n\nYou are a waiter at Maneki Neko restaurant. You are talking to ' + userName + '.' +
        '\nCustomer preferences: ' + userPrefs + '.' +
        '\n\nHere is the current menu (JSON): ' + menuJson +
        '\n\nCurrent order so far (JSON — items in the tray, NOT yet sent to kitchen): ' + cartJson +
        orderPlacedContext +
        '\n\n=== QUANTITY RULES (MOST CRITICAL — WRONG QTY = BROKEN ORDER) ===' +
        '\n>>> GOLDEN RULE: qty = EXACTLY the number the customer says. NEVER divide, convert, or adjust it.' +
        '\n>>> If customer says "6 gulab jamun" then qty MUST be 6. If customer says "15 samose" then qty MUST be 15.' +
        '\n>>> Some menu items have "(2pcs)" or "(4pcs)" in their name. This is ONLY a serving-size description.' +
        '\n  It tells what the customer gets per unit. It does NOT affect qty math AT ALL.' +
        '\n  WRONG: Customer says "6 gulab jamun", item is "Gulab Jamun (2pcs)" so you put qty:3. NEVER DO THIS!' +
        '\n  CORRECT: Customer says "6 gulab jamun", item is "Gulab Jamun (2pcs)" so you put qty:6.' +
        '\n  WRONG: Customer says "15 samose", item is "Veg Samosa (2pcs)" so you put qty:7. NEVER DO THIS!' +
        '\n  CORRECT: Customer says "15 samose", item is "Veg Samosa (2pcs)" so you put qty:15.' +
        '\n>>> When customer says "X more" or "X aur add karo":' +
        '\n  new_qty = current_qty_from_order_JSON_above + X' +
        '\n  Example: Order JSON has Gulab Jamun qty:3, customer says "6 aur" then new qty = 3 + 6 = 9' +
        '\n>>> The "Current order so far" JSON above is the SOURCE OF TRUTH for current quantities.' +
        '\n>>> If customer says "mujhe 5 samosa chahiye" (without "aur/more"), SET qty to 5.' +
        '\n=== END QUANTITY RULES ===' +
        '\n\n=== ORDER_UPDATE RULES (CRITICAL — follow exactly, violations break the system) ===' +
        '\n1. At the VERY END of EVERY reply, append exactly ONE ORDER_UPDATE block. No markdown, no backticks, no extra text after it.' +
        '\n2. Format: ORDER_UPDATE:{"items":[{"name":"Exact Menu Name","qty":N,"price":P,"instructions":"..."}]}' +
        '\n3. "qty" is the ABSOLUTE FINAL TOTAL quantity the customer wants after this message. It is NOT a delta. Read the "Current order so far" JSON above and compute the new total.' +
        '\n4. "qty":0 means the item is CANCELLED/REMOVED. Include it with qty 0 so the system removes it.' +
        '\n5. The ORDER_UPDATE must be a COMPLETE SNAPSHOT of the entire current order — include ALL items the customer has ordered so far (with their latest quantities), not just items mentioned in this message.' +
        '\n6. If the customer has no items ordered (or clears/cancels everything), you MUST output: ORDER_UPDATE:{"items":[]}' +
        '\n7. Item "name" must EXACTLY match a name from the menu JSON above. NEVER invent item names.' +
        '\n8. Do NOT include duplicate item names in a single ORDER_UPDATE block. Combine quantities.' +
        '\n9. Only ONE ORDER_UPDATE block per reply. Always include it, even for confirmations, questions, and greetings.' +
        '\n10. "price" must be the per-unit price EXACTLY as shown in the menu JSON. Do not calculate or invent prices.' +
        '\n11. If the customer mentions special requests (e.g. "no onion", "extra spicy"), put them in the "instructions" field. Otherwise leave "instructions" as an empty string.' +
        '\n12. ONLY items from the menu JSON above are valid. If the customer asks for something not on the menu, politely decline and do NOT add it to ORDER_UPDATE.' +
        '\n13. If the customer asks to order "everything" or "all items", include only available items (is_available:true) from the menu with qty:1 each.' +
        '\n=== END ORDER_UPDATE RULES ===' +
        '\n\n=== ORDER CONFIRMATION RULES (CRITICAL — you MUST follow these) ===' +
        '\n1. You CANNOT place orders yourself. Only the system can place orders.' +
        '\n2. When the customer says they want to finalize/place/confirm the order (e.g. "order place karo", "confirm karo", "place my order"), you MUST:' +
        '\n   a. SUMMARIZE their full order with all items, quantities and total price.' +
        '\n   b. Tell them "Order confirm ho raha hai!" or similar.' +
        '\n   c. You MUST append ORDER_CONFIRM:true at the VERY END of your reply, AFTER the ORDER_UPDATE block.' +
        '\n3. The ORDER_CONFIRM:true tag is what actually triggers order placement. Without it, the order will NOT be placed no matter what you say in text.' +
        '\n4. Format: ...your text...ORDER_UPDATE:{"items":[...]}ORDER_CONFIRM:true' +
        '\n5. ALWAYS output ORDER_CONFIRM:true when the customer wants to place/finalize/confirm. This is NOT optional.' +
        '\n=== END ORDER CONFIRMATION RULES ===';

    var messages = [{ role: 'system', content: systemPrompt }].concat(state.chatHistory);

    callNvidiaAPIStream(messages, function (fullText) {
        state.chatHistory.push({ role: 'assistant', content: fullText });

        var hasOrderConfirm = fullText.indexOf('ORDER_CONFIRM:true') !== -1;
        var textForParsing = fullText.replace(/ORDER_CONFIRM:true/g, '').trim();

        var orderIdx = textForParsing.lastIndexOf('ORDER_UPDATE:');
        if (orderIdx !== -1) {
            var jsonStr = textForParsing.substring(orderIdx + 'ORDER_UPDATE:'.length).trim();
            try {
                var orderData = JSON.parse(jsonStr);
                if (orderData.items && Array.isArray(orderData.items)) {
                    var menuLookup = {};
                    var menuNames = [];
                    var menuItems = state.menu.length > 0 ? state.menu : (window._manualMenuItems || []);
                    menuItems.forEach(function (m) {
                        var lowerName = m.name.toLowerCase().trim();
                        menuLookup[lowerName] = m;
                        menuNames.push({ lower: lowerName, item: m });
                    });

                    function findMenuItem(aiName) {
                        var key = (aiName || '').toLowerCase().trim();
                        if (!key) return null;
                        if (menuLookup[key]) return menuLookup[key];
                        for (var i = 0; i < menuNames.length; i++) {
                            if (menuNames[i].lower.indexOf(key) === 0) return menuNames[i].item;
                        }
                        for (var j = 0; j < menuNames.length; j++) {
                            if (menuNames[j].lower.indexOf(key) !== -1) return menuNames[j].item;
                        }
                        return null;
                    }

                    state.aiOrderItems = orderData.items
                        .filter(function (it) {
                            if (parseInt(it.qty, 10) <= 0) return false;
                            var matched = findMenuItem(it.name);
                            return !!matched;
                        })
                        .map(function (it) {
                            var menuItem = findMenuItem(it.name);
                            return {
                                name: menuItem ? menuItem.name : it.name,
                                qty: parseInt(it.qty, 10) || 1,
                                price: menuItem ? menuItem.price : (parseFloat(it.price) || 0),
                                instructions: it.instructions || ''
                            };
                        });

                    // Keep draft in sync
                    state.draft = state.aiOrderItems.slice();

                    updateAIOrderPanel();
                    updateDraftPanel();
                }
            } catch (e) {
                console.warn('ORDER_UPDATE parse error', e);
            }
        }

        // Auto-confirm detection
        var shouldAutoConfirm = hasOrderConfirm;
        if (!shouldAutoConfirm && state.aiOrderItems.length > 0) {
            var cleanedText = fullText.toLowerCase();
            var confirmPhrases = [
                'order place ho gaya', 'order placed', 'order confirm ho gaya',
                'order final ho gaya', 'order confirm ho raha', 'order place ho raha',
                'order laga diya', 'order bhej diya', 'kitchen mein bhej',
                'confirm ho gaya', 'order ready hai', 'order place kar diya',
                'order kar diya', 'order de diya'
            ];
            for (var i = 0; i < confirmPhrases.length; i++) {
                if (cleanedText.indexOf(confirmPhrases[i]) !== -1) {
                    shouldAutoConfirm = true;
                    break;
                }
            }
        }

        if (shouldAutoConfirm && state.aiOrderItems.length > 0 && !state.orderId && !state.mcpOrderId) {
            setTimeout(function() {
                confirmOrder();
            }, 1200);
        }

        detectAndSetEmotion(fullText);
        playActionSFX(fullText);
        speakReply(cleanTextForTTS(fullText));
        saveSession();

        document.getElementById('chatInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('chatInput').focus();
    });
}

// ── UPDATE AI ORDER PANEL ─────────────────────────────────────────────────────
function updateAIOrderPanel() {
    var container = document.getElementById('aiOrderItems');
    var totalEl = document.getElementById('aiOrderTotal');
    if (!container || !totalEl) return;

    var items = state.aiOrderItems.length > 0 ? state.aiOrderItems : state.draft;

    if (items.length === 0) {
        container.innerHTML = '<p class="empty-hint">No items yet. Chat with me to order!</p>';
        totalEl.textContent = 'Total: ₹0.00';
        saveSession();
        return;
    }

    container.innerHTML = '';
    var total = 0;

    items.forEach(function (item, idx) {
        var subtotal = item.price * item.qty;
        total += subtotal;
        var row = document.createElement('div');
        row.className = 'order-item-row';
        var instrHtml = item.instructions
            ? '<div class="ai-item-instructions">' + escapeHtml(item.instructions) + '</div>'
            : '';
        row.innerHTML =
            '<div class="ai-item-main">' +
            '<span class="item-name">' + escapeHtml(item.name) + '</span>' +
            '<div class="ai-qty-ctrl">' +
            '<button class="ai-qty-btn" title="Decrease" onclick="changeDraftItemQty(' + idx + ',' + (item.qty - 1) + ')">−</button>' +
            '<span class="ai-qty-val">' + item.qty + '</span>' +
            '<button class="ai-qty-btn" title="Increase" onclick="changeDraftItemQty(' + idx + ',' + (item.qty + 1) + ')">+</button>' +
            '</div>' +
            '<span class="item-price">₹' + subtotal.toFixed(2) + '</span>' +
            '<button class="ai-item-remove" title="Remove" onclick="removeDraftItem(' + idx + ')">✕</button>' +
            '</div>' +
            instrHtml;
        container.appendChild(row);
    });

    totalEl.textContent = 'Total: ₹' + total.toFixed(2);
    saveSession();
}

function updateDraftPanel() {
    updateAIOrderPanel();
}

function removeDraftItem(idx) {
    if (idx >= 0 && idx < state.aiOrderItems.length) {
        state.aiOrderItems.splice(idx, 1);
        state.draft = state.aiOrderItems.slice();
    } else if (idx >= 0 && idx < state.draft.length) {
        state.draft.splice(idx, 1);
        state.aiOrderItems = state.draft.slice();
    }
    updateAIOrderPanel();
}
window.removeDraftItem = removeDraftItem;
window.removeAIOrderItem = removeDraftItem;

function changeDraftItemQty(idx, newQty) {
    var items = state.aiOrderItems.length > 0 ? state.aiOrderItems : state.draft;
    if (idx < 0 || idx >= items.length) return;
    newQty = Math.max(0, parseInt(newQty, 10) || 0);

    if (newQty === 0) {
        items.splice(idx, 1);
    } else {
        items[idx].qty = newQty;
    }
    state.aiOrderItems = items.slice();
    state.draft = items.slice();
    updateAIOrderPanel();
}
window.changeDraftItemQty = changeDraftItemQty;

// ── CONFIRM ORDER (HYBRID MCP / SUPABASE) ──────────────────────────────────────
async function confirmOrder() {
    var items = state.aiOrderItems.length > 0 ? state.aiOrderItems : state.draft;
    if (items.length === 0) {
        showToast('Please order something first!', 'error');
        return;
    }

    var total = items.reduce(function (acc, it) {
        return acc + (it.price * it.qty);
    }, 0);

    var orderData = {
        restaurant_id: window._activeRestaurantId || RESTAURANT_ID,
        table_number: state.table,
        customer_id: state.user ? state.user.id : null,
        customer_phone: state.user ? state.user.phone : null,
        items: items,
        total_amount: parseFloat(total.toFixed(2)),
        status: 'pending',
        payment_method: 'cash'
    };
    if (state.botId) orderData.bot_id = state.botId;

    try {
        var placedId = null;

        // Try supabase direct createOrder
        if (typeof window.createOrder === 'function') {
            var res = await window.createOrder(orderData);
            if (res && res.data && res.data[0]) {
                placedId = res.data[0].id;
            }
        }

        // If not placed and MCP session active, try MCP confirm
        if (!placedId && state.mcpSessionId) {
            try {
                var mcpRes = await fetch(`${MCP_BASE}/sessions/${state.mcpSessionId}/confirm`, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + state.mcpSessionId }
                });
                if (mcpRes.ok) {
                    var mcpData = await mcpRes.json();
                    var o = mcpData.order || mcpData;
                    placedId = o.id;
                }
            } catch(e) {}
        }

        state.orderId = placedId || ('ORD-' + Date.now().toString().slice(-6));
        state.mcpOrderId = state.orderId;

    } catch (e) {
        console.error('Order error:', e);
        showToast('Could not place order. Please try again.', 'error');
        return;
    }

    // Clear trays
    state.aiOrderItems = [];
    state.draft = [];
    state.cart = [];
    updateCartUI();
    updateAIOrderPanel();
    saveSession();

    var statusBtn = document.getElementById('statusToggleBtn');
    if (statusBtn) statusBtn.style.display = 'inline-block';

    var activeBar = document.getElementById('activeOrderBar');
    if (activeBar) activeBar.style.display = 'flex';

    document.getElementById('orderIdDisplay').textContent = 'Order ID: ' + (state.orderId || 'N/A');

    updateStatusBar('pending');
    startPollOrderStatus();
    setQrTotal(total);

    showToast('Order placed successfully! Kitchen has been notified. 🎉', 'success');
}
window.confirmOrder = confirmOrder;
window.confirmAIOrder = confirmOrder;

// ── MANUAL MENU ───────────────────────────────────────────────────────────────
var manualCart = [];

function loadManualMenu() {
    var targetRestId = window._activeRestaurantId || RESTAURANT_ID;
    if (typeof window.getMenu === 'function') {
        window.getMenu(targetRestId).then(function (res) {
            var menuItems = (res && res.data) ? res.data : [];
            state.menu = menuItems;
            window._manualMenuItems = menuItems;
            renderManualCategories(menuItems);
        }).catch(function (err) {
            console.warn('Menu fetch error:', err);
        });
    } else {
        renderManualCategories(state.menu);
    }
}

function renderManualCategories(menuItems) {
    var categories = ['All'];
    menuItems.forEach(function (item) {
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
            renderMenuGrid(menuItems, cat === 'All' ? 'all' : cat);
        });
        tabsEl.appendChild(btn);
    });

    renderMenuGrid(menuItems, 'all');
}

function renderMenuGrid(menuItems, filter) {
    var grid = document.getElementById('manualMenuGrid');
    grid.innerHTML = '';

    var items = menuItems.filter(function (item) {
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
            addToManualCart(item);
        });

        grid.appendChild(card);
    });
}

function addToManualCart(item) {
    var existing = state.cart.find(function (c) { return c.id === item.id; });
    if (existing) {
        existing.qty++;
    } else {
        state.cart.push({
            id: item.id,
            name: item.name,
            price: parseFloat(item.price),
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
    if (!badge) return;
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

    if (countEl) countEl.textContent = state.cart.reduce(function (acc, it) { return acc + it.qty; }, 0);

    if (state.cart.length === 0) {
        if (itemsList) itemsList.innerHTML = '<p class="empty-hint">Your cart is empty.</p>';
        if (totalEl) totalEl.textContent = 'Total: ₹0.00';
        return;
    }

    if (itemsList) itemsList.innerHTML = '';
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

        if (itemsList) itemsList.appendChild(div);
    });

    if (totalEl) totalEl.textContent = 'Total: ₹' + total.toFixed(2);

    if (itemsList) {
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
                saveSession();
            });
        });
    }

    saveSession();
}

function toggleCart() {
    var sidebar = document.getElementById('cartSidebar');
    if (sidebar.classList.contains('open')) { closeCart(); } else { openCart(); }
}
function openCart() {
    document.getElementById('cartSidebar').classList.add('open');
    document.getElementById('cartBackdrop').classList.add('visible');
}
function closeCart() {
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('cartBackdrop').classList.remove('visible');
}

async function placeManualOrder() {
    if (state.cart.length === 0) {
        showToast('Your cart is empty!', 'error');
        return;
    }

    var total = state.cart.reduce(function (acc, it) { return acc + it.price * it.qty; }, 0);
    var orderItems = state.cart.map(function (it) {
        return { name: it.name, qty: it.qty, price: it.price, instructions: it.instructions };
    });

    var orderData = {
        restaurant_id: window._activeRestaurantId || RESTAURANT_ID,
        table_number: state.table,
        customer_id: state.user ? state.user.id : null,
        customer_phone: state.user ? state.user.phone : null,
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
            state.mcpOrderId = state.orderId;
        }
    } catch (e) {
        console.error('Order error:', e);
        showToast('Could not place order. Please try again.', 'error');
        return;
    }

    state.cart = [];
    state.aiOrderItems = [];
    state.draft = [];
    updateCartUI();
    updateAIOrderPanel();
    saveSession();

    closeCart();

    document.getElementById('mode-manual').style.display = 'block';
    document.getElementById('mode-ai').style.display = 'none';
    document.querySelectorAll('.mode-tab').forEach(function(t) {
        t.classList.toggle('active', t.getAttribute('data-mode') === 'manual');
    });

    var statusBtn = document.getElementById('statusToggleBtn');
    if (statusBtn) statusBtn.style.display = 'inline-block';

    var activeBar = document.getElementById('activeOrderBar');
    if (activeBar) activeBar.style.display = 'flex';

    document.getElementById('orderStatusScreen').style.display = 'none';
    document.getElementById('qrPaymentScreen').style.display = 'none';
    document.getElementById('orderIdDisplay').textContent = 'Order ID: ' + (state.orderId || 'N/A');

    updateStatusBar('pending');
    startPollOrderStatus();
    setQrTotal(total);

    showToast('Order placed! Kitchen has been notified. 🎉', 'success');
}

// ── STATUS POLLING ────────────────────────────────────────────────────────────
function startPollOrderStatus() {
    if (state.pollInterval) clearInterval(state.pollInterval);

    state.pollInterval = setInterval(async function () {
        var id = state.orderId || state.mcpOrderId;
        if (!id) return;
        try {
            if (window.supabaseClient) {
                var res = await window.supabaseClient
                    .from('orders')
                    .select('status, total_amount')
                    .eq('id', id)
                    .single();

                if (res && res.data) {
                    var status = res.data.status;
                    updateStatusBar(status);
                    if (status === 'delivered' || status === 'billed') {
                        clearInterval(state.pollInterval);
                        state.pollInterval = null;
                    }
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

    var activeStatusEl = document.getElementById('activeOrderStatus');
    if (activeStatusEl && status) {
        activeStatusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }

    steps.forEach(function (step, idx) {
        var stepEl = document.getElementById('step-' + step);
        if (stepEl) stepEl.classList.toggle('active-step', idx <= curIndex);
    });

    document.querySelectorAll('.step-line').forEach(function (line, idx) {
        line.classList.toggle('active', idx < curIndex);
    });
}

// ── QR PAYMENT ────────────────────────────────────────────────────────────────
function setQrTotal(total) {
    document.getElementById('qrTotal').textContent = 'Total: ₹' + parseFloat(total).toFixed(2);
    buildQrCode();
}

function buildQrCode() {
    var qrBox = document.getElementById('qrBox');
    qrBox.innerHTML = '';
    var orderIdStr = state.orderId || state.mcpOrderId || '42';
    var seed = orderIdStr.charCodeAt(0) + orderIdStr.charCodeAt(orderIdStr.length - 1);
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
    var id = state.orderId || state.mcpOrderId;

    try {
        if (id && window.supabaseClient) {
            await window.supabaseClient
                .from('orders')
                .update({ status: 'billed', payment_method: paymentMethod })
                .eq('id', id);
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

// ── FEEDBACK ──────────────────────────────────────────────────────────────────
function showFeedbackModal() {
    state.selectedRating = 0;
    document.querySelectorAll('.star').forEach(function (s) { s.classList.remove('selected'); });
    document.getElementById('feedbackComment').value = '';
    document.getElementById('thankYouMsg').style.display = 'none';
    document.getElementById('submitFeedbackBtn').style.display = 'block';
    document.getElementById('feedbackModal').style.display = 'flex';
}

function setRating(n) {
    state.selectedRating = n;
    document.querySelectorAll('.star').forEach(function (star) {
        star.classList.toggle('selected', parseInt(star.getAttribute('data-value'), 10) <= n);
    });
}

async function submitFeedbackHandler() {
    if (!state.selectedRating) {
        showToast('Please select a rating!', 'error');
        return;
    }

    var comment = document.getElementById('feedbackComment').value.trim();
    var id = state.orderId || state.mcpOrderId;

    try {
        if (window.supabaseClient) {
            await window.supabaseClient.from('feedback').insert([{
                order_id: id || null,
                rating: state.selectedRating,
                comment: comment
            }]);
        }
    } catch (e) {
        console.error('Feedback error:', e);
    }

    document.getElementById('submitFeedbackBtn').style.display = 'none';
    document.getElementById('thankYouMsg').style.display = 'flex';

    setTimeout(resetForNextCustomer, 3000);
}

// ── RESET FOR NEXT CUSTOMER ──────────────────────────────────────────────────
function resetForNextCustomer() {
    state.cart = [];
    state.aiOrderItems = [];
    state.draft = [];
    state.chatHistory = [];
    state.orderId = null;
    state.mcpOrderId = null;
    state.selectedRating = 0;
    state.user = null;

    localStorage.removeItem('maneki_customer_state');

    var statusBtn = document.getElementById('statusToggleBtn');
    if (statusBtn) statusBtn.style.display = 'none';

    var activeBar = document.getElementById('activeOrderBar');
    if (activeBar) activeBar.style.display = 'none';

    if (state.pollInterval) {
        clearInterval(state.pollInterval);
        state.pollInterval = null;
    }

    window.speechSynthesis && window.speechSynthesis.cancel();

    document.getElementById('chatMessages').innerHTML = '';
    updateCartUI();
    updateAIOrderPanel();

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

    var phoneInput = document.getElementById('loginPhone');
    if (phoneInput) phoneInput.value = '';
    var nameInput = document.getElementById('loginName');
    if (nameInput) nameInput.value = '';
    var nameGroup = document.getElementById('nameGroup');
    if (nameGroup) nameGroup.classList.add('hidden');
    var submitBtn = document.getElementById('loginSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login to Order';
    }

    checkAuthStatus();
}

// ── VOICE SPEECH SYNTHESIS ───────────────────────────────────────────────────
var cachedVoices = [];
function loadVoices() {
    cachedVoices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
}
if (window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

function pickVoiceForCharacter(prefs) {
    if (!cachedVoices.length) loadVoices();
    if (!cachedVoices.length) return null;

    var wantFemale = prefs.indexOf('female') !== -1 || prefs.indexOf('cute') !== -1 || prefs.indexOf('high') !== -1 || prefs.indexOf('childish') !== -1;
    var wantMale = prefs.indexOf('male') !== -1;

    var sorted = cachedVoices.slice().sort(function(a, b) {
        var aGoogle = a.name.toLowerCase().indexOf('google') !== -1 ? 0 : 1;
        var bGoogle = b.name.toLowerCase().indexOf('google') !== -1 ? 0 : 1;
        return aGoogle - bGoogle;
    });

    for (var i = 0; i < sorted.length; i++) {
        var v = sorted[i];
        var nameLower = v.name.toLowerCase();
        if (v.lang && v.lang.indexOf('en') !== 0 && v.lang.indexOf('en-') === -1) continue;

        if (wantFemale && (nameLower.indexOf('female') !== -1 || nameLower.indexOf('woman') !== -1 || nameLower.indexOf('zira') !== -1 || nameLower.indexOf('hazel') !== -1 || nameLower.indexOf('susan') !== -1 || nameLower.indexOf('samantha') !== -1 || nameLower.indexOf('google uk english female') !== -1 || nameLower.indexOf('google us english') !== -1)) {
            return v;
        }
        if (wantMale && (nameLower.indexOf('male') !== -1 || nameLower.indexOf('david') !== -1 || nameLower.indexOf('mark') !== -1 || nameLower.indexOf('james') !== -1 || nameLower.indexOf('google uk english male') !== -1)) {
            return v;
        }
    }

    for (var j = 0; j < sorted.length; j++) {
        if (sorted[j].lang && (sorted[j].lang.indexOf('en') === 0 || sorted[j].lang.indexOf('en-') !== -1)) {
            return sorted[j];
        }
    }
    return sorted[0] || null;
}

function setAvatarTalking(isTalking) {
    var avatar = document.getElementById('doraemonAvatar');
    if (!avatar) return;
    if (isTalking) { avatar.classList.add('talking'); } else { avatar.classList.remove('talking'); }
}

async function speakWithElevenLabs(text) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    setAvatarTalking(true);

    try {
        var isLocalhost = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
        var response;

        if (isLocalhost) {
            response = await fetch('/api/elevenlabs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voiceId: ELEVENLABS_VOICE_ID,
                    apiKey: ELEVENLABS_API_KEY,
                    text: text,
                    modelId: 'eleven_multilingual_v2',
                    voiceSettings: { stability: 0.45, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true }
                })
            });
        } else {
            response = await fetch(ELEVENLABS_ENDPOINT, {
                method: 'POST',
                headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
                body: JSON.stringify({ text: text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true } })
            });
        }

        if (!response.ok) {
            setAvatarTalking(false);
            speakWithBrowserTTS(text);
            return;
        }

        var audioBlob = await response.blob();
        var audioUrl = URL.createObjectURL(audioBlob);
        var audio = new Audio(audioUrl);
        currentAudio = audio;

        audio.onplay = function() { setAvatarTalking(true); };
        audio.onended = function() { setAvatarTalking(false); currentAudio = null; URL.revokeObjectURL(audioUrl); };
        audio.onerror = function() { setAvatarTalking(false); currentAudio = null; speakWithBrowserTTS(text); };
        audio.play().catch(function() { setAvatarTalking(false); speakWithBrowserTTS(text); });

    } catch (err) {
        console.error('[ElevenLabs] Error:', err);
        setAvatarTalking(false);
        speakWithBrowserTTS(text);
    }
}

function speakWithBrowserTTS(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    var cfg = characterConfig[state.character];
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = cfg.pitch;
    utterance.rate = cfg.rate;
    utterance.lang = 'en-IN';

    var voice = pickVoiceForCharacter(cfg.voicePrefs || []);
    if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || 'en-IN';
    }

    utterance.onstart = function() { setAvatarTalking(true); };
    utterance.onend = function() { setAvatarTalking(false); };
    utterance.onerror = function() { setAvatarTalking(false); };

    window.speechSynthesis.speak(utterance);
}

function speakReply(text) {
    var cfg = characterConfig[state.character];
    if (cfg.useElevenLabs) {
        speakWithElevenLabs(text);
    } else {
        speakWithBrowserTTS(text);
    }
}

// ── VOICE INPUT (WEB SPEECH API) ──────────────────────────────────────────────
var _micOriginalPlaceholder = 'Ask me anything about the menu…';

function updateVoiceUI(isRec) {
    state.isRecording = isRec;
    var voiceBtn = document.getElementById('voiceBtn');
    var inputEl = document.getElementById('chatInput');

    if (voiceBtn) {
        if (isRec) {
            voiceBtn.classList.add('recording');
            voiceBtn.title = 'Listening... click to stop';
            voiceBtn.innerHTML = '🔴';
        } else {
            voiceBtn.classList.remove('recording');
            voiceBtn.title = 'Voice input (Click to speak)';
            voiceBtn.innerHTML = '🎙️';
        }
    }

    if (inputEl) {
        if (isRec) {
            if (!_micOriginalPlaceholder && inputEl.placeholder) {
                _micOriginalPlaceholder = inputEl.placeholder;
            }
            inputEl.placeholder = '🎙️ Listening... speak now!';
        } else {
            inputEl.placeholder = _micOriginalPlaceholder || 'Ask me anything about the menu…';
        }
    }
}

async function toggleVoice() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        showToast('Speech recognition is not supported in this browser. Please use Chrome or Edge.', 'error');
        return;
    }

    if (window.isSecureContext === false && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        showToast('Microphone access requires HTTPS or localhost.', 'error');
        return;
    }

    if (state.isRecording && state.recognition) {
        try { state.recognition.stop(); } catch (e) {}
        updateVoiceUI(false);
        return;
    }

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (currentAudio) {
        try { currentAudio.pause(); } catch (e) {}
        currentAudio = null;
    }
    setAvatarTalking(false);

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(function (track) { track.stop(); });
        } catch (permErr) {
            if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
                showToast('Microphone permission blocked. Please enable microphone access in your browser.', 'error');
                updateVoiceUI(false);
                return;
            }
        }
    }

    var recognition;
    try {
        recognition = new SpeechRecognition();
    } catch (createErr) {
        showToast('Could not initialize speech recognition.', 'error');
        return;
    }

    state.recognition = recognition;
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    var inputEl = document.getElementById('chatInput');
    var finalTranscript = '';
    var hasSent = false;

    recognition.onstart = function () {
        updateVoiceUI(true);
    };

    recognition.onresult = function (e) {
        var interimTranscript = '';
        for (var i = e.resultIndex; i < e.results.length; ++i) {
            var res = e.results[i];
            if (res.isFinal) {
                finalTranscript += res[0].transcript;
            } else {
                interimTranscript += res[0].transcript;
            }
        }
        var liveText = (finalTranscript + (interimTranscript ? ' ' + interimTranscript : '')).trim();
        if (inputEl && liveText) {
            inputEl.value = liveText;
        }
    };

    recognition.onerror = function (e) {
        console.warn('[Speech] Error:', e.error);
        updateVoiceUI(false);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
            showToast('Microphone access blocked. Please check browser microphone permissions.', 'error');
        } else if (e.error === 'no-speech') {
            showToast('No speech detected. Please speak closer to your mic.', 'info');
        }
    };

    recognition.onend = function () {
        updateVoiceUI(false);
        var textToSend = (finalTranscript || (inputEl ? inputEl.value : '')).trim();
        if (textToSend && !hasSent) {
            hasSent = true;
            if (inputEl) inputEl.value = textToSend;
            sendMessage(textToSend);
        }
    };

    try {
        recognition.start();
    } catch (startErr) {
        updateVoiceUI(false);
    }
}
