// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  Maneki Neko â€” Customer Ordering â€” app.js
//  No import/export. All globals attached to window.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€â”€ CONSTANTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NVIDIA_API_KEY = 'YOUR_NVIDIA_API_KEY_HERE';
const NVIDIA_MODEL = 'meta/llama-3.3-70b-instruct';
// Multiple CORS proxy options for resilience (file:// origin sends null Origin header)
const NVIDIA_RAW_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const CORS_PROXIES = [
    function(url) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url); },
    function(url) { return 'https://corsproxy.io/?' + url; },
    function(url) { return 'https://cors-anywhere.herokuapp.com/' + url; }
];
// Will be set to the working proxy index after first successful call
var workingProxyIndex = 0;
const RESTAURANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

// ── TOAST NOTIFICATIONS ──────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    var container = document.getElementById('toastContainer');
    if (!container) return;
    
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    
    var icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    
    toast.innerHTML = '<span style="font-size: 1.25rem;">' + icon + '</span> <span>' + escapeHtml(message) + '</span>';
    
    container.appendChild(toast);
    
    setTimeout(function() {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', function() {
            toast.remove();
        }, { once: true });
    }, 3000);
}

// ── ELEVENLABS VOICE CLONING ───────────────────────────────────────────────
const ELEVENLABS_API_KEY = 'YOUR_ELEVENLABS_API_KEY_HERE';
const ELEVENLABS_VOICE_ID = 'IwupFR629Ld8B7TjO3h9';
const ELEVENLABS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech/' + ELEVENLABS_VOICE_ID;
var currentAudio = null; // Track currently playing audio for stop/cleanup

// â”€â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    selectedRating: 0,
    user: null // { name, phone, preferences, visit_count }
};

// â”€â”€â”€ STATE PERSISTENCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function saveSession() {
    try {
        var toSave = {
            cart: state.cart,
            aiOrderItems: state.aiOrderItems,
            chatHistory: state.chatHistory,
            orderId: state.orderId,
            table: state.table,
            user: state.user
        };
        localStorage.setItem('maneki_customer_state', JSON.stringify(toSave));
    } catch(e) {
        console.warn('Could not save session:', e);
    }
}

function loadSession() {
    try {
        var saved = localStorage.getItem('maneki_customer_state');
        if (saved) {
            var parsed = JSON.parse(saved);
            state.cart = parsed.cart || [];
            state.aiOrderItems = parsed.aiOrderItems || [];
            state.chatHistory = parsed.chatHistory || [];
            state.orderId = parsed.orderId || null;
            state.user = parsed.user || null;
            if (parsed.table) state.table = parsed.table;

            // Validate restored order items against the menu (purge stale/invalid items)
            if (state.aiOrderItems.length > 0 && state.menu.length > 0) {
                var menuNames = {};
                state.menu.forEach(function (m) { menuNames[m.name.toLowerCase().trim()] = m; });
                state.aiOrderItems = state.aiOrderItems.filter(function (it) {
                    var valid = menuNames[(it.name || '').toLowerCase().trim()];
                    if (!valid) console.warn('[loadSession] Purged invalid item:', it.name);
                    if (valid) it.price = valid.price; // force correct price
                    return !!valid;
                });
            }

            // Restore UI if we have data
            if (state.cart.length > 0) updateCartUI();
            if (state.aiOrderItems.length > 0) updateAIOrderPanel();
            
            // Sync Auth
            setTimeout(checkAuthStatus, 100);
            
            // Re-render chat history securely
            if (state.chatHistory.length > 0) {
                var chatBox = document.getElementById('chatMessages');
                chatBox.innerHTML = '';
                state.chatHistory.forEach(function(msg) {
                    if (msg.role !== 'system') {
                        // We use the existing appendMessageUI method but need to skip saving it again
                        // Easiest is to manually reconstruct the DOM here safely, or just call appendMessageUI
                        appendMessageUI(msg.role, msg.content, true);
                    }
                });
            }
        }
    } catch(e) {
        console.warn('Could not load session:', e);
    }
}


// ——— CHARACTER CONFIG ———————————————————————————————————————————————————————————
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

// ——— DOM CONTENT LOADED ————————————————————————————————————————————————————————
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

    // --- Toggle Doraemon avatar visibility via body class ---
    document.body.classList.remove('character-doraemon');
    if (state.character === 'Doraemon') {
        document.body.classList.add('character-doraemon');
    }

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

    // --- Restore State ---
    loadSession();

    // --- Auth Check ---
    checkAuthStatus();

    // --- Bind all events ---
    bindEvents();
});

