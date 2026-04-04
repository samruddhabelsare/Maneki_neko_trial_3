# 🐱 Maneki Neko — Smart Restaurant System
## Complete Project Setup Guide

---

> **What is this project?**
> Maneki Neko is an AI-powered smart restaurant ordering system featuring anime personality chatbots (Doraemon, Naruto, Goku). It includes a customer ordering panel with AI voice (ElevenLabs + NVIDIA LLM), an admin dashboard, a Kitchen Display System (KDS), and bot management — all connected to a Supabase backend.

---

## 📁 Project Structure

```
Maneki neko trial 3/
│
├── index.html              ← 🏠 Landing page (project homepage)
├── server.js               ← 🖥️ Node.js server (AI proxy + static files)
├── package.json            ← 📦 Dependencies
├── supabase_seed.sql       ← 🗄️ Database seed (tables + sample data)
│
├── shared/                 ← 🔗 Shared across all modules
│   ├── supabase.js         ←   Supabase client + all DB helper functions
│   └── theme.css           ←   Global Maneki Noir design system
│
├── customer/               ← 🛒 Customer Ordering Panel (AI Chatbot)
│   ├── index.html          ←   Chat UI + Doraemon SVG avatar
│   ├── app.js              ←   AI logic, TTS, emotion system
│   └── style.css           ←   Customer-specific styles
│
├── admin/                  ← 📊 Admin Dashboard
│   ├── index.html          ←   Dashboard UI
│   ├── app.js              ←   Dashboard logic + real-time data
│   └── style.css           ←   Admin styles
│
├── kds/                    ← 🍳 Kitchen Display System
│   ├── index.html          ←   Kitchen order board
│   ├── app.js              ←   Real-time order updates
│   └── style.css           ←   KDS styles
│
└── bot-management/         ← 🤖 Bot Management Panel
    ├── index.html          ←   Bot config UI
    ├── app.js              ←   Bot CRUD operations
    └── style.css           ←   Bot panel styles
```

---

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed:

