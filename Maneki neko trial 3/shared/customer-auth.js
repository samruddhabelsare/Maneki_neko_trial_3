// shared/customer-auth.js — Maneki Neko Customer Session Helper
// Manages which restaurant and table a customer is sitting at.
// No PIN needed for customers — just Restaurant Code + Table Number.

(function () {
    'use strict';

    const SESSION_KEY = 'mneko_customer_session';

    // ── Start a customer session ──────────────────────────────────────────────
    // Called by customer-login.html after validating restaurant code + table
    function startSession(restaurantId, restaurantName, restaurantCode, tableNumber, tableLabel) {
        const session = {
            restaurantId,
            restaurantName,
            restaurantCode,
            tableNumber: parseInt(tableNumber, 10),
            tableLabel: tableLabel || ('Table ' + tableNumber),
            startedAt: new Date().toISOString()
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return session;
    }

    // ── Get current customer session ──────────────────────────────────────────
    function getSession() {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    // ── Clear session ─────────────────────────────────────────────────────────
    function clearSession() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    // ── Require session — guard for customer/index.html ───────────────────────
    // If no valid session, redirect to customer-login.html
    function requireSession() {
        const session = getSession();
        if (!session || !session.restaurantId || !session.tableNumber) {
            const depth = window.location.pathname.split('/').filter(Boolean).length;
            const prefix = depth > 1 ? '../'.repeat(depth - 1) : './';
            window.location.href = prefix + 'customer-login.html';
            return null;
        }
        return session;
    }

    window.CustomerAuth = {
        startSession,
        getSession,
        clearSession,
        requireSession
    };

    console.log('🐱 Maneki Neko — CustomerAuth loaded');
})();