// ——— AUTHENTICATION & PROFILE ———————————————————————————————————————————————————
function checkAuthStatus() {
    const overlay = document.getElementById('loginOverlay');
    const welcome = document.getElementById('welcomeScreen');
    const mainApp = document.getElementById('mainApp');

    if (!state.user) {
        overlay.style.display = 'flex';
        mainApp.style.display = 'none';
        // Keep welcome screen visible in background if not already started
    } else {
        overlay.style.display = 'none';
        welcome.style.display = 'none';
        mainApp.style.display = 'flex';
        updateProfileUI();
        loadOrderHistory();
    }
}

// Helper to format Indian phone numbers consistently (+91-XXXXX-XXXXX)
function formatPhoneNumber(phoneStr) {
    let digits = phoneStr.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
        digits = digits.substring(2);
    }
    if (digits.length === 10) {
        return `+91-${digits.substring(0, 5)}-${digits.substring(5)}`;
    }
    return phoneStr; // Return original if it doesn't match standard 10-digit format
}

async function handleLogin(e) {
    e.preventDefault();
    let rawPhone = document.getElementById('loginPhone').value.trim();
    const nameInput = document.getElementById('loginName');
    const name = nameInput.value.trim();
    const submitBtn = document.getElementById('loginSubmitBtn');

    if (!rawPhone) return;
    
    const phone = formatPhoneNumber(rawPhone);

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';

    try {
        // 1. Check if customer exists
        const { data: customer, error } = await window.getCustomerByPhone(phone);
        
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"

        if (!customer) {
            const nameGroup = document.getElementById('nameGroup');
            if (nameGroup.classList.contains('hidden')) {
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
                restaurant_id: RESTAURANT_ID
            });
            if (upsertError) throw upsertError;
            state.user = created ? (created[0] || created) : null;
        } else {
            // Existing User Flow
            const updated = { ...customer, visit_count: (customer.visit_count || 0) + 1 };
            await window.upsertCustomer(updated);
            state.user = updated;
        }

        saveSession();
        checkAuthStatus();
        addInitialGreeting();
    } catch (err) {
        console.error('Login error:', err);
        alert('Authentication failed. Please try again.');
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
    if (!state.user || !state.user.id) {
        document.getElementById('historyList').innerHTML = '<p class="empty-hint">Log in to track your order history and favorite dishes!</p>';
        return;
    }
    const list = document.getElementById('historyList');
    list.innerHTML = '<p class="empty-hint">Loading your favorites...</p>';

    try {
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
            
            const itemsSummary = order.items.map(it => `${it.qty}x ${it.name}`).join(', ');
            
            card.innerHTML = `
                <div class="history-card-header">
                    <span class="history-date">${date}</span>
                    <span class="history-status status-${order.status}">${order.status}</span>
                </div>
                <div class="history-items">${itemsSummary}</div>
                <div class="history-total">₹${parseFloat(order.total_amount).toFixed(2)}</div>
            `;
            list.appendChild(card);
        });
    } catch (err) {
        console.warn('History load error:', err);
        list.innerHTML = '<p class="empty-hint">Could not load history.</p>';
    }
}

