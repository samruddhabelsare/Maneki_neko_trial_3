# Maneki Neko — Design System: "Kami to Sumi" (紙と墨)

> Reference for anyone touching the UI. The live implementation is `shared/theme.css`, `shared/icons.css`,
> `shared/icons.svg`, `shared/maneki.svg`; open `/shared/brand-preview.html` on the running server to see
> every icon, seal, button and the mascot. Page-specific CSS lives in each page's `<style>` block.
>
> **Note (Oct 2026):** the shipped UI no longer shows any Japanese text. Kanji/kana labels, bilingual captions and
> tategaki watermarks described below were removed; seals now carry Latin glyphs (M, 1 2 3, T, !) and status badges
> show English only. The visual system (paper/lacquer, hanko seals, noren tabs, lanterns, mascot) is unchanged.

> **Governing rule:** paper = document · lacquer = container · red = seal or commit · gold = seam · ≤ 40 % of any viewport is paper.
>
> Keep the DOM contracts: every `id`, class, `data-*` attribute and inline `display` mechanism the page JS relies on
> must survive restyles (the JS rebuilds KDS tickets every 4 s, admin orders every 5 s, bot cards every 15 s —
> never animate those on re-render).


---

## 1. Design thesis

The restaurant is a dark lacquered room; everything you *act on* is paper. Order slips, bills, menu cards, name plates, tickets and login forms are cream **washi** with **sumi** ink. Everything that *holds* them (headers, sidebars, columns, drawers, tables) is warm charcoal lacquer. Vermilion (shu) is reserved for three things only: **hanko seals**, the **one committing action** on a view (Sign In, Place Order, Start Preparing) and the **fire state** (preparing / urgent). Gold (kin) is kintsugi: hairlines, focus rings, the bell, the koban coin. The room is lit, not decorated: lantern-glow pools hang from every app header and from the entrance screens, so the product reads as a night-time izakaya rather than a dark dashboard.

Governing rule, written once into `theme.css` as a comment and obeyed everywhere:

> **paper = document · lacquer = container · red = seal or commit · gold = seam · ≤ 40 % of any viewport is paper.**

This one rule gives each audience what it needs: a chef reads black ink on cream from three metres; a guest holds something that feels like a hand-written bill; a manager sees a calm desk of tagged papers. All of it is CSS gradients, three tiny data-URI tiles, one brush-stroke SVG, one ensō, one lucky cat and one icon sprite. Nothing in the JS DOM contracts changes.

Grafts from the two losing concepts are called out inline as **[C1]** (Izakaya at Dusk) and **[C3]** (SHU-IN).

---

## 2. Tokens — complete `:root` for `shared/theme.css`

Replace the `@import` line and the whole `:root` block with the following. Every existing token keeps its name; values marked `/* CHANGED */` differ from today.

```css
@import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600;700&family=Noto+Sans+JP:wght@400;500;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

/* KAMI TO SUMI — paper = document · lacquer = container · red = seal/commit · gold = seam · ≤40% paper per viewport */
:root {
  /* Surfaces — sumi lacquer */
  --bg-deep: #100d0c;  --bg-surface: #1a1614;  --bg-surface-low: #141110;
  --bg-surface-container: #1c1816;  --bg-surface-high: #231e1b;
  --bg-surface-highest: #2b2521;  --bg-surface-bright: #352e29;  --bg-surface-variant: #2b2521;
  --lintel: #2a1f19;                                  /* NEW: app header / sidebar brand band */

  /* Glass (kept for compatibility; only modal/drawer backdrops still blur) */
  --glass-bg: rgba(30,25,22,0.62);  --glass-bg-strong: rgba(43,37,33,0.7);
  --glass-blur: blur(12px);                           /* CHANGED from 18px */
  --glass-border: rgba(240,220,190,0.09);  --glass-border-hover: rgba(240,190,120,0.28);

  /* Primary — vermilion (shu) */
  --primary: #ff7a5c;  --primary-container: #ff6a47;  --primary-dim: #b32a14;
  --primary-fixed: #ff6a47;  --primary-fixed-dim: #e8512f;  --primary-raw: #d63a1f;
  --primary-glow: rgba(214,58,31,0.18);  --primary-glow-strong: rgba(214,58,31,0.34);
  --on-primary: #ffffff;
  --shu: #d63a1f;  --shu-ink: #b3301a;  --shu-deep: #8f2211;   /* NEW: fill / text-on-paper / pressed */

  /* Secondary — gold (kin) */
  --secondary: #e3b55a;  --secondary-container: #6b4e12;  --on-secondary: #2a1d00;
  --kin: #e3b55a;  --kin-bright: #f3d58a;  --kin-dim: #a8832f;  --kin-ink: #6b4e12;   /* NEW */
  --lantern: #ffb347;  --lantern-glow: rgba(255,179,71,0.22);  --lantern-glow-strong: rgba(255,179,71,0.48); /* NEW [C1] */

  /* Tertiary — sakura */
  --tertiary: #f3b9c8;  --tertiary-container: #e99bb0;  --on-tertiary: #4a1426;
  --sakura: #f3b9c8;  --momo: #e99bb0;                  /* NEW aliases */

  /* Traditional supporting hues (nihon no iro) — NEW */
  --ai: #2b4a6f;        --ai-text: #7fa3c8;
  --matcha: #7a9a3c;    --matcha-bright: #9fbf5a;  --matcha-ink: #4a6420;
  --ume: #b84a5c;       --ume-light: #e07a8a;      --ume-ink: #8f3140;
  --kuchiba: #c8923e;   --kuchiba-ink: #7a5418;
  --nezumi: #8a8580;    --nezumi-text: #a39e97;    --nezumi-ink: #6a5f55;
  --daidai: #e0772b;

  /* Washi paper surfaces + sumi ink — NEW */
  --washi: #efe6d6;  --washi-bright: #f6efe2;  --washi-2: #e4d9c4;
  --washi-line: rgba(28,24,22,0.14);  --washi-line-strong: rgba(28,24,22,0.32);
  --sumi-ink: #1c1816;  --sumi-ink-2: #3a332e;  --sumi-ink-3: #6a5f55;

  /* Veg / non-veg (FSSAI marks) — NEW; dark-surface and paper variants */
  --veg: #3fae5a;  --nonveg: #e04a3a;  --veg-ink: #2e7d32;  --nonveg-ink: #c62828;  --spicy: #e0772b;

  /* Character crests (kamon) — NEW [C3]; Shinchan on sakura, never danger red */
  --c-naruto: #e0772b;  --c-goku: #e3b55a;  --c-doraemon: #2b4a6f;  --c-doraemon-text: #7fa3c8;
  --c-shinchan: #e99bb0;  --c-luffy: #d63a1f;  --c-luffy-text: #ff7a5c;

  /* Order-status seals: colour on dark · colour on paper · kanji — NEW [C3] */
  --st-pending: #c8923e;    --st-pending-ink: #7a5418;    --st-pending-ja: "待";
  --st-preparing: #ff7a5c;  --st-preparing-ink: #b3301a;  --st-preparing-ja: "調";
  --st-ready: #9fbf5a;      --st-ready-ink: #4a6420;      --st-ready-ja: "完";
  --st-delivered: #a39e97;  --st-delivered-ink: #6a5f55;  --st-delivered-ja: "済";
  --st-billed: #e3b55a;     --st-billed-ink: #6b4e12;     --st-billed-ja: "払";
  --st-cancelled: #e07a8a;  --st-cancelled-ink: #8f3140;  --st-cancelled-ja: "取消";
  --st-online: #9fbf5a;  --st-online-ja: "稼";  --st-offline: #a39e97;  --st-offline-ja: "停";  --st-charging: #c8923e;  --st-charging-ja: "充";

  /* Text — washi tones */
  --text-primary: #f7efe4;  --text-secondary: #cbbfb0;  --text-muted: #9d9183;
  --text-dimmed: #8a7f72;                              /* CHANGED from #6f655a (3.15:1 → 4.59:1) */
  --text-ghost: #5a5047;                               /* NEW: decorative watermarks only */

  /* Semantic (kept; values mapped to the Japanese hues) */
  --success: #4fb98a;  --success-bg: rgba(79,185,138,0.13);  --success-border: rgba(79,185,138,0.3);
  --warning: #e8a838;  --warning-bg: rgba(232,168,56,0.13);  --warning-border: rgba(232,168,56,0.3);
  --danger: #ef5350;   --danger-bg: rgba(239,83,80,0.13);    --danger-border: rgba(239,83,80,0.3);
  --info: #5b9bd5;     --info-bg: rgba(91,155,213,0.13);     --info-border: rgba(91,155,213,0.3);

  /* Border & outline */
  --border: rgba(240,220,190,0.08);  --border-hover: rgba(240,220,190,0.16);
  --outline: #9d9183;  --outline-variant: #5a5047;
  --kin-hair: rgba(227,181,90,0.32);  --kin-hair-soft: rgba(227,181,90,0.14);   /* NEW */

  /* Shapes */
  --radius-xs: 6px;  --radius-sm: 8px;  --radius-md: 12px;  --radius-lg: 16px;
  --radius-xl: 20px;  --radius-2xl: 24px;  --radius-pill: 9999px;
  --radius-paper: 4px;  --radius-seal: 3px;                 /* NEW: paper is cut, seals are square */

  /* Shadows */
  --shadow-ambient: 0 4px 12px rgba(0,0,0,0.5), 0 20px 40px rgba(0,0,0,0.35);
  --shadow-soft: 0 1px 3px rgba(0,0,0,0.45);
  --shadow-glow: 0 0 24px var(--primary-glow);  --shadow-glow-strong: 0 0 32px var(--primary-glow-strong);
  --shadow-card: 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,235,205,0.04);
  --shadow-card-hover: 0 10px 34px rgba(0,0,0,0.45), 0 0 0 1px var(--glass-border-hover);
  --shadow-2xl: var(--shadow-ambient);                      /* NEW: fixes undefined token in customer-login.html */
  --shadow-paper: inset 0 1px 0 rgba(255,250,240,0.45), 0 1px 2px rgba(0,0,0,0.35), 0 10px 26px rgba(0,0,0,0.30);
  --shadow-paper-lift: inset 0 1px 0 rgba(255,250,240,0.45), 0 2px 4px rgba(0,0,0,0.35), 0 18px 40px rgba(0,0,0,0.38);
  --shadow-seal: 0 2px 0 var(--shu-deep), 0 6px 16px rgba(214,58,31,0.28);
  --shadow-lantern: 0 0 18px var(--lantern-glow), 0 0 42px var(--lantern-glow);
  --ring-kin: 0 0 0 2px var(--bg-deep), 0 0 0 4px var(--kin);
  --ring-shu: 0 0 0 2px var(--washi), 0 0 0 4px var(--shu-ink);

  /* Z plan (grain stays at 9999) */
  --z-room: 0;  --z-header: 30;  --z-sheet: 50;  --z-modal: 70;  --z-overlay: 9000;  --z-toast: 10000;
  --header-h: 56px;  --chat-input-h: 72px;

  /* Motion */
  --ease-out: cubic-bezier(0.4,0,0.2,1);  --ease-spring: cubic-bezier(0.34,1.56,0.64,1);
  --duration-fast: 0.15s;  --duration-normal: 0.25s;  --duration-slow: 0.4s;

  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-display: 'Shippori Mincho', 'Noto Serif JP', 'Hiragino Mincho ProN', Georgia, serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  --font-jp: 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;      /* NEW */
  --tracking-tight: -0.01em;  --tracking-normal: 0;  --tracking-wide: 0.06em;
  --tracking-display: 0.01em;  --tracking-eyebrow: 0.16em;                   /* NEW */

  /* Textures — data-URI SVG (markup to URL-encode is given below) */
  --seigaiha: url("...existing SVG, stroke-opacity 0.09 → 0.14...");       /* CHANGED */
  --asanoha: url("...");  --washi-fibre: url("...");  --brush-rule-sumi: url("...");
  --brush-rule-kin: url("...");  --enso-bg: url("...");  --petal: url("...");
  --mn-resting: url("...");  --kama: url("...");  --obon: url("...");         /* KDS empty-state line art [C1] */
}
```

**SVG markup to encode into the texture tokens** (URL-encode `#`→`%23`, `<`→`%3C`, `>`→`%3E`, `"`→`'`):

- `--asanoha` (hemp-leaf lattice, 56×97 tile): `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='97' viewBox='0 0 56 97'><g fill='none' stroke='#e3b55a' stroke-opacity='.07' stroke-width='1'><path d='M28 0v97M0 24.25l56 48.5M56 24.25L0 72.75M0 24.25h56M0 72.75h56M28 0L0 24.25M28 0l28 24.25M28 97L0 72.75M28 97l28-24.25M28 48.5L0 24.25M28 48.5l28-24.25M28 48.5L0 72.75M28 48.5l28 24.25'/></g></svg>`
- `--washi-fibre` (the ONLY texture on paper; one feTurbulence tile, alpha ≤ .18, no blend mode needed): `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.36  0 0 0 0 0.29  0 0 0 0 0.21  0 0 0 0.18 0'/></filter><rect width='100%' height='100%' filter='url(#p)'/></svg>`
- `--brush-rule-sumi` (8px-tall brush line, stretched): `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 8' preserveAspectRatio='none'><path d='M2 5C40 1 90 7 140 4S260 2 330 5 390 6 398 3' fill='none' stroke='#1c1816' stroke-width='2.2' stroke-linecap='round' opacity='.85'/></svg>`; `--brush-rule-kin` = same path, `stroke='#e3b55a' opacity='.7'`.
- `--enso-bg`: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M50 8a42 42 0 1 0 31 13' fill='none' stroke='#e3b55a' stroke-width='5' stroke-linecap='round' opacity='.35'/><path d='M50 8a42 42 0 1 0 31 13' fill='none' stroke='#e3b55a' stroke-width='2' stroke-linecap='round' opacity='.5' transform='rotate(6 50 50)'/></svg>`
- `--petal` (16×16): `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path d='M8 1C11 4 15 6 14 10c-1 4-5 5-6 5s-5-1-6-5C1 6 5 4 8 1z' fill='#f3b9c8' opacity='.85'/></svg>`
- `--mn-resting`, `--kama`, `--obon`: 120×120 line drawings, stroke `#6a5f55` 2px, fill none — the brand cat with the paw lowered and eyes as flat lines; a round iron kettle on three legs with no flame; an empty oval tray. Used only as `.col-empty` backgrounds on the KDS at opacity .55.

**Other `theme.css` rule changes** (outside `:root`):

