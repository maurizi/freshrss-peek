# FreshRSS Peek

A Firefox extension that lets you peek at your unread [FreshRSS](https://freshrss.org/) articles directly from the toolbar.

## Features

- **Inline popup** — Click the toolbar icon to see unread articles without leaving your current page
- **Read articles inline** — Expand article content right in the popup (sanitized with DOMPurify)
- **Mark as read** — Click an article link or use the envelope button to toggle read/unread state
- **Badge count** — Shows unread article count on the toolbar icon
- **Theme-aware** — Adapts to your Firefox light/dark theme
- **Periodic checking** — Configurable auto-refresh interval
- **Sidebar support** — Optionally open FreshRSS in Firefox's sidebar

## Setup

1. Install the extension
2. Click the icon — you'll be prompted to open settings
3. Enter your FreshRSS URL, username, and API password
4. The API password is set in your FreshRSS profile under *API Management* (not your login password)
5. FreshRSS must have the Google Reader API enabled (`/api/greader.php`)

## Development

```bash
npm install
npm run dev          # Watch mode (rebuilds on change)
npm run start:firefox  # Launch Firefox with extension loaded
```

### Build

```bash
npm run build        # Production build
npm run web-ext:build  # Build .xpi package
```

### Lint

```bash
npm run lint:types   # TypeScript type checking
npm run lint:code    # Biome linter
```

## Tech Stack

- **Manifest V3** (service worker, ES modules)
- **TypeScript** with strict mode
- **ESBuild** for bundling
- **Biome** for linting/formatting
- Vanilla HTML/CSS popup (no frameworks)

## Credits

This project combines and builds upon two existing FreshRSS extensions:

- **[FreshRSS-Notify](https://github.com/Purexo/FreshRSS-Notify)** by [Purexo](https://github.com/Purexo) — Google Reader API integration and popup article viewer
- **[FreshRSS-Checker](https://github.com/Brawl345/FreshRSS-Checker)** by [Brawl345](https://github.com/Brawl345) — MV3 architecture, TypeScript/ESBuild toolchain, options page, and onboarding flow

## License

MIT