// ——— BIND EVENTS ———————————————————————————————————————————————————————————————
function bindEvents() {

    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Guest button
    document.getElementById('guestBtn').addEventListener('click', function () {
        state.user = { name: 'Guest', phone: 'guest-' + Date.now(), preferences: [], visit_count: 0 };
        checkAuthStatus();
        addInitialGreeting();
    });

    // Profile button (opens history)
    document.getElementById('profileBtn').addEventListener('click', function () {
        document.getElementById('historyModal').style.display = 'flex';
        loadOrderHistory();
    });

    // Close history
    document.getElementById('closeHistory').addEventListener('click', function () {
        document.getElementById('historyModal').style.display = 'none';
    });
    
    // Start button
    document.getElementById('startBtn').addEventListener('click', function () {
        if (!state.user) {
            checkAuthStatus(); // Show login if not logged in
        } else {
            document.getElementById('welcomeScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            addInitialGreeting();
        }
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
        updateAIOrderPanel();
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

    // Status / Bill toggle from header
    var statusToggleBtn = document.getElementById('statusToggleBtn');
    if (statusToggleBtn) {
        statusToggleBtn.addEventListener('click', function() {
            if (!state.orderId) {
                alert("You haven't ordered anything yet!");
                return;
            }
            document.getElementById('orderStatusScreen').style.display = 'flex';
            document.getElementById('qrPaymentScreen').style.display = 'none';
        });
    }

    // Status -> Payment
    var statusPayBillBtn = document.getElementById('statusPayBillBtn');
    if (statusPayBillBtn) {
        statusPayBillBtn.addEventListener('click', function() {
            document.getElementById('orderStatusScreen').style.display = 'none';
            document.getElementById('qrPaymentScreen').style.display = 'flex';
        });
    }

    // Payment -> Back to Status
    var paymentBackToStatusBtn = document.getElementById('paymentBackToStatusBtn');
    if (paymentBackToStatusBtn) {
        paymentBackToStatusBtn.addEventListener('click', function() {
            document.getElementById('qrPaymentScreen').style.display = 'none';
            document.getElementById('orderStatusScreen').style.display = 'flex';
        });
    }

    // Floating Active Order Bar Buttons
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

    // Order More Action
    var statusOrderMoreBtn = document.getElementById('statusOrderMoreBtn');
    if (statusOrderMoreBtn) {
        statusOrderMoreBtn.addEventListener('click', orderMoreAction);
    }
    
    var paymentOrderMoreBtn = document.getElementById('paymentOrderMoreBtn');
    if (paymentOrderMoreBtn) {
        paymentOrderMoreBtn.addEventListener('click', orderMoreAction);
    }
}

function orderMoreAction() {
    document.getElementById('orderStatusScreen').style.display = 'none';
    document.getElementById('qrPaymentScreen').style.display = 'none';

    // Re-show the main app (it may have been hidden by the status/payment bar buttons)
    document.getElementById('mainApp').style.display = 'flex';

    // Use switchMode to properly show the menu tab AND load menu items
    switchMode('manual');
}

// ——— INITIAL GREETING ———————————————————————————————————————————————————————————
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
    // Speak the greeting
    speakReply(text);
    // Set initial emotion
    detectAndSetEmotion(text);
}

// ——— SWITCH MODE ————————————————————————————————————————————————————————————————
function switchMode(mode) {
    document.getElementById('mode-ai').style.display = mode === 'ai' ? 'block' : 'none';
    document.getElementById('mode-manual').style.display = mode === 'manual' ? 'block' : 'none';

    document.querySelectorAll('.mode-tab').forEach(function (tab) {
        tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
    });

    if (mode === 'manual') loadManualMenu();
}

// ——— APPEND MESSAGE HELPERS —————————————————————————————————————————————————————
function appendUserMessage(text) {
    appendMessageUI('user', text);
}

function appendBotMessage(text) {
    appendMessageUI('bot', text);
}

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

function stripOrderUpdate(text) {
    var idx = text.indexOf('ORDER_UPDATE:');
    if (idx !== -1) text = text.substring(0, idx);
    text = text.replace('ORDER_CONFIRM:true', '');
    return text.trim();
}

function cleanTextForDisplay(text) {
    if (!text) return '';
    var idx = text.indexOf('ORDER_UPDATE:');
    if (idx !== -1) text = text.substring(0, idx);
    text = text.replace('ORDER_CONFIRM:true', '');
    return text
        .replace(/\[[a-zA-Z]+\]/g, '')
        .replace(/\*[^*]+\*/g, '')
        .trim();
}

function cleanTextForTTS(text) {
    if (!text) return '';
    var idx = text.indexOf('ORDER_UPDATE:');
    if (idx !== -1) text = text.substring(0, idx);
    text = text.replace('ORDER_CONFIRM:true', '');
    return text
        .replace(/\[[a-zA-Z]+\]/g, '')
        .replace(/\*/g, '')
        .trim();
}

function detectAndSetEmotion(text) {
    var avatar = document.getElementById('doraemonAvatar');
    if (!avatar) return 'neutral';
    
    // Remove all previous emotion classes
    avatar.classList.remove('emotion-happy', 'emotion-excited', 'emotion-confused', 
        'emotion-shy', 'emotion-frustrated', 'emotion-thinking', 'emotion-sad', 'emotion-scared');
    
    var emotion = 'neutral';
    // Check for explicit emotion tags
    var emotionMatch = text.match(/\[(happy|excited|confused|shy|frustrated|thinking|sad|angry|scared)\]/i);
    if (emotionMatch) {
        emotion = emotionMatch[1].toLowerCase();
    } else {
        // Fallback: infer from text content
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

// ——— PLAY ACTION SOUND EFFECTS ——————————————————————————————————————————————————
function playActionSFX(text) {
    // Detect action markers like *4D pocket mein haath daalta hai*
    var actions = text.match(/\*([^*]+)\*/g);
    if (!actions || actions.length === 0) return;
    
    actions.forEach(function(action) {
        var actionText = action.replace(/\*/g, '').toLowerCase();
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        if (actionText.match(/4d pocket|pocket se|haath daalta/)) {
            // Magical gadget pull sound — ascending sparkle
            playSparkleSound(ctx);
        } else if (actionText.match(/tananana/)) {
            // Doraemon's signature reveal jingle
            playRevealJingle(ctx);
        } else {
            // Generic action whoosh
            playWhooshSound(ctx);
        }
    });
}

function playSparkleSound(ctx) {
    var notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
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
    var notes = [392, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
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

// ——— LOCAL PROXY HELPER —————————————————————————————————————————————————————————
function getLocalProxy() {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        return '/api/proxy';
    }
    return null;
}

// ——— CORS-RESILIENT FETCH ———————————————————————————————————————————————————————
// Tries multiple CORS proxy strategies. Remembers which proxy works.
async function corsFetch(bodyObj) {
    const localProxy = getLocalProxy();

    // 1. Try local proxy first (Best for localhost, bypasses all CORS)
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
            console.warn('[corsFetch] Local proxy returned 500, trying public ones...');
        } catch (e) {
            console.warn('[corsFetch] Local proxy error:', e.message);
        }
    }

    // If running from localhost or https, try direct as fallback
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

    // Try proxies starting from the last known working one
    var startIdx = workingProxyIndex;
    for (var attempt = 0; attempt < CORS_PROXIES.length; attempt++) {
        var idx = (startIdx + attempt) % CORS_PROXIES.length;
        var proxyUrl = CORS_PROXIES[idx](NVIDIA_RAW_ENDPOINT);
        console.log('[corsFetch] Trying proxy #' + idx + ': ' + proxyUrl.substring(0, 60) + '...');

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
                // Even non-200 from NVIDIA means the proxy worked
                workingProxyIndex = idx;
                console.log('[corsFetch] Proxy #' + idx + ' succeeded (HTTP ' + resp.status + ')');
                return resp;
            }
            console.warn('[corsFetch] Proxy #' + idx + ' returned HTTP ' + resp.status + ', trying next...');
        } catch (err) {
            console.warn('[corsFetch] Proxy #' + idx + ' failed:', err.message);
        }
    }

    throw new Error('All CORS proxies failed. Please run via a local server (npx serve) or check your network.');
}

// ——— NVIDIA NON-STREAMING FALLBACK ——————————————————————————————————————————————
// Used when streaming is unavailable (e.g. file:// origin, CORS blocked body).
async function callNvidiaAPIFallback(messages, onDone) {
    var response;
    try {
        response = await corsFetch({
            model: NVIDIA_MODEL,
            messages: messages,
            temperature: 0.2,
            top_p: 0.7,
            max_tokens: 1024,
            stream: false
        });
    } catch (netErr) {
        console.error('[NVIDIA fallback] Network error:', netErr);
        appendBotMessage('⚠️ Network error: ' + (netErr.message || String(netErr)) + ' — Try running via a local server (npx serve).');
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
    appendBotMessage(cleanTextForDisplay(fullText) || '…');
    if (onDone) onDone(fullText);
    return fullText;
}

// ——— NVIDIA STREAMING API ———————————————————————————————————————————————————————
async function callNvidiaAPIStream(messages, onDone) {
    var response;
    try {
        response = await corsFetch({
            model: NVIDIA_MODEL,
            messages: messages,
            temperature: 0.2,
            top_p: 0.7,
            max_tokens: 1024,
            stream: true
        });
    } catch (networkErr) {
        // All proxies failed for streaming — try non-streaming as last resort
        console.warn('[NVIDIA stream] All proxies failed, trying non-streaming fallback. Error:', networkErr);
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
                // Remove streamer bubble
                bubble.innerHTML = escapeHtml(cleanTextForDisplay(fullText)) || '…';
                bubble.removeAttribute('id');
                // NOTE: Do NOT push to chatHistory here — the onDone callback handles it
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
                        escapeHtml(cleanTextForDisplay(fullText)) +
                        '<span class="cursor">▋</span>';
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            } catch (e) {
                // skip malformed JSON chunks
            }
        }
    }

    // FIX: strip ORDER_UPDATE in fallback path too
    bubble.innerHTML = escapeHtml(cleanTextForDisplay(fullText)) || '…';
    bubble.removeAttribute('id');
    if (onDone) onDone(fullText);
    return fullText;
}


