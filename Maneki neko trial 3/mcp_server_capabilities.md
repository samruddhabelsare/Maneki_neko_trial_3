# Maneki Neko MCP Server — Full Capabilities Reference

**Live URL:** `https://mcp-server-for-maneki-neko.onrender.com`  
**Docs UI:** `https://mcp-server-for-maneki-neko.onrender.com/docs`  
**Protocol Version:** MCP 1.0 (Model Context Protocol) & OpenAPI / REST

---

## 1. Architecture Overview

The Maneki Neko MCP server operates across **two distinct architectural layers**:

| Layer | Protocol | Purpose | Primary Consumers |
| :--- | :--- | :--- | :--- |
| **REST API** | HTTP / JSON & SSE | Session lifecycle, manual cart operations, and streaming AI waiter chat | Customer web frontend (`app.js`), table tablets |
| **MCP Tools** | JSON-RPC 2.0 / MCP | Model context tools called autonomously during agentic reasoning | AI Orchestrator, NVIDIA NIM, external MCP clients |

```
[Customer Frontend / Tablet UI]
        │
        │ 1. POST /sessions/{id}/chat (SSE Stream)
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ FastAPI Gateway & Orchestrator                                   │
│                                                                  │
│  ├─ Multi-tier TTLCache (Menu, Sessions, Profiles, Prompts)      │
│  ├─ Concurrent setup via asyncio.gather (Profile + Menu + Hist)  │
│  ├─ Shared keep-alive HTTP client with HTTP/2 negotiation        │
│  ├─ Direct token streaming (sub-1s TTFT, thinking suppressed)    │
│  └─ Per-session async mutex lock for draft consistency           │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────┴────────────────────────────────┐
│ Model Context Protocol (MCP) Tools Layer                         │
│                                                                  │
│  ├─ /mcp/customer (10 Customer Tools — draft, menu, status, recs)│
│  └─ /mcp/admin    (9 Admin Tools — orders, billing, catalog)     │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
                 [Postgres / Supabase RPC Engine]
       (draft_apply FOR UPDATE, confirm_draft, Live catalog)
```

---

## 2. Real-Time Streaming & Latency Capabilities

The server includes high-performance optimizations targeting **sub-1-second Time-To-First-Token (TTFT)**:

- **True SSE Streaming**: Direct token-by-token piping (`event: token`) from NVIDIA NIM to client without buffering delays.
- **Thinking / CoT Suppression**: Automatic `chat_template_kwargs: {"thinking": False}` flag for Nemotron models eliminates internal reasoning dumps and immediately streams conversational dialogue.
- **Pre-Tool Immediate Response**: Persona guidelines enforce a conversational acknowledgement sentence (e.g. *"Let me check that right away!"*) that streams before tool execution runs.
- **Multi-Tier In-Memory TTLCache**: Thread-safe caching with monotonic expiration for menus (`45s`), sessions (`30s`), customer profiles (`120s`), dish popularity (`300s`), and static prompts. Automatically pre-warmed on server startup.
- **Atomic Draft Mutations**: Single round-trip Postgres RPC (`draft_apply`) with row-level locks (`SELECT ... FOR UPDATE`), serializing cart modifications without lost updates.
- **Immediate Draft Events**: When a tool mutates a cart, an `event: draft` is emitted immediately before the next model generation round.

---

## 3. REST Endpoints (Frontend & Client Integration)

### 🔐 Authentication Pattern
All session-scoped endpoints accept an optional bearer token:
`Authorization: Bearer <session_id>`

---

### 1. Health & Readiness Check
```http
GET /healthz
```
- **Response**: `{ "status": "ok", "uptime_seconds": 1240.5, "supabase": "connected", "version": "0.1.0" }`
- Returns `503 Service Unavailable` if Supabase database connectivity fails.

---

### 2. Session Management

#### Create Session
```http
POST /sessions
Content-Type: application/json

{
  "restaurant_id": "e709b814-b895-4c2a-bec2-dad69019ccde",
  "table_number": 3,
  "phone": "+919876543210",    // Optional: links returning customer profile
  "name": "Riya",              // Optional: customer name
  "preferences": ["spicy"],    // Optional: dietary preferences
  "character": "neko",         // Persona: "neko" | "sakura" | "hiro" | "yuki"
  "guest": false               // true = anonymous session, no profile saved
}
```
- **Response**:
  ```json
  {
    "session_id": "923b17bd-a33c-4c9e-a322-02115353bffe",
    "restaurant_id": "e709b814-b895-4c2a-bec2-dad69019ccde",
    "table_number": 3,
    "customer_id": "c1a2b3c4-...",
    "character": "neko",
    "expires_at": "2026-10-09T01:00:00Z"
  }
  ```

#### Get Conversation History (for tab restores / page refreshes)
```http
GET /sessions/{id}/messages
Authorization: Bearer <session_id>
```
Returns chronological message objects: `[ { "id": "...", "role": "user" | "assistant" | "tool", "content": "..." } ]`.

