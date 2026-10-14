# ScamHelp browser extension

This folder is the React + TypeScript + Vite project for the browser extension.
It includes a toolbar popup, a page content reader, and a background worker
that talks to the current `api-server` at `POST /v1/analyses`.

Install dependencies and build the Manifest V3 extension:

```bash
npm install
npm run build
```

In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `browser-extension/dist`.

Start the API server (`cd ../api-server && bun run dev`) before analyzing pages.

## What it does

- **Any page:** the popup can read the current tab’s cleaned HTML.
- **Settings:** set the analyzer address (default `http://localhost:3000`). If you point it somewhere other than localhost, add that origin to `host_permissions` in `public/manifest.json` and rebuild.

## Dev workflow

Run a watch build that rebuilds `dist/` whenever you save a file:

```bash
npm run dev:ext
```

Leave that running in a terminal. After each rebuild:

1. Go to `chrome://extensions`
2. Click the reload icon on the ScamHelp card

You only need to load unpacked once.

`npm run dev` is only for the popup UI in a normal browser tab — it does not load as an extension, and Chrome APIs will not work there.

```bash
npm test
```