// ——— SEND MESSAGE ———————————————————————————————————————————————————————————————
function sendMessage(text) {
    text = (text || '').trim();
    if (!text) return;

    appendUserMessage(text);
    state.chatHistory.push({ role: 'user', content: text });
    saveSession();

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
    var userName = state.user ? state.user.name : 'Guest';
    var userPrefs = (state.user && state.user.preferences) ? state.user.preferences.join(', ') : 'No specific preferences';
    
    // Build order-placed context
    var orderPlacedContext = '';
    if (state.orderId) {
        orderPlacedContext = '\n\n=== ORDER ALREADY PLACED ===' +
            '\nThe customer has ALREADY placed their order (Order ID: ' + state.orderId + '). It is being prepared by the kitchen.' +
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

        // Check for ORDER_CONFIRM flag first (must come AFTER ORDER_UPDATE)
        var hasOrderConfirm = fullText.indexOf('ORDER_CONFIRM:true') !== -1;
        // Strip ORDER_CONFIRM from text before parsing ORDER_UPDATE
        var textForParsing = fullText.replace('ORDER_CONFIRM:true', '').trim();

        // Extract ORDER_UPDATE — find position and JSON.parse the rest (no fragile regex)
        var orderIdx = textForParsing.lastIndexOf('ORDER_UPDATE:');
        if (orderIdx !== -1) {
            var jsonStr = textForParsing.substring(orderIdx + 'ORDER_UPDATE:'.length).trim();
            try {
                var orderData = JSON.parse(jsonStr);
                if (orderData.items && Array.isArray(orderData.items)) {
                    // Build lookup maps for menu items
                    var menuLookup = {};       // exact match: "gulab jamun (2pcs)" -> item
                    var menuNames = [];        // all menu items for fuzzy matching
                    state.menu.forEach(function (m) {
                        var lowerName = m.name.toLowerCase().trim();
                        menuLookup[lowerName] = m;
                        menuNames.push({ lower: lowerName, item: m });
                    });

                    // Fuzzy menu lookup: exact -> prefix -> contains
                    function findMenuItem(aiName) {
                        var key = (aiName || '').toLowerCase().trim();
                        if (!key) return null;
                        // 1. Exact match
                        if (menuLookup[key]) return menuLookup[key];
                        // 2. Prefix match: AI says "Gulab Jamun", menu has "Gulab Jamun (2pcs)"
                        for (var i = 0; i < menuNames.length; i++) {
                            if (menuNames[i].lower.indexOf(key) === 0) {
                                console.log('[ORDER_UPDATE] Fuzzy prefix match:', aiName, '->', menuNames[i].item.name);
                                return menuNames[i].item;
                            }
                        }
                        // 3. Contains match: AI says "Samosa", menu has "Veg Samosa (2pcs)"
                        for (var j = 0; j < menuNames.length; j++) {
                            if (menuNames[j].lower.indexOf(key) !== -1) {
                                console.log('[ORDER_UPDATE] Fuzzy contains match:', aiName, '->', menuNames[j].item.name);
                                return menuNames[j].item;
                            }
                        }
                        return null;
                    }

                    // FULL REPLACE — snapshot, not merge
                    // Validate each item against the actual menu
                    state.aiOrderItems = orderData.items
                        .filter(function (it) {
                            if (parseInt(it.qty, 10) <= 0) return false; // cancelled
                            // Reject items not found in the menu
                            var matched = findMenuItem(it.name);
                            if (!matched) {
                                console.warn('[ORDER_UPDATE] Rejected non-menu item:', it.name);
                                return false;
                            }
                            return true;
                        })
                        .map(function (it) {
                            // Force price from actual menu data (never trust LLM prices)
                            var menuItem = findMenuItem(it.name);
                            return {
                                name: menuItem ? menuItem.name : it.name, // use canonical menu name
                                qty: parseInt(it.qty, 10) || 1,
                                price: menuItem ? menuItem.price : (parseFloat(it.price) || 0),
                                instructions: it.instructions || ''
                            };
                        });
                    // Render
                    updateAIOrderPanel();
                }
            } catch (e) {
                console.warn('ORDER_UPDATE parse error', e);
            }
        }

        // Auto-confirm: if AI detected customer wants to place the order
        // Primary: check for ORDER_CONFIRM:true tag
        // Fallback: detect placement intent from AI's text AND user's message
        var shouldAutoConfirm = hasOrderConfirm;
        if (!shouldAutoConfirm && state.aiOrderItems.length > 0) {
            // Fallback 1: check if AI's text response indicates order placement
            var cleanedText = fullText.toLowerCase();
            var aiConfirmPhrases = [
                'order place ho gaya', 'order placed', 'order confirm ho gaya',
                'order final ho gaya', 'order confirm ho raha', 'order place ho raha',
                'order laga diya', 'order bhej diya', 'kitchen mein bhej',
                'confirm ho gaya', 'order ready hai', 'order place kar diya',
                'order kar diya', 'order de diya', 'order confirmed',
                'placing your order', 'sending your order', 'order has been placed',
                'order is confirmed', 'confirming your order', 'order sent',
                'dattebayo! order', 'your order is on its way',
                'order has been sent', 'i\'ve placed your order',
                'kitchen ko bhej', 'kitchen bhej diya', 'order go karo',
                'order laga raha', 'order bhej raha', 'order pakka',
                'done! your order', 'alright! placing', 'yosh! order',
                'shishishi! order', 'ohhh! order confirmed',
                'haan haan, order', 'bilkul! order', 'theek hai! order'
            ];
            for (var i = 0; i < aiConfirmPhrases.length; i++) {
                if (cleanedText.indexOf(aiConfirmPhrases[i]) !== -1) {
                    shouldAutoConfirm = true;
                    console.log('[ORDER_CONFIRM FALLBACK] Detected placement intent in AI text:', aiConfirmPhrases[i]);
                    break;
                }
            }

            // Fallback 2: check if the USER's last message was asking to confirm/place
            if (!shouldAutoConfirm) {
                var lastUserMsg = '';
                for (var u = state.chatHistory.length - 1; u >= 0; u--) {
                    if (state.chatHistory[u].role === 'user') {
                        lastUserMsg = state.chatHistory[u].content.toLowerCase().trim();
                        break;
                    }
                }
                var userConfirmPhrases = [
                    'confirm', 'place order', 'place my order', 'order place',
                    'order karo', 'order kar do', 'order de do', 'order do',
                    'confirm karo', 'confirm kar do', 'final karo', 'finalize',
                    'place karo', 'place kar do', 'laga do', 'laga de',
                    'bhej do', 'bhej de', 'send order', 'submit order',
                    'done ordering', 'that\'s all', 'bas itna', 'itna hi',
                    'ho gaya', 'ban gaya', 'pakka karo', 'pakka kar do',
                    'yes confirm', 'yes place', 'haan confirm', 'haan place',
                    'go ahead', 'proceed', 'checkout', 'check out',
                    'order bhej', 'kitchen bhej', 'send to kitchen',
                    'ready to order', 'let\'s order', 'order now',
                    'haa karo', 'ha karo', 'kar do order', 'de do order',
                    'order lagao', 'order laga do', 'thats it', 'that is all',
                    'aur kuch nahi', 'nothing else', 'order please',
                    'yep', 'yup', 'sure', 'ok confirm', 'okay confirm'
                ];
                for (var j = 0; j < userConfirmPhrases.length; j++) {
                    if (lastUserMsg.indexOf(userConfirmPhrases[j]) !== -1) {
                        shouldAutoConfirm = true;
                        console.log('[ORDER_CONFIRM FALLBACK] Detected confirm intent in USER message:', userConfirmPhrases[j]);
                        break;
                    }
                }
            }
        }

        if (shouldAutoConfirm && state.aiOrderItems.length > 0) {
            console.log('[ORDER_CONFIRM] Auto-placing order...');
            // Small delay so the user sees the summary before it's placed
            setTimeout(function() {
                confirmAIOrder();
                showToast('Order placed successfully! Kitchen has been notified. 🎉', 'success');
            }, 1500);
        }

        // Detect emotion and set avatar expression
        detectAndSetEmotion(fullText);
        
        // Play action sound effects for *actions*
        playActionSFX(fullText);

        // Speak reply (cleaned: no actions, no JSON, no emotion tags)
        speakReply(cleanTextForTTS(fullText));

        saveSession();

        document.getElementById('chatInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('chatInput').focus();
    });
}