- `h1,h2,h3`: `font-weight:600; letter-spacing:var(--tracking-display)` (Mincho wants open tracking; the old `-0.01em` stays for h4–h6 in Inter). `.display-lg/.display-md` weight 800 → 600, tracking → `var(--tracking-display)`. `.text-gradient` stays defined but is **never used on Mincho**.
- `body::before` seigaiha mask: `linear-gradient(to bottom, transparent 15%, #000 100%)`; `body::after` grain opacity `.025 → .035`, **no** blend mode (judged a jank source on cheap tablets).
- `button { outline:none }` → `button:focus:not(:focus-visible){outline:none}` plus the global `:focus-visible` rule in §9.
- `.btn-primary`, `.filter-btn.active`, `::selection` colour `#fff` → `var(--on-primary)`; `.btn-ghost:hover` bg → `rgba(240,220,190,.06)`; `td` border → `1px solid var(--border)`; `tr:hover td` → `rgba(240,220,190,.03)`.
- `.badge-*`: rewritten in §6 (status seals). `.status-dot.*` glows → `rgba(79,185,138,.5)` / `rgba(239,83,80,.5)` / `rgba(232,168,56,.5)` (token hexes).
- `input:focus` → `border-color: var(--kin); box-shadow: var(--ring-kin)`; all `input, select, textarea` get `font-size: 1rem` (16 px stops iOS zoom).
- `.glass-card`: restyled to the `.lacquer` recipe (§6) with hover `translateY(-2px)`; `.glass-card-static` and `#historyModal .modal-content` get `transform:none`.
- Append sections 18–24: Paper & Lacquer, Hanko, Status seals, Marks, Noren tabs, Lintel, Toast, Empty, Keyframes + reduced-motion, Focus.

---

## 3. Typography

