# Internal Cookies DB – Agent Guide

This file gives AI agents and contributors quick context for the **internal-cookies-db** project.

## What This Project Is

**Internal Cookies Database** is a browser-based reference app for tracking and categorizing cookies, scripts, and localStorage items (e.g. for consent or compliance). It uses **Osano-style categories**: Essential, Analytics, Marketing, Personalized, Blocklisted.

- **Audience**: Internal teams (not public-facing).
- **Stack**: Vanilla HTML, CSS, and JavaScript. No build step, no framework.
- **Data**: Seed data from `data/cookies-db.json`, `data/scripts-db.json`, and `data/localstorage-db.json`; user-added and edited data in `localStorage`.

## Project Structure

```
internal-cookies-db/
├── index.html              # Single-page app: header, page nav (Cookies / Scripts / LocalStorage), search, category tabs, lists, modals
├── cookies-db.css          # Styles (CSS variables, dark theme, category colors, modals, responsive)
├── cookies-db.js           # Cookies tab: CookiesDatabase class, load/save, filter, render, CRUD
├── scripts-db.js           # Scripts tab: ScriptsDatabase class + page navigation (initPageNavigation)
├── localstorage-db.js      # LocalStorage tab: LocalStorageDatabase class, load/save, filter, render, CRUD
├── data/
│   ├── cookies-db.json     # Seed cookie list + categories (loaded via fetch)
│   ├── scripts-db.json     # Seed script list + categories (loaded via fetch)
│   └── localstorage-db.json # Seed localStorage item list + categories (loaded via fetch)
└── AGENTS.md               # This file
```

## Tech Stack & Conventions