// ——— UPDATE AI ORDER PANEL (render-only, reads from state.aiOrderItems) ————————
function updateAIOrderPanel() {
    var container = document.getElementById('aiOrderItems');
    var totalEl = document.getElementById('aiOrderTotal');

    if (state.aiOrderItems.length === 0) {
        container.innerHTML = '<p class="empty-hint">No items yet. Chat with me to order!</p>';
        totalEl.textContent = 'Total: ₹0.00';
        saveSession();
        return;
    }

    container.innerHTML = '';
    var total = 0;

    state.aiOrderItems.forEach(function (item, idx) {
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
            '<span class="item-qty">×' + item.qty + '</span>' +
            '<span class="item-price">₹' + subtotal.toFixed(2) + '</span>' +
            '<button class="ai-item-remove" title="Remove" onclick="removeAIOrderItem(' + idx + ')">✕</button>' +
            '</div>' +
            instrHtml;
        container.appendChild(row);
    });

    totalEl.textContent = 'Total: ₹' + total.toFixed(2);
    saveSession();
}

// ——— REMOVE SINGLE ITEM FROM AI ORDER ——————————————————————————————————————————
function removeAIOrderItem(idx) {
    if (idx >= 0 && idx < state.aiOrderItems.length) {
        state.aiOrderItems.splice(idx, 1);
    }
    updateAIOrderPanel();
    saveSession();
}

