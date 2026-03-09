# Internal Cookies DB

An internal reference app for tracking and categorizing cookies, scripts, and localStorage items used across our sites. Built to support consent and compliance workflows with [Osano](https://www.osano.com/)-style categories.

## Categories

| Category | Purpose |
|---|---|
| Essential | Required for basic site functionality |
| Analytics | Used for traffic and usage measurement |
| Marketing | Used for advertising and campaign tracking |
| Personalized | Used for user preference and personalization |
| Blocklisted | Unconfirmed or blocked until reviewed |

## Getting Started

No build step or dependencies required. Just serve the files locally:

```bash
npx serve .
```

Or use **VS Code Live Server**. A local server is needed because the app fetches JSON data files.

## Project Structure

```
index.html              # Single-page app entry point
cookies-db.css          # All styles
cookies-db.js           # Cookies tab logic
scripts-db.js           # Scripts tab logic + page navigation
localstorage-db.js      # LocalStorage tab logic
data/
  cookies-db.json       # Seed cookie entries
  scripts-db.json       # Seed script/iframe entries
  localstorage-db.json  # Seed localStorage entries
```

## How It Works

- **Seed data** is loaded from the JSON files in `data/`.
- **User additions and edits** are saved to the browser's `localStorage` — the JSON files are never modified at runtime.
- Each tab (Cookies, Scripts, LocalStorage) supports searching, filtering by category, and adding/editing/deleting entries.

## Tech Stack

Vanilla HTML, CSS, and JavaScript. No frameworks, no build tools, no dependencies.