- **No build**: Open `index.html` in a browser or serve the folder with any static server (e.g. `npx serve .`). Fetch of `./data/cookies-db.json` requires same-origin (file:// may need a local server).
- **JS**: Three global classes — `CookiesDatabase` (`window.cookiesDB`), `ScriptsDatabase` (`window.scriptsDB`), and `LocalStorageDatabase` (`window.localStorageDB`) — each instantiated after `DOMContentLoaded`. Page navigation is handled by `initPageNavigation()` in `scripts-db.js`.
- **Styling**: CSS variables in `:root` in `cookies-db.css`; category colors and badges (e.g. `.category-badge.analytics`).
- **Security**: User-supplied strings are escaped with `escapeHtml()` before being used in innerHTML to avoid XSS.

## Data Model & Storage

### Cookie object

- **id** (string): Unique (e.g. `ga-001` for seed, `cookie-{timestamp}-{random}` for manual).
- **name** (string): Cookie name, e.g. `_ga`.
- **provider** (string): e.g. Google Analytics.
- **category** (string): `Essential` | `Analytics` | `Marketing` | `Personalized` | `Blocklisted`.
- **expiry** (string): e.g. `2 years`, `Session`, `30 days`.
- **regex** (string): Pattern to match cookie name (e.g. `^_ga$`).
- **description** (string): What the cookie does.
- **sourceUrl** (string, optional): Link to docs.
- **deprecated** (boolean, optional): `true` if the cookie is deprecated. Omit or leave absent for active cookies.
- **addedBy** (string): `seed` (from JSON) or `manual` (user-added).

### LocalStorage item object

- **id** (string): Unique (e.g. `vwo-ls-001` for seed, `ls-{timestamp}-{random}` for manual).
- **name** (string): localStorage key name, e.g. `_vwo_nlsCache`.
- **provider** (string): e.g. VWO (Visual Website Optimizer).
- **category** (string): `Essential` | `Analytics` | `Marketing` | `Personalized` | `Blocklisted`.
- **persistence** (string): e.g. `Persistent (localStorage)`, `Session (cleared on tab close)`.
- **regex** (string): Pattern to match key name (e.g. `^_vwo_nlsCache$`).
- **description** (string): What the item stores in short sentence.
- **sourceUrl** (string, optional): Link to docs.
- **addedBy** (string): `seed` (from JSON) or `manual` (user-added).

### How data is loaded and persisted

Each tab (Cookies, Scripts, LocalStorage) follows the same pattern:

1. **Seed data**: Fetched from the corresponding JSON file (`data/cookies-db.json`, `data/scripts-db.json`, `data/localstorage-db.json`).
2. **User items**: `localStorage.userCookies` / `localStorage.userScripts` / `localStorage.userLsItems` — arrays with `addedBy: 'manual'`.
3. **Seed edits**: `localStorage.modifiedSeedCookies` / `modifiedSeedScripts` / `modifiedSeedLsItems` — object `{ [id]: partialItem }` merged over seed.
4. **Seed deletes**: `localStorage.deletedSeedCookies` / `deletedSeedScripts` / `deletedSeedLsItems` — array of seed IDs to hide.

Final list = (seed minus deleted, with modifications applied) + user items. Seed files are never written; only localStorage is updated on add/edit/delete.

## Main Behaviors (cookies-db.js)

- **init()**: `loadData()` → `bindEvents()` → `render()`.
- **loadData()**: Fetches JSON, reads localStorage, merges and filters seed, then sets `this.cookies` and runs `filterCookies()`.
- **filterCookies()**: Filters by `currentCategory`, `searchQuery` (name, provider, description, regex), and `showDeprecatedOnly` toggle; sorts by name.
- **render()**: Updates category counts (including deprecated count), renders cookie cards with deprecated badges where applicable (or empty state). Card click opens detail modal.
- **CRUD**: Add (new id, `addedBy: 'manual'`, save to `userCookies`); Edit (seed → `modifiedSeedCookies`, manual → `userCookies`); Delete (seed → `deletedSeedCookies`, manual → remove from `userCookies`).
- **Export**: Current `this.cookies` + categories + metadata as JSON file download.

## UI Elements (index.html + cookies-db.css)

- **Page navigation**: `.page-nav` with `[data-page]` tabs (`cookies`, `scripts`, `localstorage`). Handled by `initPageNavigation()` in `scripts-db.js`.
- **Search**: `#searchInput` (cookies), `#scriptSearchInput` (scripts), `#lsSearchInput` (localStorage); clear buttons; live filter on input.
- **Category tabs**: `[data-category]` (all, Essential, Analytics, Marketing, Personalized, Blocklisted); counts in `#count-*` / `#script-count-*` / `#ls-count-*`.
- **Deprecated toggle**: `#deprecatedToggle` button (cookies page only) filters to show only deprecated cookies; count in `#count-deprecated`. Amber styling (`.deprecated-toggle`, `.deprecated-badge`).
- **Lists**: `#cookieList` / `#scriptList` / `#lsList` (grid of cards); `#emptyState` / `#scriptEmptyState` / `#lsEmptyState` when no results.
- **Modals**: Each tab has its own Add/Edit, Detail, and Delete confirmation modals (prefixed `ls*` for LocalStorage, `script*` for Scripts).
- **Toast**: `#toast` / `#toastMessage` for success/error (shared across all tabs).

When changing UI or copy, keep category IDs and `data-category` values in sync with the five categories across all three JS files and their corresponding HTML sections.

## Description Writing Guidelines

When writing or editing `description` fields in any of the three data files, follow these rules:

- **No examples**: Do not include example values, sample names, or illustrative lists (e.g. "like jQuery, D3.js, and Bootstrap" or "e.g. React, Sentry"). State what the item does in general terms.
- **No injection notes**: Do not mention that something "could be injected" or "is being injected by a compromised browser extension or external party." If something is suspicious, the category (Blocklisted) already conveys that.
- **No classification instructions**: Do not include guidance on how to classify, triage, or handle the item (e.g. "Block until purpose is confirmed", "re-categorize only if the site confirms provider and purpose", "use Osano Ignore", "check cookie domain and which script sets it to confirm origin"). The category assignment is the classification; the description should only explain what the item is and what it does.
- **Keep descriptions factual and concise**: State the provider, purpose, and any notable behavior. Avoid instructional or advisory language directed at the reader.

## Where to Change What

- **Add/change seed cookies**: Edit `data/cookies-db.json`. Preserve structure (id, name, provider, category, expiry, regex, description, sourceUrl, addedBy). To mark a cookie as deprecated, add `"deprecated": true` — the UI will show an amber badge on cards and a warning banner in the detail modal. Cookies discovered by consent tools (e.g. Osano) with unknown provider and purpose are kept in seed as **Blocklisted** so they are blocked by default until a site confirms otherwise.
- **Add/change seed scripts**: Edit `data/scripts-db.json`. Same structure as cookies but without `expiry`; uses `regex` for URL pattern matching.
- **Add/change seed localStorage items**: Edit `data/localstorage-db.json`. Uses `persistence` instead of `expiry` (e.g. `Persistent (localStorage)`, `Session (cleared on tab close)`). Items that are really localStorage entries (not cookies) belong here — e.g. VWO localStorage keys, Osano `osano_consentmanager_tattles`.
- **Categories**: Update `index.html` (tabs + select options), the corresponding JS file (counts object, filter), and `cookies-db.css` (badge/dot colors) together. All three tabs share the same five categories.
- **Validation or new fields**: Form in `index.html`, `save*()` and detail modal in the corresponding JS file, and JSON schema if you add one.
- **Deprecated cookies**: Set `"deprecated": true` in `data/cookies-db.json`. The flag is surfaced automatically: amber badge on cards, filter toggle (`#deprecatedToggle`), and warning banner in the detail modal. No changes needed in JS/CSS/HTML when adding new deprecated cookies.
- **Styling**: `cookies-db.css` only; use existing variables for consistency. Deprecated-related styles use amber (`#f59e0b`) — see `.deprecated-badge`, `.deprecated-toggle`, `.deprecated-banner`.

## Running / Developing

- **Local**: Serve the project root (e.g. `npx serve .` or VS Code Live Server) and open the app URL so `./data/cookies-db.json` loads.
- **No tests or package.json** in the repo; keep changes in plain JS and CSS so the app stays dependency-free.

Use this file as the single source of context for project layout, data flow, and where to implement changes.