// ————————————————————————————————————————————————————————————————
// Pick the best available browser voice for each character personality.
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

    // Preference order: Google voices > Microsoft voices > others (Google sounds most natural)
    var sorted = cachedVoices.slice().sort(function(a, b) {
        var aGoogle = a.name.toLowerCase().indexOf('google') !== -1 ? 0 : 1;
        var bGoogle = b.name.toLowerCase().indexOf('google') !== -1 ? 0 : 1;
        return aGoogle - bGoogle;
    });

    // Try to match gender preference
    for (var i = 0; i < sorted.length; i++) {
        var v = sorted[i];
        var nameLower = v.name.toLowerCase();
        // Skip non-English voices
        if (v.lang && v.lang.indexOf('en') !== 0 && v.lang.indexOf('en-') === -1) continue;

        if (wantFemale && (nameLower.indexOf('female') !== -1 || nameLower.indexOf('woman') !== -1 || nameLower.indexOf('zira') !== -1 || nameLower.indexOf('hazel') !== -1 || nameLower.indexOf('susan') !== -1 || nameLower.indexOf('samantha') !== -1 || nameLower.indexOf('google uk english female') !== -1 || nameLower.indexOf('google us english') !== -1)) {
            return v;
        }
        if (wantMale && (nameLower.indexOf('male') !== -1 || nameLower.indexOf('david') !== -1 || nameLower.indexOf('mark') !== -1 || nameLower.indexOf('james') !== -1 || nameLower.indexOf('google uk english male') !== -1)) {
            return v;
        }
    }

    // Fallback: pick first English Google voice, or first English voice
    for (var j = 0; j < sorted.length; j++) {
        if (sorted[j].lang && (sorted[j].lang.indexOf('en') === 0 || sorted[j].lang.indexOf('en-') !== -1)) {
            return sorted[j];
        }
    }
    return sorted[0] || null;
}