#### Get Customer Order History (past visits)
```http
GET /sessions/{id}/history
Authorization: Bearer <session_id>
```
Returns past confirmed orders for the authenticated customer profile.

---

### 3. Streaming Chat (AI Waiter)
```http
POST /sessions/{id}/chat
Authorization: Bearer <session_id>
Content-Type: application/json

{
  "message": "Can I get 2 bowls of Spicy Tonkotsu Ramen?"
}
```

**Response Stream (`text/event-stream`):**

| Event | Data Payload | Description |
| :--- | :--- | :--- |
| `event: token` | `{"token": "Sure"}` | Real-time text token emitted as generated. Spacing preserved. |
| `event: draft` | `{"draft": {"draft_id": "...", "items": [...], "total": 650.0, "item_count": 2}}` | Emitted immediately whenever an item is added, changed, or removed. |
| `event: done` | `{"message": "I added 2 Spicy Tonkotsu Ramens...", "timing": {...}}` | Stream termination with full accumulated message (and timing metrics if enabled). |
| `event: error` | `{"ok": false, "error": "...", "message": "..."}` | Emitted on unrecoverable generation or timeout errors. |

**Timing Breakdown in `event: done` (when `DEBUG_TIMING=true`):**
```json
{
  "message": "2 Spicy Tonkotsu Ramens have been added to your draft cart!",
  "timing": {
    "setup_ms": 14.5,
    "ttft_ms": 420.2,
    "nim_first_byte_ms": 380.0,
    "tools": [
      { "tool": "add_item", "duration_ms": 41.5 }
    ],
    "cache": {
      "menu": { "hits": 4, "misses": 1, "hit_rate": 0.8, "size": 1 },
      "session": { "hits": 6, "misses": 0, "hit_rate": 1.0, "size": 1 }
    }
  }
}
```

---

### 4. Manual Draft Panel Operations (UI +/- Buttons)

#### View Current Open Draft
```http
GET /sessions/{id}/draft
```
Returns current items, line subtotals, and total price.

#### Set Item Quantity (from UI +/- buttons)
```http
PATCH /sessions/{id}/draft/items/{item_name}
Content-Type: application/json

{ "qty": 3 }
```
*Note: Setting `qty: 0` automatically removes the item.*

#### Remove Item Completely (from UI ✕ button)
```http
DELETE /sessions/{id}/draft/items/{item_name}
```

---

### 5. Order Lifecycle & Checkout

#### Confirm Order (Customer taps "Place Order")
```http
POST /sessions/{id}/confirm
Authorization: Bearer <session_id>
```
- Executes atomic Postgres `confirm_draft` RPC.
- **Safety Guarantee:** Re-reads prices from live `menu_items` table and recalculates total (never relies on client or cached prices).
- **Idempotent:** Safe to call multiple times without double-ordering.
- **Response:** `{ "ok": true, "order": { "id": "...", "status": "pending", "items": [...], "total_amount": 700.0 } }`

#### Poll Order Kitchen Status
```http
GET /orders/{id}/status
```
Order statuses follow the strict state machine:  
`pending` ➔ `preparing` ➔ `ready` ➔ `delivered` ➔ `billed`

#### Mark Order as Billed (Cashier / Terminal)
```http
POST /orders/{id}/mark-billed
Content-Type: application/json

{ "payment_method": "cash" }   // "cash" | "card" | "upi"
```

---

### 6. Customer Feedback
```http
POST /orders/{id}/feedback
Content-Type: application/json

{
  "rating": 5,
  "comment": "The ramen was fantastic and the service was super fast!"
}
```
*Rating must be an integer between 1 and 5.*

---

## 4. MCP Tools Reference (Model Context Protocol)

The server exposes **19 registered MCP tools** across two distinct MCP servers:

### A. Customer MCP Tools (`/mcp/customer`) — 10 Tools
Bound to the customer's active session. The model invokes these during the conversational loop.

| Tool Name | Parameters | Purpose |
| :--- | :--- | :--- |
| `get_customer_context` | `{}` | Retrieves customer profile, visit count, dietary preferences, and top favorite dishes. |
| `search_menu` | `query?`, `category?`, `veg_only?`, `spicy?`, `max_price?`, `limit?` | Searches available dishes using combined multi-attribute filters. |
| `get_menu_item` | `name` | Resolves item by name via exact ➔ prefix ➔ contains matching with ambiguity detection. |
| `get_current_order` | `{}` | Returns open draft order items, subtotals, and total price. |
| `add_item` | `name`, `qty?`, `instructions?` | Validates live menu availability and adds item to draft with special instructions (max 200 chars). |
| `remove_item` | `name` | Completely removes an item from the open draft cart. |
| `set_quantity` | `name`, `qty` | Sets absolute quantity for an item (0 removes). Validates live availability. |
| `clear_order` | `{}` | Clears all items from the current open draft cart. |
| `get_order_status` | `{}` | Checks the kitchen preparation status of the latest active confirmed order. |
| `recommend_dishes` | `veg_only?`, `exclude_spicy?`, `limit?` | Recommends dishes based on customer order history, dietary preferences, and popularity. |

