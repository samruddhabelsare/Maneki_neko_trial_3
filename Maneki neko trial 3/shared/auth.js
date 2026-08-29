// shared/auth.js — Maneki Neko Restaurant Authentication Helper
// Global script (no import/export). Loaded AFTER supabase.js.
// Attaches window.RestaurantAuth to window.

(function () {
    'use strict';

    const SESSION_KEY = 'mneko_session';

    // ── SHA-256 via Web Crypto API (returns hex string) ────────────────────
    async function sha256(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ── Role → module path map ───────────────────────────────────────────────
    const ROLE_MODULE_MAP = {
        admin:       'admin/index.html',
        kds:         'kds/index.html',
        bot_manager: 'bot-management/index.html'
    };

    // ── Login — Multi-Tenant two-step lookup ────────────────────────────────
    // Step 1: Find restaurant by code (e.g. "TOKYO")
    // Step 2: Verify username + PIN hash within that restaurant only
    async function login(restaurantCode, username, pin) {
        if (!restaurantCode || !username || !pin) {
            return { success: false, error: 'Restaurant code, username, and PIN are all required.' };
        }

        const code = restaurantCode.trim().toUpperCase();
        const user = username.trim().toLowerCase();
        const hash = await sha256(pin.toString());

        // ── Step 1: Resolve restaurant by code ──────────────────────────────
        const { data: restaurant, error: restError } = await window.supabaseClient
            .from('restaurants')
            .select('id, name, code')
            .eq('code', code)
            .maybeSingle();

        if (restError) {
            console.error('Restaurant lookup error:', restError.message);
            return { success: false, error: 'Authentication service error. Please try again.' };
        }

        if (!restaurant) {
            return { success: false, error: 'Restaurant code not found. Please check and try again.' };
        }

        // ── Step 2: Verify credential within that restaurant ────────────────
        const { data: credential, error: credError } = await window.supabaseClient
            .from('restaurant_credentials')
            .select('id, username, pin_hash, role')
            .eq('restaurant_id', restaurant.id)
            .eq('username', user)
            .eq('pin_hash', hash)
            .maybeSingle();

        if (credError) {
            console.error('Credential lookup error:', credError.message);
            return { success: false, error: 'Authentication service error. Please try again.' };
        }

        if (!credential) {
            return { success: false, error: 'Invalid username or PIN.' };
        }

        // ── Build session ────────────────────────────────────────────────────
        const session = {
            credentialId:   credential.id,
            restaurantId:   restaurant.id,
            restaurantName: restaurant.name,
            restaurantCode: restaurant.code,
            username:       credential.username,
            role:           credential.role,
            loginAt:        new Date().toISOString()
        };

        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return { success: true, session };
    }

    // ── Logout ───────────────────────────────────────────────────────────────
    function logout() {
        sessionStorage.removeItem(SESSION_KEY);
        const depth = window.location.pathname.split('/').filter(Boolean).length;
        const prefix = depth > 1 ? '../'.repeat(depth - 1) : './';
        window.location.href = prefix + 'login.html';
    }

    // ── Get Session ──────────────────────────────────────────────────────────
    function getSession() {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    // ── Get Restaurant ID ────────────────────────────────────────────────────
    function getRestaurantId() {
        const s = getSession();
        return s ? s.restaurantId : null;
    }

    // ── Require Auth — role guard ────────────────────────────────────────────
    // Call at the top of each module's DOMContentLoaded.
    // allowedRoles: e.g. ['admin'] or ['kds']
    function requireAuth(allowedRoles) {
        const session = getSession();

        if (!session) {
            _redirectToLogin();
            return null;
        }

        if (allowedRoles && !allowedRoles.includes(session.role)) {
            // Authenticated but wrong module — redirect to the correct one
            const correctPath = ROLE_MODULE_MAP[session.role];
            if (correctPath) {
                const depth = window.location.pathname.split('/').filter(Boolean).length;
                const prefix = depth > 1 ? '../'.repeat(depth - 1) : './';
                window.location.href = prefix + correctPath;
            } else {
                _redirectToLogin();
            }
            return null;
        }

        return session;
    }

    // ── Internal redirect to login ───────────────────────────────────────────
    function _redirectToLogin() {
        const current = encodeURIComponent(window.location.href);
        const depth = window.location.pathname.split('/').filter(Boolean).length;
        const prefix = depth > 1 ? '../'.repeat(depth - 1) : './';
        window.location.href = `${prefix}login.html?redirect=${current}`;
    }

    // ── Expose globally ──────────────────────────────────────────────────────
    window.RestaurantAuth = {
        login,
        logout,
        getSession,
        getRestaurantId,
        requireAuth
    };

    console.log('🔐 Maneki Neko — RestaurantAuth loaded (multi-tenant)');
})();