| Requirement  | Minimum Version | Check Command         | Download Link |
|-------------|----------------|-----------------------|---------------|
| **Node.js**  | v16.0+         | `node --version`      | [nodejs.org](https://nodejs.org/) |
| **npm**      | v8.0+          | `npm --version`       | (comes with Node.js) |
| **Git**      | Any            | `git --version`       | [git-scm.com](https://git-scm.com/) |
| **Browser**  | Chrome/Edge    | —                     | Modern browser with DevTools |

---

## 🚀 Step-by-Step Setup

### Step 1: Clone / Navigate to the Project

```bash
cd "d:\Maneko\Maneki_neko_trial_3\Maneki neko trial 3"
```

If cloning from GitHub:
```bash
git clone <your-repo-url>
cd "Maneki neko trial 3"
```

---

### Step 2: Install Dependencies

```bash
npm install
```

This installs the following packages:
| Package   | Purpose |
|-----------|---------|
| `express` | Local web server + API routing |
| `cors`    | Cross-Origin Resource Sharing |
| `axios`   | HTTP client for proxying AI/Voice API calls |
| `dotenv`  | Environment variable support |

**Expected output:**
```
added 4 packages in 3s
```

---

### Step 3: Verify API Keys

> [!CAUTION]  
> **DO NOT commit API keys to public repositories.** The keys below are hardcoded in `customer/app.js` for development convenience. For production, move them to a `.env` file.

Open `customer/app.js` and verify these constants at the top of the file:

```javascript
// Line 7-8: NVIDIA LLM (Llama 3.3 70B)
const NVIDIA_API_KEY = 'nvapi-xxxx...';           // ← Your NVIDIA NIM API key
const NVIDIA_MODEL = 'meta/llama-3.3-70b-instruct';

// Line 21-23: ElevenLabs Voice Cloning
const ELEVENLABS_API_KEY = 'sk_xxxx...';           // ← Your ElevenLabs API key
const ELEVENLABS_VOICE_ID = '7ddqsJSJmhrKwkSMqFJq'; // ← Doraemon voice ID
```

#### Where to get API keys:

| Service       | Sign Up URL | Free Tier |
|---------------|-------------|-----------|
| **NVIDIA NIM** | [build.nvidia.com](https://build.nvidia.com/) | 1000 free API credits |
| **ElevenLabs** | [elevenlabs.io](https://elevenlabs.io/) | 10,000 characters/month free |

---

### Step 4: Verify Supabase Backend Connection

The Supabase connection is configured in `shared/supabase.js`:

```javascript
// Line 5-8 in shared/supabase.js
window.supabaseClient = window.supabase.createClient(
    'https://znnznynkeamfxrscpnal.supabase.co',   // ← Supabase Project URL
    'eyJhbGciOiJIUzI1NiIs...'                      // ← Supabase Anon Key
);
```

#### How to check if Supabase is working:

1. Open your browser console (F12 → Console tab)
2. After loading any page, run:
   ```javascript
   window.supabaseClient.from('menu_items').select('*').limit(3).then(r => console.log(r))
   ```
3. **✅ If working:** You'll see `{ data: [...], error: null }`
4. **❌ If failing:** You'll see `{ data: null, error: { message: "..." } }`

#### Troubleshooting Supabase:

| Problem | Solution |
|---------|----------|
| `relation "menu_items" does not exist` | Run `supabase_seed.sql` in Supabase SQL Editor |
| `Invalid API key` | Verify the anon key in `shared/supabase.js` |
| `Network error` | Check internet connection / Supabase dashboard status |

#### How to seed the database (first-time only):

1. Go to [app.supabase.com](https://app.supabase.com) → Your Project → SQL Editor
2. Copy the contents of `supabase_seed.sql`
3. Paste and click **Run**
4. This creates all tables: `menu_items`, `orders`, `bots`, `customers`, `feedback`, `restaurant_info`

---

### Step 5: Start the Local Server

```bash
npm start
```

**Expected output:**
```
==================================================
       MANEKI NEKO — SMART RESTAURANT
       Local Server & AI Proxy
==================================================

🚀 Server running at: http://localhost:3000
📂 Static files:      D:\Maneko\Maneki_neko_trial_3\Maneki neko trial 3
🤖 AI Proxy:          http://localhost:3000/api/proxy
🎙️ Voice Proxy:       http://localhost:3000/api/elevenlabs

Use "npm start" to keep this server running.
```

> [!IMPORTANT]  
> **Keep this terminal open!** The server must stay running while you use the app. Do NOT close this terminal window.

---

### Step 6: Open the Application

| Module | URL | Description |
|--------|-----|-------------|
| 🏠 **Landing Page** | [http://localhost:3000/](http://localhost:3000/) | Project homepage with links to all modules |
| 🛒 **Customer Panel** | [http://localhost:3000/customer/index.html](http://localhost:3000/customer/index.html) | AI chatbot ordering (Doraemon) |
| 📊 **Admin Dashboard** | [http://localhost:3000/admin/index.html](http://localhost:3000/admin/index.html) | Restaurant management |
| 🍳 **Kitchen Display** | [http://localhost:3000/kds/index.html](http://localhost:3000/kds/index.html) | Kitchen order board |
| 🤖 **Bot Management** | [http://localhost:3000/bot-management/index.html](http://localhost:3000/bot-management/index.html) | Configure AI bots |

---

## ⚠️ Precautions Before Launching

> [!WARNING]  
> **Read these BEFORE opening `customer/index.html`**

### 1. Always use `localhost:3000` — NEVER open files directly

```
❌ WRONG:  Double-clicking index.html (opens as file:///...)
✅ RIGHT:  http://localhost:3000/customer/index.html
```

**Why?** Opening HTML files directly (`file://`) causes:
- CORS errors blocking all API calls
- Voice output (ElevenLabs) will fail completely
- Supabase CDN may not load
- Streaming responses won't work

### 2. Browser Audio requires a user click first

Browsers block autoplay audio until the user interacts with the page. When you:
1. Open the Customer Panel → click **"Start Ordering"** button first
2. This user interaction unlocks audio playback
3. After that, Doraemon's voice will work normally

### 3. Allow microphone for voice input

When using the 🎙️ voice button for speech-to-text:
- Browser will ask for microphone permission → **Click Allow**
- Works best in Chrome/Edge
- Speak clearly in English or Hindi

### 4. Don't close the terminal

The `npm start` terminal MUST stay open. If you close it:
- All AI chat will stop working
- Voice output will fail
- You'll see "Network error" messages

### 5. ElevenLabs API has usage limits

| Plan | Character Limit | Voice Cloning |
|------|----------------|---------------|
| Free | 10,000 chars/month | 3 voices |
| Starter | 30,000 chars/month | 10 voices |

If you exceed your quota:
- Voice will automatically fallback to browser Speech Synthesis
- Check usage at [elevenlabs.io/app/usage](https://elevenlabs.io/app/usage)

### 6. NVIDIA API has credit limits

- **Free tier:** 1000 API credits
- If credits are exhausted, AI chat shows: `⚠️ AI error (402)`
- Get more credits at [build.nvidia.com](https://build.nvidia.com/)

---

## 🧪 How to Verify Everything Works

### Test 1: Check the Server is Running

```bash
# In a NEW terminal (don't close the server):
curl http://localhost:3000/
```
**✅ Pass:** Returns HTML content
**❌ Fail:** "Connection refused" — server is not running

### Test 2: Check the AI Proxy (LLM)

Open browser console (F12) on any `localhost:3000` page and run:

```javascript
fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        url: 'https://integrate.api.nvidia.com/v1/chat/completions',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer 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',
            'Content-Type': 'application/json'
        },
        data: {
            model: 'meta/llama-3.3-70b-instruct',
            messages: [{ role: 'user', content: 'Say hello in 5 words' }],
            max_tokens: 50,
            stream: false
        }
    })
}).then(r => r.json()).then(d => console.log('✅ AI WORKING:', d.choices[0].message.content))
  .catch(e => console.error('❌ AI FAILED:', e));
```

**✅ Pass:** Shows a greeting from the AI
**❌ Fail:** Check API key or internet connection

### Test 3: Check the Voice Proxy (ElevenLabs)

```javascript
fetch('/api/elevenlabs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        voiceId: '7ddqsJSJmhrKwkSMqFJq',
        apiKey: 'sk_7907cde58828b06b04e0787ac1f01a47c0e7cd39a83d7628',
        text: 'Hello test',
        modelId: 'eleven_multilingual_v2'
    })
}).then(r => {
    console.log('Status:', r.status, 'Type:', r.headers.get('content-type'));
    return r.blob();
}).then(b => console.log('✅ VOICE WORKING! Audio size:', b.size, 'bytes'))
  .catch(e => console.error('❌ VOICE FAILED:', e));
```

**✅ Pass:** Shows `Audio size: ~50000+ bytes`
**❌ Fail:** Check ElevenLabs API key or quota

### Test 4: Check the Supabase Backend

```javascript
window.supabaseClient.from('menu_items').select('count', { count: 'exact', head: true })
    .then(r => {
        if (r.error) console.error('❌ SUPABASE FAILED:', r.error.message);
        else console.log('✅ SUPABASE WORKING! Menu items:', r.count);
    });
```

**✅ Pass:** Shows item count (e.g., `Menu items: 25`)
**❌ Fail:** Check Supabase URL/key in `shared/supabase.js`

---

## 🔧 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `All CORS proxies failed` | Not using local server | Use `npm start` and open via `localhost:3000` |
| No voice output | Browser autoplay blocked | Click "Start Ordering" button first |
| `AI error (402)` | NVIDIA credits exhausted | Get more at [build.nvidia.com](https://build.nvidia.com/) |
| `AI error (401)` | Invalid API key | Verify `NVIDIA_API_KEY` in `customer/app.js` |
| Menu is empty | Supabase not seeded | Run `supabase_seed.sql` in SQL Editor |
| `Cannot find module 'express'` | Dependencies not installed | Run `npm install` |
| Port 3000 already in use | Another process on port 3000 | Kill it: `npx kill-port 3000` then `npm start` |
| Voice fallback to robotic | ElevenLabs quota exceeded | Check quota at elevenlabs.io |
| `window.getMenu is not a function` | supabase.js didn't load | Check network tab for 404 on supabase.js |

---

## 🔄 Quick Start Cheat Sheet

```bash
# 1. Navigate
cd "d:\Maneko\Maneki_neko_trial_3\Maneki neko trial 3"

# 2. Install (first time only)
npm install

# 3. Start server
npm start

# 4. Open in browser
# Customer Panel:  http://localhost:3000/customer/index.html
# Admin Dashboard: http://localhost:3000/admin/index.html
# Kitchen Display: http://localhost:3000/kds/index.html
# Bot Management:  http://localhost:3000/bot-management/index.html
```

---

## 🛑 How to Stop the Server

Press `Ctrl + C` in the terminal where `npm start` is running.

To restart:
```bash
npm start
```

If port 3000 is stuck:
```bash
npx kill-port 3000
npm start
```

---

## 📝 Notes for Development

- **Hot reload:** The server serves static files. Just refresh the browser after editing HTML/CSS/JS.
- **No build step:** This is a vanilla HTML/CSS/JS project. No webpack, no bundler.
- **API keys in code:** For production, move all API keys to a `.env` file and load via `process.env`.
- **Supabase real-time:** Admin and KDS modules use Supabase real-time subscriptions for live order updates.

---

*Last updated: April 4, 2026*