### B. Admin MCP Tools (`/mcp/admin`) — 9 Tools
Protected by header `X-Admin-Key: <ADMIN_API_KEY>`. Used by manager / kitchen dashboards.

| Tool Name | Parameters | Purpose |
| :--- | :--- | :--- |
| `list_orders` | `status?`, `table_number?`, `active_only?`, `limit?` | Lists orders filtered by status or table number. |
| `get_order` | `order_id` | Fetches full order details including line items, customer phone, and table. |
| `update_order_status` | `order_id`, `status` | Advances order through `pending` ➔ `preparing` ➔ `ready` ➔ `delivered`. |
| `mark_billed` | `order_id`, `payment_method?` | Records payment (`cash`, `card`, `upi`) and marks order as billed. |
| `sales_summary` | `days?` | Generates revenue analytics, order counts, and top-selling dishes. |
| `feedback_summary` | `days?` | Computes average customer rating, rating distributions, and recent comments. |
| `set_item_availability` | `name`, `is_available` | Updates dish availability (sold out vs available) and busts menu cache. |
| `update_item_price` | `name`, `price` | Updates dish price, takes effect immediately, and busts menu cache. |
| `get_menu` | `include_unavailable?` | Dumps full restaurant menu with allergen and category metadata. |

---

## 5. Personas & Character Voice

Set the persona using the `character` field in `POST /sessions`:

| Persona ID | Character | Tone & Speech Style |
| :--- | :--- | :--- |
| `neko` | **Maneki Neko** | Cheerful, kawaii lucky cat robot waiter. Warm hospitality, subtle cat charm, action asterisks (`*waves paw*`), and emotion tags (`[happy]`). |
| `sakura` | **Sakura** | Elegant, poetic, serene, and gracious. Speaks with polite refinement. |
| `hiro` | **Chef Hiro** | Passionate, culinary-focused, confident. Explains dish flavor profiles and culinary craft. |
| `yuki` | **Yuki** | Calm, minimalist, efficient, and precise. Direct and clear communication. |

### Domain Behavior Rules
1. **Never Confirms Orders Unprompted**: The AI informs customers that items are in their draft order and directs them to tap the on-screen "Confirm Order" button.
2. **Serving Size Invariance**: Suffixes like `(2pcs)` or `(4pcs)` represent portion sizes only and do not multiply order quantities.
3. **No Unicode Emojis**: Personas use bracket tags (`[happy]`, `[thinking]`) and asterisks (`*bows*`) instead of Unicode emojis to ensure frontend avatar animation compatibility.
4. **Hinglish & Multilingual**: Fully parses Hinglish (e.g., *"Bhai ek spicy ramen laga do"*, *"2 aur le aao"*).
5. **Direct Speech Only**: Internal monologue, reasoning traces, or thinking processes are strictly suppressed.

---

## 6. Environment Variables Reference

| Variable | Description | Default |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Supabase project URL | *(Required)* |
| `SUPABASE_SERVICE_KEY` | Supabase service-role key (server-only) | *(Required)* |
| `ADMIN_API_KEY` | Protects `/mcp/admin` and admin REST routes | *(Required)* |
| `INTERNAL_MCP_TOKEN` | Bearer token for Orchestrator ➔ `/mcp/customer` | *(Required)* |
| `NVIDIA_API_KEY` | API key for NVIDIA NIM inference | `""` |
| `NVIDIA_MODEL` | NIM model identifier | `nvidia/nemotron-3.5-lightning-30b-a3b` |
| `NVIDIA_ENDPOINT` | NIM chat completions endpoint | `https://integrate.api.nvidia.com/v1/chat/completions` |
| `NIM_STREAM` | Enable true SSE streaming from NVIDIA NIM | `true` |
| `NIM_MAX_TOKENS` | Max tokens generated per turn | `200` |
| `TOOL_TIMEOUT_S` | Per-tool execution timeout in seconds | `5.0` |
| `DEBUG_TIMING` | Attach timing analytics in `event: done` | `false` |
| `HISTORY_MESSAGES` | Number of previous conversation turns in context | `20` |
| `MENU_CACHE_TTL` | Menu catalog TTL in seconds | `45` |
| `SESSION_CACHE_TTL` | Session validity TTL in seconds | `30` |
| `PROFILE_CACHE_TTL` | Customer profile cache TTL in seconds | `120` |
| `POPULARITY_CACHE_TTL` | Popularity scores cache TTL in seconds | `300` |
| `MENU_IN_PROMPT_MAX` | Max items before switching to category-only snapshot | `60` |
| `CORS_ORIGINS` | Comma-separated allowed CORS origins | `http://localhost:3000` |
| `SESSION_TTL_HOURS` | Session lifespan in hours | `6` |
| `LOG_LEVEL` | Application logging level | `INFO` |
| `PORT` | Web server listening port | `8000` |