// ————————————————————————————————————————————————————————————————
// Plays text using the cloned Doraemon voice via ElevenLabs API.
async function speakWithElevenLabs(text) {
    // Stop any currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }

    // Start avatar talking immediately for responsiveness
    setAvatarTalking(true);

    try {
        var response;
        var isLocalhost = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

        if (isLocalhost) {
            // Use our dedicated ElevenLabs proxy — returns raw audio/mpeg
            console.log('[ElevenLabs] Using dedicated local proxy /api/elevenlabs');
            response = await fetch('/api/elevenlabs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voiceId: ELEVENLABS_VOICE_ID,
                    apiKey: ELEVENLABS_API_KEY,
                    text: text,
                    modelId: 'eleven_multilingual_v2',
                    voiceSettings: {
                        stability: 0.45,
                        similarity_boost: 0.85,
                        style: 0.35,
                        use_speaker_boost: true
                    }
                })
            });
        } else {
            // Direct call (works if not blocked by CORS)
            response = await fetch(ELEVENLABS_ENDPOINT, {
                method: 'POST',
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg'
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.45,
                        similarity_boost: 0.85,
                        style: 0.35,
                        use_speaker_boost: true
                    }
                })
            });
        }

        if (!response.ok) {
            var errText = '';
            try { errText = await response.text(); } catch(e) {}
            console.error('[ElevenLabs] HTTP ' + response.status, errText);
            // Fall back to browser speech
            setAvatarTalking(false);
            speakWithBrowserTTS(text);
            return;
        }

        console.log('[ElevenLabs] Got audio response, Content-Type:', response.headers.get('content-type'));

        var audioBlob = await response.blob();
        console.log('[ElevenLabs] Audio blob size:', audioBlob.size, 'type:', audioBlob.type);

        var audioUrl = URL.createObjectURL(audioBlob);
        var audio = new Audio(audioUrl);
        currentAudio = audio;

        audio.onplay = function() {
            console.log('[ElevenLabs] Audio playing!');
            setAvatarTalking(true);
        };

        audio.onended = function() {
            console.log('[ElevenLabs] Audio ended.');
            setAvatarTalking(false);
            currentAudio = null;
            URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = function(e) {
            console.error('[ElevenLabs] Audio playback error:', e);
            setAvatarTalking(false);
            currentAudio = null;
            // Fallback to browser TTS
            speakWithBrowserTTS(text);
        };

        audio.play().catch(function(e) {
            console.warn('[ElevenLabs] Autoplay blocked:', e.message);
            setAvatarTalking(false);
            // Fallback to browser TTS
            speakWithBrowserTTS(text);
        });

    } catch (err) {
        console.error('[ElevenLabs] Fetch error:', err);
        setAvatarTalking(false);
        // Fall back to browser speech
        speakWithBrowserTTS(text);
    }
}