**Faces** (all from the single `@import` above; drop every page-level Inter `<link>` and dev-setup's Kosugi Maru / separate JetBrains link):

| Role | Face | Size / weight / tracking | Notes |
|---|---|---|---|
| Display (landing hero, login titles) | Shippori Mincho 600 | `clamp(2.75rem,6vw,4.5rem)`, `+0.01em`, lh 1.1 | Solid `--text-primary` on dark, `--sumi-ink` on paper. **No gradient-clipped text on Mincho.** |
| H1 page title | Mincho 600 | 1.75–2rem, tracking 0 | admin `.page-title`, KDS `.kds-brand h1`, bots `.section-header h1` |
| H2 / H3 | Mincho 600 | 1.375rem / 1.125rem | `.section-title`, `.panel-title`, `.order-summary-title`, `.kanban-column-header` |
| Eyebrow `.eyebrow` | Inter 600 | .6875rem uppercase, `.16em` | colour `--kin` on dark, `--shu-ink` on paper; kanji prefix via `.jp` |
| Body | Inter 400 | .9375rem / 1.6 | `--text-primary` or `--sumi-ink` |
| Meta | Inter 500 | .8125rem | `--text-muted` / `--sumi-ink-3` |
| Micro caps | Inter 700 | .6875rem uppercase `.12em` | table `th`, stat labels; **nothing smaller than 11 px anywhere** |
| Numerals — carved | Mincho 700 | 1.5–2.5rem | stat values, prices, totals, KDS table seals |
| Numerals — ticking | Inter 700/800 + `font-variant-numeric: tabular-nums` | 1.5–1.875rem | timers, `#liveClock` (Shippori digits are proportional and would jitter every tick) |
| Codes / ids / PIN | JetBrains Mono 500 | .75–.875rem, `.08em` | `#restaurantCodeInput`, `#pinInput`, `.order-id`, `.code-pill`, `#orderIdDisplay` |
| Kanji captions | Noto Sans JP 500 | .75rem | `.jp`, nav suffixes, badge glyphs via `--font-jp` |
| Kanji display | Mincho 600/700 | ≥1.25rem | column headers, tategaki, hanko glyphs, 大吉 |

**Bilingual label pattern** — English carries meaning, kanji is texture. Two mechanisms, pick by whether the node is a JS leaf:

1. Static markup (children allowed): `<span class="lbl"><span class="lbl-en">Orders</span><span class="lbl-jp" lang="ja">注文</span></span>` — `.lbl{display:inline-flex;align-items:baseline;gap:.5rem}` `.lbl-jp{font:500 .75rem var(--font-jp);color:var(--text-muted)}`.
2. JS-rewritten leaf nodes (`#tableDisplay`, `#characterBadge`, `.stat-label`, `.nav-link` text, `#botCountDisplay`…) **[C3]**: put `data-ja="卓"` on the element or its wrapper and render with `.bi[data-ja]::before{content:attr(data-ja);font:500 .72em var(--font-jp);color:var(--kin);margin-right:.5em;letter-spacing:.08em}`; `.bi-stack::before{display:block;margin:0 0 .15rem}` for headings. `attr()` survives `textContent` rewrites.

Buttons may carry a single kanji suffix: `<span class="btn-kanji" lang="ja">入</span>` (Mincho 700 .875rem, opacity .85) — 'Sign In 入', 'Place Order 注文', 'Payment Done 済', 'Start Preparing 調理'. Never on leaf buttons JS rewrites.

`.tategaki{writing-mode:vertical-rl;text-orientation:upright;font-family:var(--font-display);letter-spacing:.22em}` — always `aria-hidden="true"`. Every kanji span carries `lang="ja"`.

KDS flips the ratio: kanji Mincho 1.5rem is primary in column headers, English .6875rem uppercase beneath.

---

## 4. Texture & background layers

Bottom to top:

| z | Layer | Recipe | Pages |
|---|---|---|---|
| body | `background-color: var(--bg-deep)` + the two radial washes; vermilion wash raised to `rgba(214,58,31,.12)` | theme | all |
| −1 | `body::before` seigaiha, stroke-opacity .14, mask `transparent 15% → #000 100%` | theme | all |
| 0 | `.room-layer` — `<div class="room-layer" aria-hidden="true">` first child of body: `position:fixed;inset:0;pointer-events:none;z-index:var(--z-room)`. `background-image: var(--asanoha), radial-gradient(220px 300px at 12% 8%, var(--lantern-glow), transparent), radial-gradient(180px 260px at 88% 14%, var(--lantern-glow), transparent), radial-gradient(40% 35% at 50% 110%, rgba(214,58,31,.12), transparent 70%)`; `mask-image: radial-gradient(60% 60% at 50% 45%, transparent 30%, #000 100%)` so the centre (card / cat) sits in a clear tokonoma. **[C1 lantern pools]** | landing, login.html, customer-login.html, customer `#loginOverlay` only | never on admin / KDS / bots |
| 0 | `.enso-halo` 560–640px absolutely positioned div, `background: var(--enso-bg) center/contain no-repeat; opacity:.22`; inline SVG variant on the landing draws itself once (`enso-draw`) | landing hero, both login cards |
| 1+ | Content. **Paper** surfaces: `background-color:var(--washi); background-image: var(--washi-fibre), linear-gradient(180deg,var(--washi-bright),var(--washi) 60%,var(--washi-2)); background-size:240px 240px, auto; box-shadow:var(--shadow-paper); border:1px solid rgba(28,24,22,.18); border-radius:var(--radius-paper)` — one noise tile, no `background-blend-mode` (resolves the KDS paint-cost critique). **Lacquer** surfaces: `background:var(--bg-surface-container); border:1px solid var(--border); border-radius:6px; box-shadow:inset 0 1px 0 rgba(255,235,205,.04), 0 2px 8px rgba(0,0,0,.35)`; no backdrop-filter. |
| 30 | `.lintel` headers with lantern pools (§6) | customer, KDS, bots, admin sidebar brand |
| 1 | `.sakura-drift` (4 petals, `--petal` background, `sakura-fall`) | landing hero, customer-login `#step3`, customer `#thankYouMsg` only; `display:none` under reduced motion and ≤480px on landing |
| 9999 | `body::after` grain, opacity .035, normal blend | theme | all (modals sit under it on purpose: paper tooth) |
| 10000 | toasts | | |

**Performance rules** (hard): no `backdrop-filter` on KDS at all; on other pages ≤ 2 blurred elements at once (modal backdrop + cart backdrop); `filter: blur()` never on an element larger than 64 px; no `filter` or `box-shadow` animation on anything the JS rebuilds (KDS 4 s, admin orders 5 s, bot cards 15 s, cart/tray/menu lists); textures are tiled data-URIs ≤ 2 KB each; `--washi-fibre` is rasterised once per tile by the browser, so a wall of 15 tickets costs one raster.

---

## 5. Brand assets

### 5.1 `shared/maneki.svg`

Also inlined verbatim (as a plain `<svg class="mn">`) on index.html, login.html, customer-login.html and the customer `#loginOverlay` / `#welcomeScreen`, because page CSS must animate the paw. Also present as `<symbol id="neko">` inside `shared/icons.svg` for app headers (its paw animation lives in a `<style>` inside the symbol, 4 s slow beckon, with its own `prefers-reduced-motion` query, since page CSS cannot reach `<use>` shadow content).

`viewBox="0 0 120 120"`, stroke `#1c1816` 1.5 px, round joins (sumi outline, brush feel). Groups use **classes** (several inline copies per page), draw order:

- `g.mn-shadow` — ellipse cx60 cy111 rx34 ry4.5 fill `rgba(0,0,0,.28)`.
- `g.mn-body` — rounded bell from (30,62) down to a flat base at y 108, fill `#f3ebdd`; tail curled on the viewer's left at (24,100) `q-10 -14 2 -18`.
- `g.mn-head` — circle cx60 cy46 r27; ears (36,24)-(44,16)-(50,26) and (70,26)-(76,16)-(84,24); inner ears fill `#f3b9c8`.
- `g.mn-patches` — calico: `#c8923e` ochre patch over the viewer's right ear/brow (66,22 → 84,30 → 74,40); `#3a332e` sumi patch on the lower-left flank (36,80 → 50,98 → 34,100). These make it a mike-neko, not a generic cat.
- `g.mn-face` — eyes = closed happy arcs `M47 47q5-5 10 0` and `M63 47q5-5 10 0` stroke 2.2; nose small inverted triangle at (60,53) fill `#d63a1f`; mouth ω `M54 57q3 3.5 6 0q3 3.5 6 0` stroke 1.6; three whiskers per side stroke 1 (x 38→22 and 82→98 at y 50/54/58).
- `g.mn-collar` — band across the neck y 70–76 fill `#d63a1f`; `g.mn-bell` circle cx60 cy80 r5.5 fill `#e3b55a` stroke `#a8832f`, slit `M57 81h6`, dot (60,83).
- `g.mn-paw-rest` — viewer's left paw holding the koban: shoulder (38,74) → (36,96), pad ellipse (40,98) rx6 ry4.
- `g.mn-koban` — ellipse cx44 cy97 rx13 ry9 fill `#e3b55a` stroke `#a8832f` 1.2; inner ellipse rx9 ry5 stroke only; `<text>` 千万両 Shippori Mincho 700 size 5.2 fill `#1c1816` anchor middle at (44,99). Kept **outside** any mirrored group.
- `g.mn-paw` — **the raised paw** (viewer's right = cat's left, beckons customers): shoulder (82,66) up to (94,36), pad circle cx95 cy33 r7.5 fill `#f3ebdd`, three toe beans fill `#f3b9c8`. `style="transform-origin:82px 66px; transform-box:view-box"`. The only animated group: `.mn .mn-paw{animation: beckon 2.4s ease-in-out infinite}`; pages that already reference `wave` may use `wave 1.8s` instead. Reduced motion: `animation:none`.
- Staff variant (beckons fortune): wrap body/head/patches/face/collar/paws in `<g class="mn-mirror" transform="matrix(-1 0 0 1 120 0)">`; koban + text stay outside. Used on login.html only.

Classes on the root: `.mn` default; `.mn--washi` adds `filter: drop-shadow(0 1px 0 rgba(28,24,22,.25))` so cream fur separates from cream paper; `.mn--resting` (empty states) `.mn-paw{animation:none;transform:rotate(-70deg)}` + eyes as flat lines via `stroke-dasharray`. Sizes: hero 160, login 72, app headers 28 (symbol), customer overlay 64, empty states 64 at opacity .45.

**Logo lockup `.brand-lockup`**: `inline-flex; gap .6rem; align-items center` → [cat 28 px] + two-line stack: `.brand-kanji` 招き猫 Mincho 700 1.125rem `--text-primary` `.04em`, `.brand-romaji` MANEKI NEKO Inter 600 .5625rem uppercase `.24em` `--text-muted` → `.hanko.hanko--sm` 招. On paper the kanji is `--sumi-ink`, romaji `--sumi-ink-3`. Restaurant name (`#sidebarRestaurantName`, `#kdsRestaurantName`, `#botNavRestaurantName`) is a **painted-lantern caption [C1]**: Noto Sans JP 500 .7rem uppercase `.14em`, colour `var(--lantern)`, `text-shadow: 0 0 8px var(--lantern-glow)`.

**Favicon** `shared/favicon.svg`: the 招 hanko on a vermilion square, 32 viewBox. Every page adds `<link rel="icon" href="…/shared/favicon.svg">` and `<meta name="theme-color" content="#100d0c">`.

### 5.2 `shared/icons.svg` sprite

`<svg xmlns="http://www.w3.org/2000/svg" style="display:none">` of `<symbol id="…" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">`. 2 px safe margin, single-weight line, no fills except the dots in `i-koban` and the crests. Reference: `<svg class="ico" aria-hidden="true"><use href="../shared/icons.svg#i-cart"/></svg>` (root pages: `./shared/icons.svg#…`). `shared/icons.css`: `.ico{display:inline-block;width:1em;height:1em;vertical-align:-.15em;flex-shrink:0}` `.ico--sm{width:14px;height:14px}` `.ico--md{width:20px;height:20px}` `.ico--lg{width:28px;height:28px}` `.ico--xl{width:40px;height:40px}`; `.ico--bold` sets `stroke-width:2.25` for KDS.

| id | depicts | replaces / used where |
|---|---|---|
| `neko` | the brand cat (symbol of §5.1) | 🐱 🤖 brand marks in admin/KDS/bots headers, customer header, empty states |
| `i-neko-head` | cat head with one raised paw, outline | 🤖 bots tab, landing Bots card, login Bots tab, admin bots stat |
| `i-lantern` | chōchin lantern with caps and 3 ribs | 🏮 code fields, admin Dashboard nav, landing Admin card |
| `i-bowl` | donburi with chopsticks | 🍱 admin Menu nav, customer Menu tab, landing Kitchen card |
| `i-scroll` | makimono | 📜 📋 admin Orders nav, bots Live Logs tab, Recent Orders, history |
| `i-people` | two figures | 👥 admin Customers |
| `i-ema` | pentagonal plaque on a cord | 💬 admin Feedback |
| `i-soroban` | abacus | 📈 📊 admin Analytics, login Admin tab |
| `i-knife` | santoku + small flame | 🍳 KDS/Kitchen entries, login Kitchen tab |
| `i-tray` | obon tray with a bowl | 🛒 🍽 🍽️ 🍱 landing Customer card, Serve, delivered step, Start Ordering |
| `i-okamochi` | lacquer delivery box | 🛒 customer cart |
| `i-user` | bust | 👤 profile, username field |
| `i-noren` | two curtain panels, parted | 🚪 every logout |
| `i-taiko` | drum with two bachi | 🎙️ mic |
| `i-crane` | orizuru | 📤 send |
| `i-check` `d="M5 12.5l4.5 4.5L19 7"` | tick | ✅ ✓ |
| `i-close` `d="M6 6l12 12M18 6L6 18"` | cross | ✕ cancel/close |
| `i-plus` `d="M12 5v14M5 12h14"` / `i-minus` `d="M5 12h14"` | | ➕ − qty |
| `i-trash` | bin | 🗑️ |
| `i-fude` | brush pen | ✏️ edit |
| `i-search` | magnifier | 🔍 |
| `i-arrow-left` `d="M19 12H5M11 18l-6-6 6-6"` / `i-arrow-right` (mirrored) / `i-arrow-down` | | ⬅ → ↓ back/next/scroll cue |
| `i-chevron-down` `d="M6 9l6 6 6-6"` / `i-chevron-right` | | select arrows, row expand |
| `i-clock` | wadokei-style dial | ⏰ clocks |
| `i-incense` | stick with smoke curl | ⏱️ KDS timer |
| `i-fire` | three-tongue flame | ▶ 🍳 Start Preparing, preparing step/column |
| `i-bell` | suzu shrine bell with rope | 🔔 alerts, Ready, Doraemon crest |
| `i-koban` | oval coin with 千 (filled centre dot) | 💰 revenue, cash, ratings |
| `i-thermo` | thermometer | 🌡️ |
| `i-battery` | lantern with fill level | 🔋 |
| `i-refresh` | ensō with arrowhead | ↻ 🔄 |
| `i-enso` | open brush circle | loading, ⏳ |
| `i-daruma` | daruma outline | 🔄 bot restart |
| `i-mask` | noh mask | 🎭 character control |
| `i-heart-pulse` | heart with pulse line | ❤️ health |
| `i-sakura` / `i-sakura-fill` | five-petal blossom outline / filled | ⭐ ratings |
| `i-chili` | togarashi | 🌶️ |
| `i-bill` | receipt with torn edge | 🧾 |
| `i-card` | payment card | 💳 |
| `i-upi` | phone with QR | UPI radio |
| `i-lock` / `i-eye` / `i-eye-off` | padlock / kitsune mask open / masked | 🔑 👁️ 🙈 |
| `i-table` | low table with zabuton | tables (dev-setup) |
| `i-warning` | shide-strip triangle with ! | ⚠️ ❗ |
| `i-info` | circle with i | info toasts |
| `i-home` | small torii | back to home |
| `i-calendar` | | 📅 |
| `i-menu` | 三 three bars | hamburger |
| `i-zap` | | ⚡ |
| `i-hash` / `i-pin` | | dev-setup code badge / address |
| `i-crest-uzumaki` `i-crest-star` `i-crest-bell` `i-crest-swirl` `i-crest-hat` | kamon for Naruto / Goku / Doraemon / Shinchan / Luffy, single colour inside a ring | 🍥 🐉 🔔 😜 ☠️ |

**Mask-icon subset** (for leaf elements whose text JS rewrites) in `shared/icons.css` **[C1 mechanism, scoped]**: `[class*="mi-"]::before{content:"";display:inline-block;width:1.1em;height:1.1em;margin-right:.45em;vertical-align:-.2em;background:currentColor;-webkit-mask:var(--mi) center/contain no-repeat;mask:var(--mi) center/contain no-repeat}` and `.mi-eye{--mi:url("data:image/svg+xml,…")}` — the custom property is set on the element and inherited by its `::before` (fixes the C1 base-rule bug). The 14 masks use the **same path data as the sprite symbols**: `mi-eye, mi-eye-off, mi-arrow-right (::after variant .mi-after-arrow), mi-check, mi-fire, mi-bell, mi-tray, mi-close, mi-refresh, mi-daruma, mi-mask, mi-incense, mi-enso, mi-warning`. Allowed only on: `#togglePin, #step1Btn, #step2Btn, #autoRefreshToggle, .btn-restart, .btn-row-apply, #applyAllBtn, .action-btn (.btn-start/.btn-ready/.btn-serve/.btn-cancel), .timer, #refreshBtn, .toast, .error-banner, .error-msg, .col-empty`. Everywhere else, the sprite. `@supports not (mask: url())` hides the `::before` (the text label remains).

### 5.3 Hanko seal

```css
.hanko{display:inline-grid;place-items:center;width:2.25em;height:2.25em;font:700 .875rem/1 var(--font-display);
  color:#fff;background:var(--shu);border:2px solid rgba(255,255,255,.55);outline:1px solid var(--shu-deep);
  border-radius:var(--radius-seal);transform:rotate(-6deg);position:relative;letter-spacing:0}
.hanko::after{content:"";position:absolute;inset:-2px;background:var(--washi-fibre);background-size:120px;
  opacity:.45;mix-blend-mode:multiply;border-radius:inherit;pointer-events:none}   /* textured ink edge; static elements only */
.hanko--sm{width:18px;height:18px;font-size:.625rem}
.hanko--lg{width:56px;height:56px;font-size:1.75rem;transform:rotate(-2deg)}
.hanko--round{border-radius:50%}
.hanko--kin{background:var(--kin);color:var(--sumi-ink)}      /* paid / billed */
.hanko--sumi{background:transparent;color:var(--sumi-ink);border:2px solid currentColor;outline:0}  /* ink impression, outline only */
.hanko--matcha{background:var(--matcha-ink)}  .hanko--ai{background:var(--ai)}
.hanko.stamp-in{animation:stamp .32s var(--ease-spring) both}
```

Optional ink-edge filter for large static seals (landing 推, status/payment 済, confirmation 確認): inline `<svg width="0" height="0"><filter id="ink-edge"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="1.6"/></filter></svg>` on that page and `.hanko--lg{filter:url(#ink-edge)}`. Never on KDS or anything rebuilt.

---

## 6. Component library

All recipes are theme.css unless marked *page*. Markup shown is the pattern implementers reproduce.

### 6.1 Buttons

| Class | Recipe |
|---|---|
| **`.btn-seal`** (primary; also applied by theme to `.btn-primary`, `.login-btn`, `#addItemBtn`, `.btn-save`, `#applyAllBtn`, `#aiConfirmOrder`, `#placeOrderBtn`, `#paymentDoneBtn`, `#startOrderingBtn`, `#step1Btn`, `#step2Btn`, `.btn-start`, `.module-card-cta`) | `inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:44px;padding:.7rem 1.4rem;background:linear-gradient(170deg,#e0432a,var(--shu) 55%,var(--primary-dim));color:var(--on-primary);font:600 .9375rem var(--font-sans);border:1px solid var(--shu-deep);border-radius:var(--radius-seal);box-shadow:var(--shadow-seal);position:relative;isolation:isolate`. Ink texture `::after{inset:0;background:var(--washi-fibre);opacity:.3;mix-blend-mode:multiply;pointer-events:none}` (omit on `.action-btn` — rebuilt every 4 s). Hover `filter:brightness(1.06);translateY(-1px)`. Active `translateY(1px);box-shadow:0 0 0 var(--shu-deep),0 2px 6px rgba(0,0,0,.4)` (the seal presses). Focus-visible `box-shadow:var(--ring-kin)` (paper: `--ring-shu`). Disabled `background:var(--bg-surface-bright);color:var(--text-dimmed);box-shadow:none;cursor:not-allowed`. `.loading`/`[aria-busy]` → `.btn-spinner` = ensō ring (`border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-right-color:transparent;border-radius:50%;animation:enso-spin .9s linear infinite`). |
| **`.btn-paper`** (secondary; `.btn-secondary`, admin `.btn-cancel`, `#guestBtn`, `.bar-btn`, `#aiClearOrder`, `.btn-view-logs`, `.btn-control`) | `background:var(--washi);color:var(--sumi-ink);border:1px solid rgba(28,24,22,.22);border-radius:var(--radius-paper);box-shadow:var(--shadow-paper);font-weight:600`; hover `background:var(--washi-bright)`; active `translateY(1px)`. On a paper parent it flips to `.btn-sumi` (`background:var(--sumi-ink);color:var(--washi)`). |
| **`.btn-ghost`** | transparent; `color:var(--text-secondary);border:1px solid var(--border)`; hover `color:var(--text-primary);border-color:var(--kin-dim)`. On paper: `color:var(--sumi-ink-2);border-color:var(--washi-line-strong)`. |
| **`.btn-danger`** (logouts, `.btn-delete`, KDS `.btn-cancel`, `#modalLogoutBtn`) | ghost outline in `--ume-light` on dark / `--ume-ink` on paper; hover `background:rgba(184,74,92,.12)`. **Never a filled red block** — red is for seals and commits. |
| **`.btn-icon`** (`.header-action-btn`, `.qty-btn`, `.ai-qty-btn`, `#cartCloseBtn`, `.modal-close`, `#mobileNavToggle`) | 44×44 circle, `1px solid var(--border)`, `.ico--md`, hover `border-color:var(--kin-dim)`; `aria-label` required. |
| `.btn-sm` | min-height 36px, padding .4rem .8rem, .8125rem. `.btn-block{width:100%}`. |

Specialised fills: `.btn-kin` (`background:var(--kin);color:var(--sumi-ink)`) for KDS Mark Ready; `.btn-matcha` (`background:var(--matcha-bright);color:var(--sumi-ink)`) for Serve.

### 6.2 Hanko seal / stamp — §5.3. Used for: landing 推, login role tabs, step numerals 一二三, KDS table seal 卓, customer status steps, 確認 / 済 / 大吉 stamps, admin nav marker, bots 卓N and crest seals, dev 開発.

### 6.3 Cards

- **`.paper`** — recipe in §4. Children: headings inherit `--sumi-ink`; `.text-muted`/meta → `--sumi-ink-3`; accents/links → `--shu-ink`; hairlines → `--washi-line`. `.paper--torn::before` 7 px deckled strip (1 px-tall jagged data-URI mask, repeat-x) at top −6 px. Hover only on clickable cards (`.menu-card`, `.module-card`): `box-shadow:var(--shadow-paper-lift);transform:translateY(-1px)`.
- **`.ticket`** = `.paper` + `.card-top{border-bottom:2px dashed var(--washi-line)}` perforation; two punched holes `background:radial-gradient(circle at 14px 10px,var(--bg-surface-low) 4px,transparent 4.5px),radial-gradient(circle at calc(100% - 14px) 10px,var(--bg-surface-low) 4px,transparent 4.5px)` layered first.
- **`.tanzaku`** (narrow strip: stat tiles, feedback slips, personality cards) = `.paper` + `border-top:6px solid var(--shu)` (or `--kin`, `--ai`, `--sakura` by modifier) + a hole dot `::before{width:6px;height:6px;border-radius:50%;background:var(--bg-deep);top:8px;left:50%}`.
- **`.ema`** (bot cards, payment plaque) = `.paper` + pentagonal roof `::after{top:-10px;left:0;right:0;height:12px;background:var(--bg-surface-highest);clip-path:polygon(0 100%,50% 0,100% 100%)}` + a status cord colour on `border-top` (`.online` matcha, `.charging` kuchiba, `.offline` nezumi).
- **`.lacquer`** — recipe in §4; `.lacquer-header{padding:.9rem 1.25rem;border-bottom:1px solid var(--border);background-image:var(--rule-kin) bottom/100% 1px no-repeat}`. Admin/bots `.panel`, KDS `.kanban-column`, `#cartSidebar`, `#sidebar`, `.modal-content` are lacquer.

### 6.4 Status seals / badges

theme `.badge`: `display:inline-flex;align-items:center;gap:.35rem;padding:.2rem .55rem .2rem .4rem;border-radius:var(--radius-seal);border:1.5px solid currentColor;background:color-mix(in srgb,currentColor 12%,transparent);font:700 .6875rem var(--font-sans);text-transform:uppercase;letter-spacing:.08em;transform:none` (badges in tables stay aligned). Declare a literal `rgba` background before the `color-mix` line as fallback. Kanji via `::before{content:var(--ja,"·");font:700 .75rem var(--font-jp);text-transform:none}` **[C3]**:

```css
.badge-pending{color:var(--st-pending);--ja:var(--st-pending-ja)}  .badge-preparing{color:var(--st-preparing);--ja:var(--st-preparing-ja)}
.badge-ready{color:var(--st-ready);--ja:var(--st-ready-ja)}        .badge-delivered{color:var(--st-delivered);--ja:var(--st-delivered-ja)}
.badge-billed{color:var(--st-billed);--ja:var(--st-billed-ja)}     .badge-cancelled{color:var(--st-cancelled);--ja:var(--st-cancelled-ja);text-decoration:line-through}
.paper .badge-pending{color:var(--st-pending-ink)} /* …-ink for every status on paper */
.badge-status.online{color:var(--st-online);--ja:var(--st-online-ja)} .badge-status.offline{…} .badge-status.charging{…}
.history-status.status-pending{…same mapping…}  .history-status.status-completed{color:var(--st-delivered);--ja:"済"}
```
Unknown `badge-${status}` falls back to base `.badge` (`color:var(--text-secondary)`, glyph "·"). Count seals (`#cartCount`, `.pill-count`, `.seal-count`): `min-width:20px;height:20px;padding:0 5px;border-radius:50%;background:var(--shu);color:#fff;font:800 .6875rem var(--font-sans);display:grid;place-items:center` (the `pop` keyframe is kept for `#cartCount`).

**Marks (not icons)** **[C3 FSSAI shapes]**: `.mark{display:inline-block;width:14px;height:14px;border:1.5px solid currentColor;border-radius:2px;position:relative;vertical-align:-2px}` `.mark::after{content:"";position:absolute;inset:3px}` `.mark-veg{color:var(--veg)} .mark-veg::after{border-radius:50%;background:currentColor}` `.mark-nonveg{color:var(--nonveg)} .mark-nonveg::after{background:currentColor;clip-path:polygon(50% 0,100% 100%,0 100%)}`; `.paper .mark-veg{color:var(--veg-ink)} .paper .mark-nonveg{color:var(--nonveg-ink)}`. KDS `.veg-dot.veg/.nonveg` receive the identical rules at 16 px. Always paired with a text label or `aria-label="Veg"/"Non-veg"`. Spicy = `i-chili` in `--spicy` + "Spicy".

### 6.5 Inputs, select, checkbox, radio, toggle

- Dark: `background:var(--bg-surface-low);border:1px solid var(--border-hover);border-bottom:2px solid var(--outline-variant);border-radius:var(--radius-paper);padding:.7rem .9rem;color:var(--text-primary);font-size:1rem;placeholder var(--text-dimmed)`. Focus: `border-bottom-color:var(--kin);box-shadow:var(--ring-kin);background:var(--bg-surface)`.
- Paper (`.paper input`, both login pages, `#loginOverlay`, `#menuItemForm`): `background:var(--washi-bright);border:0;border-bottom:1.5px solid rgba(28,24,22,.35);border-radius:3px 3px 0 0;color:var(--sumi-ink);placeholder var(--sumi-ink-3)`. Focus: `border-bottom:2px solid var(--shu-ink);box-shadow:0 1px 0 var(--shu-ink)`. `.input-icon`/`.input-wrap .ico` left 12 px in `--sumi-ink-3`, `--shu-ink` on `:focus-within` (the lantern icon on code fields additionally gets `filter:drop-shadow(0 0 6px var(--lantern-glow-strong))` on focus — one 20 px element).
- Mono fields `#restaurantCodeInput` (`.form-input.code`: uppercase, `.18em`, JetBrains 600 — move the inline style here), `#pinInput` (JetBrains 600, `.35em`), `#credPin`, `#restCode`.
- Select: wrap in `.select-wrap{position:relative}` with `::after` = `i-chevron-down` mask 14 px right 12 px in `--kin`; `select{appearance:none;padding-right:2.25rem}`; `option{background:var(--bg-surface-high);color:var(--text-primary)}`. The wrapper survives admin's `cloneNode` of `#itemCategory`.
- Checkbox (`.form-checkbox-label`, `.pref-chip`): native input `position:absolute;opacity:0;width:1px;height:1px` (focusable); label = `.hanko--sumi` 36 px chip with label text; `label:has(input:checked)` → `background:var(--shu);color:#fff;border-color:var(--shu-deep);animation:stamp .32s`; `label:has(input:focus-visible)` → `--ring-shu`. Fallback: `accent-color:var(--shu)` shows the native box where `:has()` is unsupported.
- Radio (`.payment-method`): same chip, three equal columns, icon above label, checked = shu fill.
- Toggle (`.toggle-switch` structure untouched): track `var(--bg-surface-bright)`, knob `var(--washi)`; `input:checked + .toggle-slider{background:var(--matcha)}`; `.toggle-slider::after{content:"休";font:500 .5625rem var(--font-jp);right:6px}` and `input:checked + .toggle-slider::after{content:"営";left:6px;right:auto;color:#fff}` — an 営業中/休 sign so state is not colour-only.

### 6.6 Tabs & navigation — noren

Container carries the rod: `position:relative;padding-top:6px` with `::before{top:0;left:0;right:0;height:2px;background:var(--rule-kin)}` (a kintsugi hairline). Tab: `background:transparent;color:var(--text-secondary);padding:.7rem 1.1rem;min-height:44px;border-radius:0 0 var(--radius-paper) var(--radius-paper);font:500 .9375rem var(--font-sans)`; kanji via `.jp` child (static) or `data-ja` (leaf). **Active** (`.tab-btn.active`, `.mode-tab.active`, `.role-tab.active`/`[aria-selected=true]`, `.nav-link.active`): lit paper panel — `background:var(--washi);color:var(--sumi-ink);box-shadow:var(--shadow-paper);border-top:3px solid var(--shu);transform:translateY(2px)` (hangs lower **[C3]**). Hover inactive: `color:var(--text-primary);background:rgba(240,220,190,.05)` + `translateY(1px)`. Overflow containers (`.tab-bar`, `#manualCategoryTabs`, `.menu-filters`): `mask-image:linear-gradient(90deg,transparent,#000 12px,#000 calc(100% - 24px),transparent)`, scrollbar hidden, `scroll-snap-type:x proximity`.

Filter chips (theme `.filter-btn`, leaf buttons — never add children): `background:transparent;border:1px solid var(--border-hover);border-radius:var(--radius-paper);color:var(--text-secondary);font-size:.8125rem`; `.active{background:var(--washi);color:var(--sumi-ink);border-color:var(--washi)}` — **no vermilion on filters**.

**Sidebar** (`#sidebar`): `.lacquer` 260 px, `background:var(--bg-surface-low)`, right edge kintsugi hairline; brand band = `.lintel` 72 px; `.nav-link` rows 48 px: `i`con 20 px + label + kanji suffix right-aligned in `--text-dimmed`; `.nav-link.active::before` becomes a 6×22 px shu seal bar (radius 2, left 10 px), label `--text-primary`, background `rgba(240,220,190,.04)` — the sidebar stays quiet. Mobile scrim **[C1]**: `#sidebar.mobile-open{transform:translateX(0);box-shadow:0 0 0 100vmax rgba(16,13,12,.6)}` — works without `:has()` or JS.

### 6.7 Tables

Inside `.lacquer`. `th`: Inter 700 .6875rem uppercase `.12em` `--text-muted`, `padding:.75rem 1rem`, `border-bottom:1px solid var(--kin-hair)`; optional `<small class="jp">` caption. `td`: `padding:.8rem 1rem;border-bottom:1px solid var(--border);font-size:.9rem`. Numeric columns `.num{text-align:right;font-variant-numeric:tabular-nums}`; prices `.price{font:600 1rem var(--font-display)}` with `::before{content:"₹";color:var(--kin);margin-right:.15em}`. Row hover `rgba(240,220,190,.03)`. Expand affordance: `.order-main-row td:first-child::before` = `i-chevron-right` mask 12 px `--text-muted`, always drawn; rotates 90° under `tr.order-main-row:has(+ .order-expand-row.open)` (no rotation is the fallback). `.order-expand-row{display:none}.order-expand-row.open{display:table-row}` kept exactly; `.order-expand-row.open > td{padding:0 1rem 1rem}` and `.expand-mini-table` is a paper bill slip (`.ticket`, 明細 `.hanko--sm` top-right, `.item-instructions` as a `.tanzaku-note`: `background:var(--washi-bright);border-left:3px solid var(--kin);padding:.35rem .6rem;color:var(--sumi-ink-2)` with `::before{content:"備考 "}`); the JS empty row `td[colspan="3"][style]` reads fine on paper because its inline colour is `var(--text-muted)` — override with `.expand-mini-table td[style]{color:var(--sumi-ink-3)!important}` (one of two allowed `!important`). Critical rows (bots `tr.health-critical td`): `background:rgba(184,74,92,.10)`; `td:first-child::after{content:"危";font:700 .75rem var(--font-display);color:var(--ume-light);margin-left:.4rem}`. `.table-container{overflow-x:auto;-webkit-overflow-scrolling:touch}` with the edge-fade mask; first column `position:sticky;left:0;background:var(--bg-surface-container)` under 768 px. Inline `min-width:800px` moves to CSS as 680 px.

### 6.8 Modals & drawers — shoji

Backdrop: `rgba(16,13,12,.72)`; `backdrop-filter:blur(6px)` on the customer app only. Containers center with `align-items:center;justify-content:center;padding:1rem` under the inline `display:flex` the JS sets. Sheet = `.paper` max-width 440–520 px with `border-top:4px solid var(--shu)`, title Mincho 1.375rem + `.rule-sumi` beneath, `.modal-close` = 36 px round `.hanko--sumi` with `i-close`. Enter `ink-in .3s`. Drawer `#cartSidebar`: `.lacquer`; `width:min(400px,100%)`; `transform:translateX(100%)` → `.open{transform:translateX(0)}` 320 ms; `.cart-header` = shoji lattice band (`repeating-linear-gradient(90deg,var(--border) 0 1px,transparent 1px 48px),repeating-linear-gradient(0deg,var(--border) 0 1px,transparent 1px 48px)` over `--bg-surface-low`, 56 px) with title Mincho + 買い物かご caption; items are `.paper` strips; footer total Mincho 1.5rem `--kin`; `#placeOrderBtn` `.btn-seal.btn-block`. `#cartBackdrop` opacity/pointer-events contract untouched. Z: customer `#loginOverlay` **9000** (was 9999 — now under grain), `#historyModal` 9000 (delete the conflicting 100), status 50, qr 60, feedback 70, avatar 40, toasts 10000.

### 6.9 Toast — chōchin tag

`#toastContainer{position:fixed;z-index:var(--z-toast);right:1rem;bottom:1rem}`; `@media (max-width:1023px){#toastContainer{top:68px;bottom:auto;left:50%;right:auto;transform:translateX(-50%);width:min(92vw,380px)}}` — never over the chat input **[C1]**. `.toast`: `.paper` at `padding:.7rem .9rem;display:flex;gap:.6rem;align-items:center;color:var(--sumi-ink);font-size:.875rem;border-left:4px solid`; a 2×12 px cord `::before` at top-left; `.success{border-color:var(--matcha-ink)} .error{border-color:var(--ume-ink)} .info{border-color:var(--kin-dim)}`; the JS icon span is hidden (`.toast > span:first-child{display:none}`) and `::after` draws `mi-check / mi-warning / mi-enso` in the border colour. Enter `slideUp .3s`; **`.toast.hiding{animation:toastExit .25s forwards}` must remain** (JS removes the node on `animationend`).

### 6.10 Empty states — ensō (and three KDS drawings)

`.empty-state, .empty-hint, .col-empty, td.empty-cell, td[colspan], .log-placeholder, .table-loading, #feedbackList > .text-secondary, #botCardsGrid > div[style]`: `display:grid;justify-items:center;gap:.5rem;padding:2.5rem 1rem;color:var(--text-muted)!important` (second allowed `!important`, overrides the JS inline `rgba(255,255,255,.3)`); on paper `--sumi-ink-3`; `::before{content:"";width:64px;height:64px;background:var(--enso-bg) center/contain no-repeat;opacity:.5}`. Kanji caption `::after` Noto .75rem `--text-dimmed`: default "まだありません". KDS per column **[C1]**: `#cards-pending .col-empty::before{background-image:var(--mn-resting)}` + `::after{content:"ご注文待ち"}`; `#cards-preparing` → `--kama` + "火を待つ"; `#cards-ready` → `--obon` + "準備完了なし"; `.col-empty > span{display:none}` hides the JS emoji; the `p` text stays. No dashed boxes.

### 6.11 Loading

`.enso-spin`, `.btn-spinner`, `.loading::before`, `.restarting::before`: 20 px open ensō ring spinning `enso-spin .9s linear infinite`. `#refreshBtn` / `#refreshLogs`: `mi-refresh` / `i-refresh` that spins on `:active` only (JS drives `#refreshBtn` opacity — never style its opacity). Landing/login hero ensō draws once (`stroke-dasharray:300;animation:enso-draw 1.4s ease-out`). Streaming `.cursor` = brush tip: `display:inline-block;width:.45em;height:1em;background:var(--shu-ink);border-radius:1px 1px 3px 3px;transform:skewX(-8deg);animation:blink 1s steps(2) infinite`. No skeletons.

### 6.12 Stat tiles — koban / tanzaku

`.stat-grid{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}`. `.stat-card` = `.tanzaku` (band: orders `--shu`, revenue `--kin`, bots `--ai`, rating `--sakura`) `padding:1.25rem 1.25rem 1rem;display:grid;gap:.25rem`. `.stat-label` (static; add `<span class="jp" lang="ja">注文数</span>`) → eyebrow `--shu-ink` + kanji `--sumi-ink-3`. `.stat-value` (text-only) → Mincho 700 `clamp(1.75rem,2.4vw,2.5rem)` `--sumi-ink`, `white-space:nowrap;overflow:visible` (no ellipsis). `.stat-value-green` → `--sumi-ink` with `i-koban` drawn by `.stat-card:nth-child(2) .stat-value::before` (koban mask, `--kin-dim`, 20×14). `.stat-icon` → 32 px round outline `1.5px solid var(--washi-line)` holding `i-scroll / i-koban / i-neko-head / i-sakura` in `--sumi-ink-2`. No hover. Same recipe serves bots `.health-pill` (compact, dashed gold top = shimenawa) and dev `.stat-coin` (koban: `border-radius:50%/40%;background:var(--kin);color:var(--sumi-ink)`).

### 6.13 Charts (dataviz rule: one hue per single-series chart, values readable without hover)

`.bar-chart{display:grid;grid-template-columns:repeat(12,1fr);gap:6px;align-items:end;height:180px;border-bottom:1px solid var(--kin-hair);background-image:repeating-linear-gradient(0deg,transparent 0 44px,var(--border) 44px 45px);position:relative}` (`.revenue-chart` → 7 columns). `.bar{width:auto;min-height:2px;border-radius:2px 2px 0 0;background:linear-gradient(180deg,var(--kin),var(--kin-dim));transition:none}` — inline `height:%` from JS still resolves. `.revenue-chart .bar` = koban stack: `background:var(--kin);background-image:repeating-linear-gradient(0deg,transparent 0 9px,rgba(28,24,22,.35) 9px 10px)` — purple gone. Tooltip `.bar[data-val]:hover::after{content:attr(data-val)}` kept, restyled as a paper chip; at ≥1200 px `.bar::after{opacity:.85}` always visible so touch users get values. `.chart-labels{display:grid;grid-template-columns:inherit;text-align:center;font-size:.6875rem;color:var(--text-muted);font-variant-numeric:tabular-nums}` — labels finally align with bars. Top dishes `.dish-row`: `counter-increment:rank`; `.dish-rank{font-size:0}.dish-rank::before{content:counter(rank,cjk-ideographic);font:700 .875rem var(--font-display)}` rendered as `.hanko--sm.hanko--kin` **[C3, CSS-only]**; `.dish-count` right-aligned tabular. Satisfaction: replace the static ring with an inline SVG ensō `<svg viewBox="0 0 120 120"><circle class="enso-track" r="44" cx="60" cy="60"/><circle class="enso-fill" r="44" cx="60" cy="60" style="stroke-dasharray:276;stroke-dashoffset:calc(276 - 276 * var(--pct,0) / 100)"/></svg>` (stroke 6, round caps, track `--bg-surface-bright`, fill `--kin`, rotate −100°); `#satisfactionScore` keeps the literal `—` initial text, centred Mincho 2rem. Optional one-line JS in `loadAnalyticsPage`: `donut.style.setProperty('--pct', pct)`; without it the ring is an honest open ensō.

### 6.14 Chat bubbles — fukidashi on paper

`.message{display:flex;gap:.6rem;align-items:flex-end;max-width:min(78%,640px);margin:.5rem 0;animation:slideUp .25s var(--ease-out)}` `.message.user{margin-left:auto;flex-direction:row-reverse}`. `.msg-role`: 30 px kamon ring (`border:1.5px solid var(--kin-dim);background:var(--bg-surface-high);display:grid;place-items:center;font-size:0;overflow:hidden`) holding the Doraemon mini-SVG (24 px, injected by JS) or the crest; ring colour by `body.character-*`. `.message.bot .msg-bubble` = `.paper` `padding:.7rem .9rem;color:var(--sumi-ink);font-size:.9375rem;line-height:1.55;border-radius:3px 12px 12px 12px;border-left:3px solid var(--kin)`. `.message.user .msg-bubble{background:linear-gradient(160deg,var(--shu),var(--primary-dim));color:#fff;border-radius:12px 3px 12px 12px;box-shadow:0 2px 0 var(--shu-deep)}`. `#chatMessages{background:var(--bg-surface-low)}`; `.chat-fade-top` 56 px ink wash from `--bg-deep` to transparent. Style the stream through `.msg-bubble`/`.cursor` only, never `#streamBubble`. Bots `.log-entry.bot`/`.log-entry.user` reuse this (paper left / sumi bubble right).

**Kamon roundels** `.kamon{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;border:2px solid currentColor;background:radial-gradient(circle at 50% 40%,color-mix(in srgb,currentColor 22%,transparent),transparent 70%)}` + crest `<use>` at 60 %; colour from `.char-naruto{color:var(--c-naruto)} .char-goku{color:var(--c-goku)} .char-doraemon{color:var(--c-doraemon-text)} .char-shinchan{color:var(--c-shinchan)} .char-luffy{color:var(--c-luffy-text)}`. On JS leaf badges (`.character-badge`) the crest is drawn by `::before` with the five crest masks.

### 6.15 Order ticket (denpyo) — KDS `.order-card`, customer tray, admin bill slip, cart item, history card

`.order-card` (rebuilt every 4 s → **no transitions, no entrance animation, no hover transform, no `::after` texture**): `.paper` recipe, `padding:0 0 .75rem;margin-bottom:.85rem;position:relative`. Status band `::before{top:0;left:0;right:0;height:6px;border-radius:4px 4px 0 0}` — `.status-pending::before{background:var(--kuchiba)} .status-preparing::before{background:var(--shu)} .status-ready::before{background:var(--matcha)}`. `.card-top{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:.75rem;padding:1rem 1rem .75rem;border-bottom:2px dashed var(--washi-line)}`. `.table-badge` → `.hanko--lg` square (56 px; 72 px ≥1600): shu fill, white Mincho 700 2rem number, `::before{content:"卓";position:absolute;top:3px;left:5px;font:500 .5625rem var(--font-jp);opacity:.85}` — JS template edited to emit the bare number. `.timer` → `justify-self:end;font:800 1.5rem var(--font-sans);font-variant-numeric:tabular-nums;color:var(--sumi-ink)`; `mi-incense` `::before` 18 px `--sumi-ink-3` replaces ⏱️. **`.timer.timer-red` [C1 ember]**: `background:var(--shu);color:#fff;padding:.1em .5em;border-radius:var(--radius-seal);animation:ember 1.2s ease-in-out infinite` (box-shadow pulse only — text contrast is a steady 4.68:1) + `::after{content:"急";font:700 .75em var(--font-jp);margin-left:.4em}`. `.order-id` → `grid-column:1/-1;font:500 .6875rem var(--font-mono);letter-spacing:.08em;color:var(--sumi-ink-3)` (de-emphasised). `.items-list{list-style:none;padding:.5rem 1rem}` `li{padding:.55rem 0;border-bottom:1px solid var(--washi-line)}` `.item-main{display:flex;align-items:center;gap:.6rem}` `.item-qty` Mincho 700 1.375rem `min-width:2.2ch`; `.item-name` Inter 600 1.125rem (1.3125rem ≥1600) `--sumi-ink`; `.veg-dot` 16 px mark at row end; `.item-instructions` = `.tanzaku-note` with `::before{content:"備考 "}`; `.item-name[style]{color:var(--sumi-ink-3)!important}` — or edit the "No items" template colour. `.card-actions{display:flex;gap:.5rem;padding:.5rem 1rem 0}` `.action-btn{min-height:48px;flex:1;font:700 1rem var(--font-sans);border-radius:var(--radius-seal)}`: `.btn-start` = `.btn-seal` + `mi-fire`; `.btn-ready` = `.btn-kin` + `mi-bell`; `.btn-serve` = `.btn-matcha` + `mi-tray`; `.btn-cancel` = `.btn-danger` (paper variant) `flex:0 0 auto;min-width:88px` + `mi-close`; `[disabled]{opacity:.6}` (JS also sets inline .7). Oldest-first cue: `.kanban-cards > .order-card:first-child{box-shadow:var(--shadow-paper),0 0 0 2px var(--kin-hair)}`. `.flash-new{animation:HighlightNew .8s ease-out 3}` (2.4 s ≤ the 3 s JS removal) + `::after` 新 `.hanko--sm` fading. Optional incense bar (1-line JS `timer.style.setProperty('--mins',mins)`): `.card-top::after{grid-column:1/-1;height:3px;background:linear-gradient(90deg,var(--kin),var(--shu));width:calc(min(var(--mins,0),15)/15*100%)}`.

Customer `.order-summary-panel` (okaikei), `.cart-item`, `.history-card` and admin `.expand-mini-table` reuse paper + perforation + Mincho qty at smaller sizes.

### 6.16 Section header, eyebrow, brush divider

```html
<div class="page-header"><p class="eyebrow"><span class="jp" lang="ja">ダッシュボード</span>・Overview</p>
<h1 class="page-title">Dashboard</h1><p class="page-subtitle">Today in the house</p></div>
```
`.page-header{display:grid;gap:.35rem;margin-bottom:1.5rem}`; `.page-header::after{content:"";display:block;width:120px;height:8px;margin-top:.75rem;background:var(--brush-rule-kin) left/100% 100% no-repeat}` (`--brush-rule-sumi` on paper). Optional `.tanzaku-label` **[C1]**: 28×56 px vermilion strip, tategaki kanji (管理 / 厨房 / 猫の間), at the far left ≥1280 px. Dividers: `.rule-kin` (1 px kintsugi hairline `linear-gradient(90deg,transparent,var(--kin-dim) 15%,var(--kin-bright) 42%,var(--kin) 48%,var(--kin-dim) 85%,transparent)`), `.rule-sumi` (8 px brush on paper), `.rule-perf` (`border-top:2px dashed var(--washi-line)`).

### 6.17 Progress rail (customer-login, order status)

`.step-rail{display:grid;grid-template-columns:repeat(3,auto);justify-content:center;gap:2.5rem;position:relative}` with a 1 px kin line `::before` across the middle; items are 24 px `.hanko--sumi` seals 一 二 三 (`--sumi-ink-3`); `.login-card:has(#step2.active) .rail-1, .login-card:has(#step3.active) :is(.rail-1,.rail-2){background:var(--kin);color:var(--sumi-ink);border-color:var(--kin)}` and the current one shu — graceful static rail without `:has()`. Order status uses the same seals at 48 px with the step icons (§7.4).

### 6.18 Focus-visible ring

theme.css: `:where(a,button,input,select,textarea,summary,[tabindex]):focus-visible{outline:2px solid var(--kin);outline-offset:3px;border-radius:inherit}` `.paper :focus-visible, .paper:focus-visible{outline-color:var(--shu-ink)}` `.btn-seal:focus-visible{outline-color:#fff;outline-offset:3px}`; custom chips via `label:has(input:focus-visible)`.

---

## 7. Per-module blueprint

Legend: **JS ✓** = the listed edit is a permitted string/class swap; **JS ✗** = CSS/HTML only. "Keep" lists the contract reminders.

### 7.1 Landing — `index.html`

**Scene**: `body.unmasked` (seigaiha full-bleed) + `.room-layer` (lantern pools) + `.sakura-drift` inside `section.hero` (4 petals, hidden ≤480 px). New fixed `.site-nav` (no JS): 56 px `.lintel`, `.brand-lockup` left; right two noren links — 'Staff <span class=jp>入口</span>' → `./login.html`, 'Guests <span class=jp>お客様</span>' → `./customer-login.html` (sakura underline). `#modules{scroll-margin-top:72px}`.

**Hero**: `.hero-orb` restyled as a 520 px hinomaru disc (`radial-gradient(circle,rgba(214,58,31,.22),rgba(214,58,31,.06) 60%,transparent 70%)`) — element kept so the stagger child count is unchanged; `.enso-halo` inline SVG (draws once) offset right. `.hero-cat` → inline `svg.mn` 160 px, `.mn-paw` on `wave 1.8s`; the old `.hero-cat{animation:wave}` rule removed; `::before` ellipse shadow. `.hero-title`: Mincho 600 `clamp(2.75rem,6vw,4.5rem)` `+0.01em`, solid washi, "Neko" `<span class="accent">` in `--kin` (no gradient); followed by `.hanko` 招 in the flow. `.hero-subtitle` → `.eyebrow` 'まねきねこ・Smart Restaurant AI'. `.hero-desc` copy: "An AI waiter with a personality at every table, a kitchen pass that reads itself, and a lucky cat watching the till." Tategaki 招き猫 (`clamp(4rem,12vw,9rem)`, `--text-ghost` .55) down the right edge **outside** `.hero-content`; 「おもてなし」 small on the left. `.scroll-arrow`: 44 px `.chochin`-style pill (vermilion, `i-arrow-down` white), `float` kept; `@media (max-height:700px){position:static;margin-top:2rem}`.

**Modules**: `.section-header` → eyebrow 「四つの間」・Four rooms, `h2.section-title` 'Choose your entrance', `.rule-kin`. `.module-card` = `.lacquer` with a 28 px tategaki washi strip at the left edge (`::before` with `content:attr(data-kanji)`: 管理 / 厨房 / 給仕 / 客席; `padding-left:3.5rem`; `overflow:hidden` kept). `.module-card-icon` → 44 px round outline with `i-lantern / i-knife / i-neko-head / i-tray` in `--kin`. `.module-card-cta` → `.btn-paper` on the three staff cards; the **Customer card is the only `.paper` card** (cream, sumi text) and its `.cta-outline` becomes `.btn-seal` 'Enter as a guest <span class=btn-kanji>入店</span>' — hierarchy un-inverted. `.module-card-badge` 'Priority UX' → `.hanko` 推: keep the element and its absolute position, `font-size:0`, kanji via `::before`, background `--shu` (white glyph 4.68:1; not sakura). Hover: paper lifts 1 px; lacquer border → kin.

**Tech strip**: `h2.tech-label` → `<p class="eyebrow">` '技・Powered by'. `.tech-pills` → kintsugi rope (`::before` 1 px `--rule-kin`) with `.tech-pill` as hanging `.paper` tags (hole dot, kanji eyebrow): 知 NVIDIA NIM · 脳 Nemotron 30B · 声 ElevenLabs · 蔵 Supabase · 速 Express + Vanilla JS. Tailwind and Meta Llama removed; cursor default; no hover glow.

**Footer**: `.rule-kin`, 56 px seigaiha band at .3, `.brand-lockup`, three micro-cap links (Staff login / Guest login / Setup guide), `.footer-brand` 'ご来店ありがとうございます — Thank you for visiting', `.footer-sub` with '・' separator; ❤️ removed.

| Emoji | → |
|---|---|
| 🐱 | inline `svg.mn` |
| 📊 🍳 🤖 🛒 | `i-lantern` `i-knife` `i-neko-head` `i-tray` |
| 🧠 🎙️ 👁️ ⚡ 🎨 ❤️ | kanji eyebrows; ❤️ removed |

Fixes: drop the duplicate Inter `<link>`; `color:#fff` ×2 → `var(--on-primary)`; favicon + theme-color; `:focus-visible` on CTAs; cards animate on scroll via `@supports (animation-timeline: view())` with the load stagger as fallback; reduced-motion sets `.hero-content > *, .module-card{opacity:1;animation:none}`. **Keep**: `id="modules"`, the four module hrefs, `href="#modules"` + `aria-label`, `.hero-content > *` as the stagger target (decorations go outside it), `overflow:hidden` on `.module-card`, `./shared/theme.css` relative path. No JS exists; none added.

### 7.2 Staff login — `login.html`

Shell: `body{overflow-y:auto}`; both `.bg-orb` divs stay but become lantern pools (radial gradients, no `filter:blur`, slow `float`); `.room-layer` + 560 px `.enso-halo` behind the card, both `position:fixed;z-index:0`; `.login-card` = `.paper` 420 px, `z-index:1`, `padding:2rem`, `.card-ribbon` tategaki スタッフ入口 outside the right edge in `--kin-dim` (hidden ≤480). `.login-cat` → inline `svg.mn` 72 px with `.mn-mirror` (beckons fortune), paw on `wave`. `.login-title` Mincho 600 1.625rem `--sumi-ink` (gradient removed) + `.rule-sumi`; `.login-subtitle` `--sumi-ink-3`.

`.role-tabs` → three fuda plaques `gap:.5rem`: `.role-tab{background:var(--washi-2);border:1px solid var(--washi-line);border-radius:var(--radius-paper);padding:.6rem .25rem;display:grid;gap:.15rem;color:var(--sumi-ink-2)}` (not `-3`: 4.44:1 on washi-2 fails); `.role-icon` → `i-soroban / i-knife / i-neko-head` 16 px above a kanji 管 / 厨 / 機 (Mincho 700 1.25rem) and the English label; `.role-tab.active, .role-tab[aria-selected="true"]{background:var(--shu);color:#fff;border-color:var(--shu-deep);box-shadow:var(--shadow-seal);transform:rotate(-1deg);animation:stamp .32s}`; `:focus-visible` `--ring-shu`. **Fix** `aria-controls="login-form"` → `"loginForm"` on all three. `#roleHint`: `--sumi-ink-3` .8125rem, not italic, `min-height:1.5rem`, no negative margin. `#errorBanner`: `.paper--torn` strip `background:var(--washi-bright);border-left:3px solid var(--ume-ink);color:var(--ume-ink)` with `mi-warning` `::before`; keep `animation:shakeX .4s` **on `.error-banner`** (JS re-triggers it), `.visible{display:flex}`, `role=alert`. Inputs: paper ruled-line recipe; `.input-icon` → `i-lantern / i-user / i-lock`; `#restaurantCodeInput` inline style → `.form-input.code`; `#pinInput` JetBrains `.35em`. `#togglePin` **JS ✓**: replace the two `textContent` assignments with `togglePin.setAttribute('aria-pressed', isText)`; CSS `#togglePin.mi-eye` and `#togglePin[aria-pressed="true"]{--mi:var(--mi-eye-off-uri)}`; keep an empty text node. `#loginBtn` → `.btn-seal.btn-block` 'Sign In <span class=btn-kanji>入</span>' (🔓 removed from `.btn-text`); `.btn-spinner` ensō; `.login-btn.loading` rules kept verbatim. `.back-link` → `i-arrow-left` 'Home 戻る'. Rhythm: brand → tabs 1.5rem → hint .5rem → banner → form 1.25rem → button 1.5rem → footer 1.25rem. Optional **JS ✓**: 400 ms `setTimeout` before the redirect so the paw beckons once.

**Keep**: `.role-tab`/`.active`/`data-role` values, `#loginForm` as the form with the submit button inside, `#errorMsg` as the inner leaf span, `#pinInput` styled by id, `.btn-text`/`.btn-spinner` children, script order (CDN → supabase.js → auth.js → inline).

### 7.3 Guest login — `customer-login.html`

Same shell as 7.2 (`.paper` 440 px; `--shadow-2xl` now resolves; ribbon ご来店ありがとうございます; `.bg-orb` pools; `.room-layer`); the local `fadeIn` keyframe may be deleted. Brand: `.brand-cat` → inline `svg.mn` 72 px (left paw); `.brand-name` Mincho 600 1.625rem `--sumi-ink` solid; `.brand-sub` eyebrow 'Smart Restaurant・AI Ordering'. New static `.step-rail` (§6.17) above `#step1`. `.step-num` → `.hanko--sm` with 一 / 二 / 三. `#step1Btn`, `#step2Btn`, `#startOrderingBtn` → `.btn-seal.btn-block`; **JS ✓** strings: `'Next →'`→`'Next'`, `'OK Confirm Table N'`→`'Confirm Table N'`, `'Looking up...'` stays; markup `🍱 Start Ordering` → `Start Ordering`; arrows via `.mi-after-arrow::after`. `#backBtn`, `#back2Btn` → `.btn-ghost` (inline `margin-top` → CSS). `#errorMsg` stays a leaf shown with inline `display:block`: paper torn strip with `mi-warning` `::before`. `#step2`: insert `<p class="jp-greet" lang="ja">いらっしゃいませ</p>` (Mincho 1.125rem `--shu-ink`) as a **sibling before** `#restaurantGreeting` (JS owns that node's text; inline style → `.greet`). `#tableGrid.table-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:.5rem;max-height:min(44vh,320px);overflow-y:auto;padding:2px}`; `.table-btn` = tatami tile: `background:var(--washi-2);background-image:repeating-linear-gradient(90deg,rgba(28,24,22,.06) 0 2px,transparent 2px 7px);border:1px solid var(--washi-line);border-radius:3px;aspect-ratio:1;display:grid;place-items:center;min-height:44px`; `.t-num` Mincho 700 1.5rem `--sumi-ink`; `.t-label` Noto .625rem `--sumi-ink-3`; `.selected{background:var(--shu);color:#fff;border-color:var(--shu-deep);box-shadow:var(--shadow-seal)}` + `::after` 予約 .5rem top-right; `.table-loading` → `.empty-state` (its inline `color:var(--danger)` stays for the error variant). `#step3 .summary-card` → shokken ticket (`.ticket`, dotted-leader rows: `.summary-label::after{content:"";flex:1;border-bottom:1px dotted var(--washi-line-strong);margin:0 .4rem .3em}`, `.summary-value` Mincho 600, `#confirmCode.code-pill` JetBrains chip on `--kin` with `--sumi-ink`), a `.hanko.stamp-in` 確認 top-right (animates on `.step.active`), 4 petals in `.sakura-drift`. `.page-footer` moves inside the card as `.login-footer`.

**Keep**: `.step{display:none}.step.active{display:block}` (non-active steps must be `display:none`), `#tableGrid` wholesale innerHTML (style only `.table-btn/.t-num/.t-label/.table-loading`), `#errorMsg` inline display mechanism, `#step1Btn` id (Enter key clicks it), `#restaurantCodeInput type=text`.

### 7.4 Customer app — `customer/index.html` + `app.js`

**Palette first**: delete the amber `--accent-amber/--accent-orange` overrides; local `.btn-primary`/`.btn-secondary` → `.btn-seal`/`.btn-paper` (keep `width:100%` via `.btn-block`); `.bar-btn-pay` indigo fallback `#4f46e5` → `var(--shu)`; all Tailwind literals (`#ef4444 #ff6b6b #10b981 #4ade80 #f59e0b #fbbf24 #3b82f6`) → `--ume-light / --matcha-bright / --kuchiba / --kin`; `rgba(255,255,255,x)` → `rgba(240,220,190,x)`. Z-index per §6.8 (delete the duplicate `.modal-overlay{z-index:9000}` block). Delete dead CSS: `.chat-doraemon-row/-avatar`, `.latency-badge`, `.glass-panel`, `.icon-btn`, `.hidden-screen`, the second `.modal-header/.history-*` block, the bare `.status-pending/.status-completed` rules, the duplicate local `.hidden` (theme's stays).

**`#loginOverlay`** (the real first screen): `background:rgba(16,13,12,.96)` + `.room-layer` lantern pools; `.login-glass-card` → `.paper` 420 px (same card as customer-login so the flow feels continuous); `.cat-emoji` 🏮 → inline `svg.mn.mn--washi` 64 px; `h2` 'Welcome to Maneki Neko' Mincho + `.rule-sumi` + eyebrow 'ようこそ・Welcome'; `#loginPhone` paper ruled input with `i-user`; `.prefs-grid` → four seal chips (`label.pref-chip:has(input:checked)` shu) with `i-chili` on Spicy and text labels (🥗 🌶️ 🦐 🌿 removed from markup); `#loginSubmitBtn` `.btn-seal` (JS rewrites its text — fine); `#guestBtn` `.btn-ghost` 'Order as guest・お客様'. `#welcomeScreen` → same paper card, `svg.mn` 120 px, `#startBtn` `.btn-seal`.

**Header `.customer-header`** = `.lintel` 56 px **[C1]**: `display:grid;grid-template-columns:auto 1fr auto;align-items:center;background:var(--lintel);border-bottom:1px solid var(--kin-hair);overflow:hidden`; lantern pools `::before/::after` (60 px radial `--lantern-glow` at 14 % / 86 %, extending 40 px below). `.header-brand` → `.brand-lockup` (sprite `#neko` 28 px always visible; kanji hidden <380 px); markup `🐱 Maneki Neko` → lockup. `#characterBadge` leaf: wrap in `<span class="kamon-chip">` whose `::before` draws the crest by `body.character-*`; **JS ✓** `'🤖 ' + name` → `name`, and generalise `body.className` handling to add `character-${state.character.toLowerCase()}` alongside the existing `character-doraemon` toggle (Doraemon avatar gating unchanged). `.header-table` → hanging fuda tag in the grid's middle column (no absolute positioning → no collisions): `background:var(--bg-surface-highest);border:1px solid var(--kin-dim);border-radius:3px`, 6 px kin knot `::before`, `#tableDisplay` Mincho 600 with `data-ja="卓"` on the wrapper. Right cluster: `#statusToggleBtn` keeps inline `display:none` but every other inline prop moves to `.header-action-btn.is-bill` (`i-bill`; style it to work as `inline-block` since JS sets that value); `#cartToggleBtn` `.btn-icon` `i-okamochi` + `#cartCount` `.seal-count`; `#profileBtn` **JS ✓** innerHTML `👤` → `<svg class="ico"><use href="../shared/icons.svg#i-user"/></svg>` + name span; `#customerLogoutBtn` `.btn-danger.btn-sm` `i-noren`, `.logout-label` hidden ≤640 px.

**`.mode-tabs`** → noren tabs, `.mode-tabs-inner` max-width 420 px: `<span class=jp>会話</span>AI Waiter` / `<span class=jp>献立</span>Menu` with `i-neko-head` / `i-bowl` (🤖 📋 removed).

**AI mode**: `.chat-panel` floor `--bg-surface-low` with `--seigaiha` at .06; bubbles per §6.14; `.chat-input-area{position:relative;z-index:3;min-height:var(--chat-input-h);padding:.6rem .75rem calc(.6rem + env(safe-area-inset-bottom))}`; `.chat-input-wrapper` washi strip (cream, 48 px, radius 4); `#voiceBtn` 44 px **taiko [C1]** (round, two-tone `--shu-deep`/`--bg-surface-highest`, dashed gold rope ring, `i-taiko`); `.recording{background:var(--shu);animation:ripple .9s infinite}`; **JS ✓** innerHTML `'🎙️'`/`'🔴'` → the `i-taiko` svg string in both branches (state via `.recording`). `#sendBtn` 44 px `.btn-seal` round with `i-crane`. `#chatInput:disabled{opacity:.6}`. **Mobile rule (<1024 px) [C1 in-flow tray]**: `.ai-layout{flex-direction:column}`; `.chat-panel{flex:1;min-height:0}`; `.order-summary-panel{position:static;flex:0 0 auto;max-height:38vh;overflow:auto;border-top:3px solid var(--kin-dim)}` — it is a sibling of `.chat-panel`, so it sits **below** the input row and can never cover it; `.order-summary-panel:has(.empty-hint){max-height:52px;overflow:hidden}` collapses it to a '伝票・Your order' rail (without `:has()` the empty tray is a short panel, still harmless); `#doraemonAvatar{position:fixed;width:84px;top:calc(var(--header-h) + 60px);right:10px;left:auto;bottom:auto;z-index:40}`; `@media (max-height:520px){#doraemonAvatar{display:none}}` (iOS keyboard; the `.talking` class toggles harmlessly on a hidden element). Desktop ≥1024 keeps the row layout, tray 320 px. `.order-summary-panel` = `.paper` okaikei: `.order-summary-title` Mincho + eyebrow 伝票 (🧾 → `i-bill`), `.order-item-row` dotted leaders, `.ai-qty-btn` 28 px seal circles (44 px hit area), `.ai-item-instructions` `.tanzaku-note`, `#aiOrderTotal` Mincho 1.5rem with 計 `.hanko--sumi` `::before` on its wrapper, `#aiConfirmOrder` `.btn-seal` 'Place Order 注文', `#aiClearOrder` `.btn-ghost` (✅ 🗑️ → `i-check` `i-trash`).

**Manual mode**: `#manualCategoryTabs` keeps its inline flex/overflow; add class `cat-rail` for the edge-fade mask; `.cat-tab` fuda (`--bg-surface-highest`, 1 px `--border-hover`, radius 3), `.cat-tab.active` lit paper. `.menu-card` = `.paper` osusume card: `.menu-card-name` Mincho 600 1.0625rem; `.menu-card-badges` → **JS ✓** `🟢`/`🔴`/`🌶️` → `<span class="mark mark-veg" aria-label="Veg"></span> Veg` / `mark-nonveg` / `<svg class=ico><use #i-chili/></svg> Spicy`; `.menu-card-price` `.price` Mincho 700 1.25rem; `.btn-add` → small `.btn-seal` with `i-plus` 'Add'.

**Cart**: §6.8 drawer; `.cart-item` paper strip; `.qty-btn` 36 px; `.cart-item-note` `.tanzaku-note` input; `#cartTotal` Mincho `--kin`; `#placeOrderBtn` 'Place Order お会計へ'; **JS ✓** cart template `✕ 🗑️ − +` → `i-close i-trash i-minus i-plus`.

**`#activeOrderBar`** (JS `display:flex`): hanging shop sign — lacquer bar, kintsugi top hairline, two cords; `.pulse-dot` → 10 px lit lantern (`lantern` keyframe); `.bar-btn` `.btn-paper.btn-sm` (`i-bill`); `.bar-btn-pay` `.btn-seal.btn-sm` (`i-koban`). Inline `onclick` handlers untouched.

**`#orderStatusScreen`** → `.order-status-card.paper` stamp rally: `.status-steps{display:grid;grid-template-columns:repeat(4,1fr)}` ≥480 px, vertical below; connector `.status-step::before` 2 px dotted `--washi-line`; `.status-step-icon` = 48 px `.hanko--sumi.hanko--round` holding `i-scroll / i-fire / i-bell / i-tray` (markup ✅🍳🔔🍽️ replaced); `.status-step-label` 'Placed <small class=jp>受付</small>' etc.; `#orderStatusScreen .active-step > div:first-child{background:var(--shu);color:#fff;border-color:var(--shu-deep);animation:stamp .32s}` and `> div:last-child{color:var(--sumi-ink)}` (selectors preserved); inactive `opacity:.55`. `#orderIdDisplay` JetBrains on a `.rule-perf` strip. `#statusOrderMoreBtn` `.btn-sumi`, `#statusPayBillBtn` `.btn-seal` (inline styles → classes).

**`#qrPaymentScreen`** → `.payment-card.ema` (rope `::before`, hole dots). **FIX `#qrBox`** (CSS only): `display:grid;grid-template-columns:repeat(10,1fr);width:200px;aspect-ratio:1;padding:10px;background:#fff;border:1px solid var(--washi-line);margin:0 auto;border-radius:4px` `.qr-cell.dark{background:#1c1816} .qr-cell.light{background:#fff}`; caption 'Scan at the counter · demo'. Optional **JS ✓**: call the already-loaded `qrcode-generator` in `buildQrCode`. `#qrTotal` Mincho 1.75rem with `i-koban`; `.payment-method` seal radios (`i-upi / i-card / i-koban`); `#paymentDoneBtn` `.btn-seal` 'Payment Done 済'; `#paymentBackToStatusBtn` `.btn-ghost`, `#paymentOrderMoreBtn` `.btn-sumi`.

**`#feedbackModal`** → `.feedback-modal-card.paper` omikuji booth (`position:relative;overflow:hidden` kept). `.star`: markup `⭐` → `<svg class="ico ico--lg"><use href="../shared/icons.svg#i-sakura"/></svg><svg class="ico ico--lg fill"><use href="…#i-sakura-fill"/></svg>` (JS only reads `data-value`/toggles `.selected`); `.star{color:var(--sumi-ink-3)} .star .fill{display:none} .star.selected{color:var(--kin)} .star.selected .fill{display:inline-block} .star.selected :not(.fill){display:none}`; hover preview `#starRating:has(.star:hover) .star{color:var(--sumi-ink-3)} .star:hover, .star:has(~ .star:hover){color:var(--kin-dim)}` (wrapped in `@supports selector(:has(a))`). `#feedbackComment` tanzaku. `#thankYouMsg` (JS `display:flex`) → paper with `.hanko--lg` 大吉 `stamp-in`, `.sakura-drift`, 🎉 removed; its button `.btn-seal` 'Leave table 退席' (inline `onclick` untouched).

**`#historyModal`**: `.modal-content.glass-card` → add `glass-card-static` in markup (kills the lift); `.history-card` paper strip; `.history-status.status-*` → the seal mapping; `.history-total` Mincho `--sumi-ink`; `#modalLogoutBtn` inline red → `.btn-danger`.

**`#doraemonAvatar`**: SVG groups, colours, `.talking`, `.emotion-*`, `data-emotion` untouched; `::before` zabuton ellipse (`--bg-surface-highest`, 120×18); `.sound-bar` → `--kin`; shy glow `rgba(243,185,200,.45)`, sad `rgba(43,74,111,.45)`; floating kanji `#doraemonAvatar[data-emotion="thinking"]::after{content:"考"}`, `confused` → "？", `happy` → "♪" (Noto, absolute, fading); idle bob restored after finite emotions by listing `avatarBob` after the emotion keyframe in the shorthand (`animation: happyBounce .6s 3, avatarBob 3s ease-in-out infinite 1.8s`).

**Toasts** per §6.9 (`toastExit` kept; **JS ✓** emoji in `showToast` template removed).

| Emoji | → |
|---|---|
| 🏮 🐱 | `svg.mn` |
| 🤖 | kamon chip |
| 🛒 👤 🚪 🧾 | `i-okamochi` `i-user` `i-noren` `i-bill` |
| 🎙️ 🔴 📤 | `i-taiko` (+`.recording`) `i-crane` |
| ✅ 🗑️ ➕ ✕ ⬅ | `i-check` `i-trash` `i-plus` `i-close` `i-arrow-left` |
| 💳 📋 | `i-card` `i-scroll` |
| ⭐ 🎉 | `i-sakura`/`i-sakura-fill`; 大吉 + petals |
| 🍳 🔔 🍽️ | `i-fire` `i-bell` `i-tray` |
| 🟢 🔴 🌶️ | `.mark-veg` `.mark-nonveg` `i-chili` |

**Keep**: every id in the map; `.hidden !important`; `#cartSidebar` transform + `#cartBackdrop` opacity/pointer-events; `#chatMessages` as the scroll container; all inline `display` values (`flex/block/inline-block`); `.toast.hiding` animation; `#cartCount.pop`; `.active-step > div` selectors; `.btn-add` inside each `.menu-card`; cart handlers by class + `data-idx`; script order (CDN → supabase.js → customer-auth.js → app.js → qrcode).

### 7.5 Admin — `admin/index.html` + `app.js`

Delete orphan `admin/style.css`. `body` inline style kept. **No `.room-layer`.**

**Shell**: `#sidebar` per §6.6; brand band `.lintel` with `.brand-lockup` (sprite `#neko` 32 px) and `#sidebarRestaurantName` as the painted-lantern caption (6 inline props → `.sidebar-restaurant`); `.nav-link` rows: 📊🍱📜👥💬📈 → `i-lantern i-bowl i-scroll i-people i-ema i-soroban` + `<span class="nav-jp" lang="ja">概要 献立 注文 顧客 声 分析</span>`; `.sidebar-footer .server-status .status-dot.green` → lit lantern + 'Server online'; `#logoutBtn` 15 inline props → `.btn-danger.btn-sm` `i-noren` 'Logout 退出' right-aligned. `#mobileNavToggle` → 44 px `.btn-icon` (existing hamburger SVG); scrim via the `100vmax` box-shadow; `.page-header` `margin-top:3rem` hack → `padding-top` on `.admin-main` ≤1023 px. `.admin-main` padding 2rem, max-width 80rem; `.admin-section{animation:ink-in .35s}` once per switch, no row animations (5 s poll).

**Headers**: `.page-header` recipe with eyebrows ダッシュボード / メニュー管理 / 注文 / お客様 / お声 / 分析; copy 'Today in the house' (not 'neural metrics'), 'Analytics' (not 'Temporal'), 'How guests feel' (not 'Global Sentiment'); the inline `display:flex` h1 styles and leading emoji removed.

**Dashboard**: `.dashboard-filters` (all three duplicates keep their `.global-*` classes — JS syncs them) → koyomi strip: `.filter-label` eyebrow '期間・Range' (📅 removed), `.filter-btn` chips (active = washi), `.custom-range-box` a small `.paper` tag (`fadeIn` kept), `.date-input` paper ruled, `.btn-apply` `.btn-seal.btn-sm`; Feedback/Analytics copies get `.dashboard-filters.compact`. `.stat-card` per §6.12 (📦💰🤖⭐ → `i-scroll i-koban i-neko-head i-sakura`; kanji 注文数 売上 稼働 評価 added to labels). `.panel` → `.lacquer`; `.panel-title` 📋🤖 → `i-scroll` / `i-neko-head`. **Fix** `#recentOrdersTable` header labels to 'Order 注文 | Table 卓 | Total 計 | Status 状態 | Time 時刻' (JS cells unchanged, colspan 5 unchanged). **Bot Fleet [C3 honest fix]**: inline `height:500px` → `min-height:220px`; `#botOverviewList` stays (empty) and gets the `.empty-state` recipe '猫も休憩中・Fleet lives in Bot Control' plus a static `.btn-paper` link to `../bot-management/index.html` placed **outside** the list; optional **JS ✓** 12-line `renderBotOverview` from `botsRes` into `.bot-item` rows.

**Menu Manager**: `.header-row` + `#menuFilters` (JS-rebuilt leaf chips; style via container + `.filter-btn`); `#addItemBtn` `.btn-seal` `i-plus` 'New item 追加' (inline `#fff` → token). `#menuItemForm` (inline display toggle kept; `scrollIntoView` relies on `.admin-main` scrolling) → `.paper` byōbu panel with `ink-in` on reveal; `#formTitle` leaf **JS ✓** drop the emoji prefix from the two strings; `.form-label` with `<span class=jp>品名 分類 価格 アレルゲン</span>`; `#itemCategory` in `.select-wrap`; `.form-checkbox-label` seal chips 菜 Veg / 辛 Spicy; `.btn-save` `.btn-seal` 'Save 保存'; `#cancelForm` `.btn-ghost`. `#menuTableBody` **JS ✓**: `🟢`/`🔴` → `<span class="mark mark-veg" aria-label="Veg"></span> Veg` / non-veg; `🌶️` → `i-chili`; `.btn-edit`/`.btn-delete` keep both classes but are overridden: `.filter-btn.btn-edit,.filter-btn.btn-delete{padding:.35rem .6rem;border-radius:var(--radius-paper);background:transparent;min-height:36px}` with `i-fude` / `i-trash` + `aria-label`; delete inline `color:var(--danger)` → `--ume-light` (JS ✓ or leave). `.toggle-switch` 営/休 sign.

**Orders**: `#orderFilters` chips (cancelled styled though the DB CHECK rejects it today — call out in the PR); table per §6.7; live-poll cue `.panel-header::after` 6 px kin lantern dot pulsing (CSS only).

**Customers**: `.search-wrapper` → paper ruled search with `i-search` (`.search-icon` keeps its class, emoji removed); optional **JS ✓** wrap the initial in `<span class="hanko hanko--sm hanko--sumi">A</span>` and render `visit_count` as `.stamp-rally` dots; otherwise plain Mincho number.

**Feedback**: `.feedback-header` `.lacquer`; `#feedbackFilters` chips with `i-sakura`; `.feedback-sentiment` → static ensō ring around `#avg-rating-display` Mincho 2.25rem `--kin`, `#avg-stars-display` `--kin` (`#f59e0b` removed), label '平均・Average'. `#feedbackList .feedback-card.glass-card` (JS adds `glass-card`) → `#feedbackList .feedback-card{…tanzaku paper…;transform:none!important;backdrop-filter:none}` (third `!important`, scoped — acceptable because the class comes from JS); `.stars` `--kin-dim`; `.feedback-comment` Mincho 500 1rem `--sumi-ink`; `.feedback-meta` mono `--sumi-ink-3`; optional **JS ✓** `data-rating` on the template → `.feedback-card[data-rating="5"]::before{content:"大吉"}` (4 吉 · 3 中吉 · 2 小吉 · 1 凶) **[C3]**. Empty `div.text-secondary` → `.empty-state`.

**Analytics**: charts per §6.13; `.dish-rank` medals hidden with CSS counters (no JS); satisfaction ensō with `--pct`; delete the `width: 100` inline typo; inline panel heights → `min-height`.

Global: Tailwind literals (`#a855f7`, blue/red hovers, `#f59e0b`) → tokens; `rgba(255,255,255,x)` → washi alphas. **Keep**: `.section` inline `display:block` contract (layout on inner wrappers only), `.hidden`, `#menuItemForm` inline display, `.order-expand-row` display rules, `#itemForm` as a real form, `.visible-toggle/.btn-edit/.btn-delete` exactly once per row, leaf `.filter-btn` buttons, `#satisfactionScore` literal `—`, `#topDishesList` initially empty, text-only stat/title nodes, script order.

### 7.6 KDS — `kds/index.html` + `app.js`

Goal: table seal and timer readable at 3 m. Delete orphan `kds/style.css`; rename the `pluseAlert` keyframe → `ember`; **zero `backdrop-filter`**; scroll chain preserved exactly (`body` 100vh column → header/`.kds-summary` `flex-shrink:0` → `main.kanban` `flex:1` → `.kanban-inner` 100 % → `.kanban-column` flex column `overflow:hidden` → `.kanban-cards` `flex:1;overflow-y:auto`).

**Header `.kds-header`** 56 px `.lintel` with lantern pools; `.kds-brand span` 🍳 → sprite `#neko` 28 px (`<svg class="ico ico--lg"><use href="../shared/icons.svg#neko"/></svg>`); `h1` stays an h1: 厨房 Mincho 600 1.375rem + 'Kitchen Display' Inter 600 .625rem uppercase `.2em` beneath (static `<span class=jp>` + `<small>`). `#liveClock`: Inter 700 1.625rem tabular `--kin` in a wadokei frame (`.kds-clock`: `border:1.5px solid var(--kin-hair);border-radius:var(--radius-seal);padding:.25rem 1rem`; `::before` 時 Noto .625rem `--text-dimmed`). `#kdsRestaurantName.kds-status-text` lantern caption (class and media rule kept). `.kds-status-dot` → 12 px `.chochin`: `border-radius:50%;animation:lantern 2.4s ease-in-out infinite` (the CSS animation beats the inline `boxShadow` JS sets; inline background still shows); **JS ✓** optional: `updateStatusIndicator` returns `var(--matcha-bright)` / `var(--ume-light)`. **Fix `#kdsLogoutBtn`**: remove `class="kds-status-text"` and the inline style props except `display:none` (JS clears it) → `.btn-danger.btn-sm` `i-noren` 'Logout 退出' — phones can log out again.

**Summary `.kds-summary`** → 40 px rail (`padding:.35rem 1.25rem;border-bottom:1px solid var(--border)`), `.summary-pill` inline text 'Pending <small class=jp>受付</small>' with `.pill-count` as `.seal-count` (pending kin/sumi, preparing shu/white, ready matcha-bright/sumi); 🟡🔵🟢 → 10 px `.col-mark` squares; legend `<span class="legend"><i class="mark mark-veg"></i>Veg 菜 <i class="mark mark-nonveg"></i>Non-veg 肉</span>`; `#refreshBtn` `.btn-ghost.btn-sm.mi-refresh` ('↻' removed; opacity left to JS).

**Board**: `.kanban-inner{min-width:0}` ≥1024; `@media (max-width:1023px){.kanban{scroll-snap-type:x mandatory}.kanban-column{min-width:86vw;scroll-snap-align:start}}` — the next noren peeks in; all three `#cards-*` stay in DOM. `.kanban-column` `.lacquer` (`background:var(--bg-surface-low)` + `--seigaiha` at .08). **`.kanban-column-header` = noren [C1]**: `padding:.75rem 1rem;box-shadow:inset 0 6px 0 var(--rod)` (the rod is painted **inside** the header so `overflow:hidden` never clips it); cloth tint `background:color-mix(in srgb,var(--rod) 18%,var(--bg-surface-low))` with `rgba` fallback; centre seam `linear-gradient(90deg,transparent calc(50% - 1px),rgba(0,0,0,.35) calc(50% - 1px) calc(50% + 1px),transparent calc(50% + 1px))`; `--rod` = `--kuchiba` / `--shu` / `--matcha`; content `<span class="jp" lang="ja">受付</span><span class="en">Pending</span>` (調理中 Now preparing / 出来上がり Ready to serve) — kanji Mincho 600 1.5rem, English .6875rem uppercase `--text-muted`; the emoji `span` → `.col-mark` (or hidden). `.kanban-cards{padding:.85rem}`.

**Tickets** per §6.15. **JS ✓** edits in `createOrderCard`: `T-${order.table_number}` → `${order.table_number}`; button labels `'▶ Start Preparing'`→`'Start Preparing'`, `'✅ Mark Ready'`→`'Mark Ready'`, `'🍽 Serve & Complete'`→`'Serve'`; `'No items'` inline colour → `class="item-name item-none"`; **escape `item.instructions`** (XSS); `EMPTY_MESSAGES` icons may stay (CSS hides the span). `.veg-dot` gets `aria-label` in the template (optional). Optional `--mins` incense bar.

**Wall mode [C3]**: `@media (min-width:1600px){html{font-size:18px}}` `@media (min-width:2200px){html{font-size:20px}}` — everything is in rem, so one rule scales the board; plus `.table-badge{width:72px;height:72px;font-size:2.5rem}` ≥1600.

| Emoji | → |
|---|---|
| 🍳 | `#neko` + 厨房 |
| 🟡 🔵 🟢 | noren rods / `.col-mark` |
| 🚪 ↻ | `i-noren` `mi-refresh` |
| ⏱️ ▶ ✅ 🍽 | `mi-incense` `mi-fire` `mi-bell` `mi-tray` |
| 🎉 🍳 ✅ (empty) | `--mn-resting` / `--kama` / `--obon` |

**Keep**: every id (`cards-*`, `timer-*`, `card-*`, counts, clock); `.action-btn` on both buttons; `data-action` values; `.flash-new` ≤3 s; `.timer.timer-red`; `.kds-status-dot` class; `.order-card.status-*`; no transitions on `.order-card/.pill-count/#liveClock/.timer`; script order.

### 7.7 Bot management — `bot-management/index.html` + `app.js`

Delete orphan `bot-management/style.css`. Rebrand as 猫の間 'Neko no Ma — Bot Control'. `--header-h:72px` here (body `padding-top` and `.tab-bar top:72px` depend on it).

**Navbar `.bot-navbar`** `.lintel` 72 px (backdrop-filter allowed, sticky): `.navbar-brand span` 🤖 → sprite `#neko` 28 px; `#botNavRestaurantName` (JS text 'Bot Control — Name') Mincho 600 1rem + sibling eyebrow '猫の間・Neko no Ma'; `#liveClock` as KDS; `#botCountDisplay` → `.btn-ghost`-shaped tag with `data-ja="猫"`; `#alertBell`: markup `🔔` → `<svg class="ico ico--md"><use href="../shared/icons.svg#i-bell"/></svg>` inside the span (JS toggles the class on the span only) + visually-hidden `aria-live="polite"` sibling 'Critical bot'; `.bell-alert` keeps `shakeRing` + `color:var(--primary)` + `drop-shadow(0 0 6px rgba(214,58,31,.5))`; `#botLogoutBtn` inline → `.btn-danger.btn-sm` `i-noren`.

**`.tab-bar`** → noren tabs; markup `🤖 Overview` → `<svg class=ico><use #i-neko-head/></svg><span class=jp>概要</span>Overview` (会話 Logs `i-scroll` / 人格 Character `i-mask` / 健康 Health `i-heart-pulse`); add `role="tablist"`/`role="tab"`/`aria-selected` (JS still toggles `.active`); edge-fade mask. `.section-header h1` + eyebrow; copy 'The fleet' / 'Conversations' / 'Personalities' / 'Health'.

**Overview**: `#botCardsGrid{grid-template-columns:repeat(auto-fill,minmax(280px,1fr));max-width:1280px}`. `.bot-card` → `.ema` name plate (rebuilt every 15 s → `animation:fadeIn .35s` only, no hover transform; border → kin-dim on hover); the `::before` stripe becomes the cord `border-top` by `.online/.charging/.offline`. `.bot-name` Mincho 600 1.125rem `--sumi-ink`; theme `.status-dot.green/.red/.yellow/.grey` → 10 px lanterns. `.character-badge` → kamon chip on paper (`background:var(--washi-bright);border:1px solid var(--washi-line)`; crest `::before` mask per `.char-*`; ink colours: naruto `--daidai`, goku `--kin-ink`, doraemon `--ai`, shinchan `--ume-ink`? no — shinchan `--momo` on a `--sumi-ink-2` text: use text `--sumi-ink` and crest `--momo`; luffy `--shu-ink`); **JS ✓** `CHARACTERS` labels lose the emoji ('Naruto', 'Goku', 'Doraemon', 'Shinchan', 'Luffy'). `.bot-table` **JS ✓** template `<span class="bot-table"><b class="hanko hanko--sm">${n}</b> Table</span>`. `.battery-bar-track` **[C3 koban]**: `background:var(--washi-2);height:10px;-webkit-mask:repeating-linear-gradient(90deg,#000 0 18%,transparent 18% 20%);mask:…` so the JS inline width fills five coin segments; **JS ✓** `getBatteryColor` returns `var(--matcha)` / `var(--kuchiba)` / `var(--shu)`. `.temp-reading::before` `i-thermo` mask (**JS ✓** `'🌡️ '` removed); `.temp-hot` `--shu-ink` + `mi-warning` (⚠️ removed). `.last-seen` label 'Registered' `--sumi-ink-3` mono. `.bot-actions` `border-top:1px dotted var(--washi-line)`; `.character-select` in `.select-wrap`; `.btn-restart` `.btn-sumi.btn-sm.mi-daruma` (`.restarting{--mi:var(--mi-enso-uri)}` spins; **JS ✓** `'⏳ Restarting...'`→`'Restarting…'`); `.btn-view-logs` `.btn-paper.btn-sm` + `i-scroll` (static icon allowed — JS never rewrites it). Empty div → **JS ✓** `class="empty-state"` '猫も休憩中・No bots found'.

**Live Logs**: `#logBotSelect` `.select-wrap`; `#refreshLogs` `.btn-paper.btn-sm` `i-refresh`; `#autoRefreshToggle` stays a leaf: `.btn-control.mi-bell` (furin), `.active-ctrl{color:var(--matcha-bright);border-color:var(--matcha)}` + `::before` sways (`sway 2s infinite`); **JS ✓** `'⏱ Auto ON'`→`'Auto ON'`. Wrap `#logFeed` in a new `<div class="scroll-frame">` (kakejiku rods `::before/::after` 10 px `--bg-surface-bright` with kin end caps); `#logFeed{height:clamp(360px,calc(100vh - 340px),720px);overflow-y:auto;padding:1rem;background:var(--bg-surface-low)}` (bounded → auto-scroll keeps working). `.log-entry.bot` paper bubble left with a generic `#neko` 24 px ring; `.log-entry.user` sumi bubble right; `.log-role.user/.bot` → `.hanko--sm` 客 / 猫; `.log-time` JetBrains .6875rem; **JS ✓** `'🐱 '` prefix removed; `.log-placeholder` → `.empty-state`.

**Character Control**: `.global-override-card` → `.lacquer` torii frame (`::before/::after` 6 px vertical shu bars left/right, 3 px kin lintel top; `position:relative;min-height`), `h3` '⚡ Global Override' → `i-mask` + 'Set every table 一斉'; `#globalCharacterSelect` `.select-wrap`; `#applyAllBtn` `.btn-seal.mi-mask` (**JS ✓** `'🎭 Apply to All'`→`'Apply to all'`, `'⏳ Applying...'`→`'Applying…'`); **markup edit** moves `#applyAllMsg` inside the card as `position:absolute;top:1rem;right:1rem` (no layout jump), styled as a `.hanko--kin`-coloured impression strip with `animation:stamp .32s` on each `display:none→block` (keep the inline `display:none`). `#characterTable` per §6.7 with kanji captions (名前 / 卓 / 現在 / 変更 / 適用); `.char-row-select` `.select-wrap`; `.btn-row-apply` `.btn-paper.btn-sm.mi-check`, `.success{background:var(--matcha-bright);color:var(--sumi-ink)}` (**JS ✓** `'✅ Done'`→`'Done'`). 'Dictionary' h3 inline styles → `.section-sub` with eyebrow '人格辞典・Personality dictionary' + `.rule-kin`; `.personality-grid` → five `.tanzaku` strips with `.pc-naruto … .pc-luffy` classes replacing the five inline `border-color`s (tie = `--c-*`); `.personality-card-emoji` → crest `<use>` 40 px in the crest colour; name + katakana `<small class=jp>` (ナルト / 悟空 / ドラえもん / しんちゃん / ルフィ).

**Health**: `.health-summary-row` → shide tags (`.health-pill` compact paper with a 3-tooth zig-zag `clip-path` bottom, kanji eyebrow 全 / 稼働 / 停止 / 危 / AI); `#mcpServerPill` **JS ✓** `checkMcpHealth` sets `pill.className = 'health-pill ' + ('is-online'|'is-degraded'|'is-down')` and text only → lantern lit kin / smouldering kuchiba / dark nezumi; `#healthTable` per §6.7 (first column sticky <768); `.badge-status` seals; `.text-danger` `--ume-light`; `.text-warn` `--kuchiba`; `tr.health-critical` 危 watermark; **JS ✓** `<span style="color:var(--success)">✅ Normal</span>` → `<span class="text-ok">Normal</span>` (`--matcha-bright`, `mi-check`).

| Emoji | → |
|---|---|
| 🤖 | `#neko` / `i-neko-head` |
| 📋 🎭 ❤️ 🔔 🚪 ⚡ | `i-scroll` `i-mask` `i-heart-pulse` `i-bell` `i-noren` `i-mask` |
| 🍥 🐉 🔔 😜 ☠️ | `i-crest-uzumaki` `-star` `-bell` `-swirl` `-hat` |
| 🌡️ ⚠️ 🔄 ⏳ ✅ ⏱ ↻ 🔋 🐱 | `i-thermo` `mi-warning` `mi-daruma` `mi-enso` `mi-check` `mi-bell` `i-refresh` `i-battery` (label) `#neko` |

**Keep**: `#tab-*` ids ↔ `data-tab`; `.tab-content{display:none}.active-tab{display:block}`; one `.character-select/.btn-restart/.btn-view-logs` per card and one `.btn-row-apply/.char-row-select` per row; leaf buttons JS rewrites; `#applyAllMsg` inline display; `.battery-bar` inline width + transition; `#logFeed` bounded scroll; script order.

### 7.8 Dev portal — `dev-setup.html` (low priority)

Remove the page-local `:root` (void/violet palette), the `html,body` background override, the dot-grid `body::before`, `.bg-glow-a/-b`, the Kosugi Maru + Inter + JetBrains `<link>`s (theme provides them), and the local `.btn-primary`/`.btn-danger` (theme seal/ume apply). `.module` → `.paper` cards with a `.lacquer-header` kakejiku bar (kanji eyebrow 新店 / 名簿 / 名札 / 座席; `.module-icon` → `i-lantern / i-scroll / i-user / i-table`); `.mod-violet/.mod-sakura/.mod-gold` → `--accent: var(--ai) / var(--sakura) / var(--kin)` on a 4 px top cord. `.hanko` 開発 and `.gate-seal` → the shared `.hanko--lg` (開発 / 開); `.portal-title` Mincho 600 2rem solid; `.portal-eyebrow` → `.eyebrow`; `.stat-coin` → koban (left-aligned under the title; `.hanko` hidden <640 to stop overlap). Gate: `.gate-card` `.paper` with a 準備中 `.noren`-style head; `svg.maneki` → the brand cat inline (rename `g.paw` → `g.mn-paw`, origin `82px 66px`, `pawWave` → `beckon`); `.gate-hint` password → `<details class="text-muted">Default dev password</details>`; `#gateError` keeps class `msg error` and the inline flex/none mechanism → omikuji strip (`.msg.success` 大吉 matcha, `.msg.error` 凶 ume), `slideUp` on show. Lists: `#restaurantList .row-item` short indigo noren strips (`.row-name` Mincho, `.code-badge` gold mon circle); `#credentialList .row-item` nafuda plates with `.role-badge` crests (`.role-admin` `i-soroban` kin, `.role-kds` `i-knife` shu-ink, `.role-bot` `i-neko-head` momo); `#tablesList{display:grid;grid-template-columns:repeat(auto-fill,64px);gap:.5rem}` tatami tiles with hover-revealed trash seal; `.empty-state` shared; `--ink-faint/--ink-mute` → `--text-muted` / `--sumi-ink-3`. **BUG FIX (required, JS ✓)**: add `window.deleteRestaurant = deleteRestaurant; window.deleteCredential = deleteCredential;` beside `window.deleteTable`. **Keep**: `#devGate`/`#devMain` inline display mechanics, `#devMain` `opacity:0` + `portalIn forwards`, `flash()` className rewrite, select ids as real `<select>`s, `#restCode` text input.

---

## 8. Motion

Principles: ma first; motion is ink and paper. Only three things move by themselves — the cat's paw, a lit lantern, a loading ensō. Everything else moves once, on a trigger, ≤400 ms. **Nothing animates on the 4 s / 5 s / 15 s re-renders** except the explicitly triggered `.flash-new`.

**Keep** (names consumed by pages): `wave float fadeInUp fadeIn slideUp pulse-glow` (theme); page-local `shakeX spin blink pop toastExit avatarBob mouthFlap shakeRing orbFloat catBob cardIn portalIn pawWave` may stay defined; `HighlightNew` (KDS) redefined.

**Add to theme.css** (§24):

| Keyframe | Definition | Duration / easing | Trigger |
|---|---|---|---|
| `beckon` | `0%,55%,100%{rotate:0} 15%{rotate:-22deg} 30%{rotate:6deg} 42%{rotate:-16deg}` | 2.4 s ease-in-out ∞ | `.mn-paw`; 4 s inside the sprite symbol |
| `enso-draw` | `from{stroke-dashoffset:300}to{stroke-dashoffset:0}` | 1.4 s ease-out once | hero/login ensō |
| `stamp` | `0%{opacity:0;transform:scale(1.35) rotate(-10deg)} 60%{opacity:1;transform:scale(.96) rotate(-5deg)} 100%{transform:scale(1) rotate(-6deg)}` | .32 s `--ease-spring` | seals appearing: role tab, `.active-step` icon, 確認/済/大吉, `#applyAllMsg`, checked chips |
| `ink-in` | `from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none}` (no `filter:blur` — cheap) | .3–.4 s `--ease-out` | section/tab/modal/step entry |
| `ember` | `0%,100%{box-shadow:0 0 0 0 rgba(214,58,31,.55)} 50%{box-shadow:0 0 0 6px rgba(214,58,31,0)}` | 1.2 s ∞ | `.timer.timer-red` (filled; text contrast constant), `#voiceBtn.recording` |
| `lantern` | `0%,100%{box-shadow:0 0 6px currentColor} 50%{box-shadow:0 0 16px currentColor}` | 2.4 s ∞ | `.kds-status-dot`, `.pulse-dot`, `.server-status .status-dot`, `#mcpServerPill.is-online::before` (all ≤12 px) |
| `ripple` | `0%{box-shadow:0 0 0 0 rgba(214,58,31,.45)} 100%{box-shadow:0 0 0 16px rgba(214,58,31,0)}` | .9 s ∞ | `#voiceBtn.recording` |
| `sakura-fall` | `0%{transform:translate(0,-10%) rotate(0)} 50%{transform:translate(14px,45%) rotate(140deg)} 100%{transform:translate(-8px,110%) rotate(300deg)}` | 9–14 s linear ∞, 4 petals | thank-you, confirmation, landing hero |
| `blink` | `50%{opacity:0}` | 1 s steps(2) ∞ | `.cursor` |
| `enso-spin` | `to{transform:rotate(360deg)}` | .9 s linear ∞ | spinners |
| `sway` | `0%{rotate:0} 25%{rotate:1.5deg} 75%{rotate:-1.2deg} 100%{rotate:0}`, origin top | .6 s once (hover) / 2 s ∞ (furin) | noren tab hover, `#autoRefreshToggle.active-ctrl::before` |
| `HighlightNew` (KDS page) | `0%{box-shadow:0 0 0 0 rgba(214,58,31,.55)} 100%{box-shadow:0 0 0 14px rgba(214,58,31,0)}` | .8 s × 3 = 2.4 s | `.order-card.flash-new` |
| `toastExit` (customer page) | `to{opacity:0;transform:translateX(16px)}` | .25 s forwards | `.toast.hiding` — required by JS |

Durations: fast 150 (hover/focus/colour), normal 250 (tabs, drawer 320), slow 400 (ink-in), stamp 320, draw 1400, beckon loop 2400. Hover = colour/border/1 px lift only; press = seal pushes down 1 px, 100 ms. Login success: optional 400 ms delay so the paw beckons once.

**Reduced motion** (theme.css, global):
```css
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}
  .hero-content > *, .module-card, .tab-content, .admin-section, #devMain, .step.active{opacity:1!important;transform:none!important}
  .sakura-drift{display:none} .mn-paw{animation:none;transform:rotate(0)}
}
```
`.toast.hiding` and `.flash-new` still fire `animationend` at .01 ms, so JS cleanup runs. The sprite's internal `<style>` carries the same query.

---

## 9. Accessibility

**Contrast** (computed, WCAG relative luminance):

| Pair | Ratio | Use |
|---|---|---|
| `#f7efe4` on `#100d0c` / `#1a1614` | 16.98 / 15.76 | body text |
| `#cbbfb0` on `#1a1614` | 9.94 | secondary |
| `#9d9183` on `#1a1614` / `#2b2521` | 5.83 / 4.90 | muted captions, empty states — the floor for readable text on dark |
| `#8a7f72` (new dimmed) on `#1a1614` | 4.59 | placeholders, decorative glyphs only (4.21 on `#231e1b` — never for copy there) |
| `#e3b55a` kin on `#1a1614` | 9.43 | eyebrows, totals |
| `#ff7a5c` on `#1a1614` | 7.01 | preparing badge, links |
| `#ffb347` lantern on `#2a1f19` lintel | 9.01 | restaurant-name caption |
| `#c8923e` / `#9fbf5a` / `#7fa3c8` / `#a39e97` / `#e07a8a` on `#1a1614` | 6.53 / 8.62 / 6.82 / 6.75 / 6.26 | status seals on dark |
| `#e0772b` / `#e99bb0` on `#1a1614` | 5.85 / 8.37 | Naruto / Shinchan crest text |
| `#3fae5a` / `#e04a3a` on `#1a1614` | 6.34 / 4.46 | veg / non-veg marks (graphics ≥ 3:1; as text use `--primary`) |
| `#1c1816` / `#3a332e` / `#6a5f55` on `#efe6d6` | 14.23 / 10.02 / 5.02 | sumi ink / ink-2 / ink-3 on paper |
| `#3a332e` on `#e4d9c4` | 8.87 | inactive role tabs on washi-2 (ink-3 would be 4.44 — not used there) |
| `#b3301a` shu-ink on `#efe6d6` | 5.06 | red text on paper (`#d63a1f` is 3.78 → fills/seals/≥24 px only) |
| `#4a6420` / `#7a5418` / `#6b4e12` / `#8f3140` / `#2b4a6f` on `#efe6d6` | 5.41 / 5.46 / 6.23 / 6.33 / 7.34 | matcha / kuchiba / kin / ume / ai ink on paper |
| `#2e7d32` / `#c62828` on `#efe6d6` | 4.14 / 4.54 | veg / non-veg marks on paper (graphics) |
| `#fff` on `#d63a1f` / `#b32a14` | 4.68 / 6.45 | seal buttons (bold ≥ .9375rem), ember timer |
| `#1c1816` on `#e3b55a` / `#9fbf5a` / `#f3b9c8` | 9.25 / 8.45 / 10.56 | Ready / Serve buttons, sakura chips |
| `#e3b55a` on `#d63a1f` | 2.46 | **never text** — gold kanji on vermilion is ≥14 px bold decoration beside a white English label |

Colour is never the only channel: every status seal carries kanji + English; veg/non-veg are circle vs triangle plus text; bot status = cord + glyph + text; critical rows add 危; urgent timers add 急; the toggle shows 営/休.

**Focus**: the global `:focus-visible` rule (§6.18) covers every control; visually hidden checkbox/radio inputs stay focusable (opacity 0, 1 px) and the label shows the ring via `:has(:focus-visible)` with `accent-color` fallback. Skip link `<a class="skip" href="#main">` on admin (`.admin-main` gets `id="main"`) and bots.

**Touch targets**: ≥44×44 for every button, tab, chip, tile and icon button (visual size may be 28–36 px; the hit area comes from padding); 48 px KDS actions, customer send/mic; 56 px on wall screens. Toasts never over the chat input; 16 px side gutters; `env(safe-area-inset-bottom)` on the customer input row; no horizontal page scroll.

**Semantics**: `aria-controls` fixed to `loginForm`; `role=alert` on `#errorBanner` kept; bots tab bar gets `role=tablist/tab/aria-selected`; `#alertBell` live text; decorative SVGs, kanji, tategaki and crests `aria-hidden="true"`; the hero cat `role="img" aria-label="Maneki-neko, the beckoning lucky cat"`; icons inside buttons `aria-hidden` with visible text or `aria-label`; `lang="ja"` on every kanji span; `font-variant-numeric: tabular-nums` on timers, clocks and prices.

**KDS legibility**: item names ≥18 px, qty 22 px, table seal 32 px numerals (45 px at wall scale), timer 24 px (30 px on wall); 1.15rem minimum for any ticket text. Inputs 16 px (no iOS zoom). Mincho never below 14 px. No flashing faster than 3 Hz (ember 0.83 Hz, shakeRing 2 Hz).

---
