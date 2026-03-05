# Internal Cookies DB

Browser-based reference app for tracking and categorizing cookies, scripts, and localStorage items for consent/compliance. Uses **Osano-style categories**: Essential, Analytics, Marketing, Personalized, Blocklisted.

- **Audience**: Internal teams (not public-facing).
- **Stack**: Vanilla HTML, CSS, JavaScript. No build step, no framework, no dependencies.
- **Run locally**: `npx serve .` or VS Code Live Server (fetch requires same-origin).

## Project Structure

```
index.html              # SPA: header, page nav, search, category tabs, lists, modals
cookies-db.css          # All styles (CSS variables, dark theme, category colors, responsive)
cookies-db.js           # Cookies tab: CookiesDatabase class
scripts-db.js           # Scripts tab: ScriptsDatabase class + initPageNavigation()
localstorage-db.js      # LocalStorage tab: LocalStorageDatabase class
data/
  cookies-db.json       # Seed cookies
  scripts-db.json       # Seed scripts
  localstorage-db.json  # Seed localStorage items
```

## Data Models

### Cookie object
`id`, `name`, `provider`, `category`, `expiry`, `regex`, `description`, `sourceUrl` (optional), `deprecated` (boolean, optional), `addedBy` ("seed" | "manual").

### Script object
`id`, `name`, `provider`, `category`, `regex` (URL pattern), `description`, `sourceUrl` (optional), `addedBy` ("seed" | "manual").

### LocalStorage object
`id`, `name`, `provider`, `category`, `persistence`, `regex`, `description`, `sourceUrl` (optional), `addedBy` ("seed" | "manual").

### Categories (shared across all three tabs)
`Essential` | `Analytics` | `Marketing` | `Personalized` | `Blocklisted`

## Data Flow

Each tab follows the same pattern:
1. **Seed data** fetched from `data/*.json`.
2. **User items** in `localStorage.userCookies` / `userScripts` / `userLsItems`.
3. **Seed edits** in `localStorage.modifiedSeedCookies` / `modifiedSeedScripts` / `modifiedSeedLsItems`.
4. **Seed deletes** in `localStorage.deletedSeedCookies` / `deletedSeedScripts` / `deletedSeedLsItems`.

Final list = (seed - deleted + modifications) + user items. Seed JSON files are never written to; only browser localStorage is updated.

## Where to Change What

- **Add/change seed cookies**: `data/cookies-db.json`. Mark deprecated with `"deprecated": true`. Unknown cookies from Osano go in as **Blocklisted**.
- **Add/change seed scripts**: `data/scripts-db.json`. Same as cookies but no `expiry`; `regex` matches URL patterns.
- **Add/change seed localStorage items**: `data/localstorage-db.json`. Uses `persistence` instead of `expiry`.
- **Categories**: Update `index.html` (tabs + selects), the JS file (counts, filter), and `cookies-db.css` (badge colors) together.
- **Styling**: `cookies-db.css` only. Use existing CSS variables. Deprecated styles use amber (`#f59e0b`).

## Description Writing Rules

When writing `description` fields in seed data files:
- **No examples** (no "like jQuery, D3.js" or "e.g. React, Sentry").
- **No injection notes** (no "could be injected by compromised extension").
- **No classification instructions** (no "Block until confirmed", "use Osano Ignore").
- **Factual and concise**: provider, purpose, notable behavior only.

## Architecture Notes

- Three global classes: `CookiesDatabase` (`window.cookiesDB`), `ScriptsDatabase` (`window.scriptsDB`), `LocalStorageDatabase` (`window.localStorageDB`), instantiated on `DOMContentLoaded`.
- Page navigation via `initPageNavigation()` in `scripts-db.js`.
- User input escaped with `escapeHtml()` before innerHTML (XSS prevention).
- No tests or package.json. Keep changes in plain JS/CSS.