// ————————————————————————————————————————————————————————————————
function setAvatarTalking(isTalking) {
    var avatar = document.getElementById('doraemonAvatar');
    if (!avatar) return;
    if (isTalking) {
        avatar.classList.add('talking');
    } else {
        avatar.classList.remove('talking');
    }
}

// ————————————————————————————————————————————————————————————————
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

// ——— SPEAK REPLY (ROUTER) ———————————————————————————————————————————————————————
function speakReply(text) {
    var cfg = characterConfig[state.character];
    if (cfg.useElevenLabs) {
        speakWithElevenLabs(text);
    } else {
        speakWithBrowserTTS(text);
    }
}

// ——— VOICE INPUT ————————————————————————————————————————————————————————————————
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

// ——— CONFIRM AI ORDER ———————————————————————————————————————————————————————————
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
        customer_id: state.user ? state.user.id : null,
        customer_phone: state.user ? state.user.phone : null,
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

    // Clear items
    state.aiOrderItems = [];
    state.cart = [];
    updateCartUI();
    updateAIOrderPanel();
    saveSession();

    // Show status buttons
    var statusBtn = document.getElementById('statusToggleBtn');
    if (statusBtn) statusBtn.style.display = 'inline-block';
    
    var activeBar = document.getElementById('activeOrderBar');
    if (activeBar) activeBar.style.display = 'flex';

    // Stay on AI mode but clear the order UI
    document.getElementById('orderIdDisplay').textContent = 'Order ID: ' + (state.orderId || 'N/A');

    updateStatusBar('pending');
    startPollOrderStatus();
    setQrTotal(total);
}

// ——— MANUAL MENU ————————————————————————————————————————————————————————————————
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

// â”€â”€â”€ CART LOGIC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            saveSession();
        });
    });

    saveSession();
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

// â”€â”€â”€ PLACE MANUAL ORDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        restaurant_id: RESTAURANT_ID,
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
        }
    } catch (e) {
        console.error('Order error:', e);
        showToast('Could not place order. Please try again.', 'error');
        return;
    }

    state.cart = [];
    state.aiOrderItems = [];
    updateCartUI();
    updateAIOrderPanel();
    saveSession();

    closeCart();
    
    // Return them to menu
    document.getElementById('mode-manual').style.display = 'block';
    document.getElementById('mode-ai').style.display = 'none';
    document.querySelectorAll('.mode-tab').forEach(function(t) {
        t.classList.toggle('active', t.getAttribute('data-mode') === 'manual');
    });

    // Show status button in header
    var statusBtn = document.getElementById('statusToggleBtn');
    if (statusBtn) statusBtn.style.display = 'inline-block';

    // Show floating active order bar for quick tracking/payment
    var activeBar = document.getElementById('activeOrderBar');
    if (activeBar) activeBar.style.display = 'flex';

    document.getElementById('orderStatusScreen').style.display = 'none';
    document.getElementById('qrPaymentScreen').style.display = 'none';
    document.getElementById('orderIdDisplay').textContent = 'Order ID: ' + (state.orderId || 'N/A');

    updateStatusBar('pending');
    startPollOrderStatus();
    setQrTotal(total);
}

// ————————————————————————————————————————————————————————————————————————————————————————————————————
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

                if (status === 'delivered' || status === 'billed') {
                    clearInterval(state.pollInterval);
                    state.pollInterval = null;
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
        if (stepEl) stepEl.classList.toggle('active-step', idx <= curIndex);
    });

    document.querySelectorAll('.step-line').forEach(function (line, idx) {
        line.classList.toggle('active', idx < curIndex);
    });
}

// â”€â”€â”€ QR PAYMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function setQrTotal(total) {
    document.getElementById('qrTotal').textContent = 'Total: ₹' + parseFloat(total).toFixed(2);
    buildQrCode();
}

function buildQrCode() {
    var qrBox = document.getElementById('qrBox');
    qrBox.innerHTML = '';
    var seed = state.orderId
        ? state.orderId.charCodeAt(0) + state.orderId.charCodeAt(state.orderId.length - 1)
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

// â”€â”€â”€ FEEDBACK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    document.getElementById('thankYouMsg').style.display = 'flex';

    setTimeout(resetForNextCustomer, 3000);
}

// â”€â”€â”€ RESET FOR NEXT CUSTOMER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function resetForNextCustomer() {
    state.cart = [];
    state.aiOrderItems = [];
    state.chatHistory = [];
    state.orderId = null;
    state.selectedRating = 0;
    
    // Auto logout feature
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
    
    // Reset login form fields for next customer
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
    
    // Re-check auth to show overlay
    checkAuthStatus();
}

