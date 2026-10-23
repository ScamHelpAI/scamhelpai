# ScamHelp browser extension

This folder is the React + TypeScript + Vite project for the browser extension.
It includes a toolbar popup, options page, page content reader, and a background
worker that talks to the current `api-server` at `POST /v1/analyses`.

UI uses [shadcn/ui](https://ui.shadcn.com) with the **Nova** preset
(`components.json` style `radix-nova`). Add more components with
`npx shadcn@latest add <name>`.

Install dependencies and build the Manifest V3 extension:

```bash
npm install
npm run build
```

In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `browser-extension/dist`.

Start the API server (`cd ../api-server && bun run dev`) before analyzing pages.

## What it does

- **Any page:** the popup can read the current tab’s cleaned HTML.
- **Link scan toggle:** enable “Scan links on pages” in the popup to auto-check `http`/`https` links via `POST /v1/check/urls` (amber caution / blocked-unsafe; safe links left alone).
- **Settings:** set the analyzer address (default `https://api.scamhelp.ai`). For a custom API host, add that origin to `host_permissions` in `public/manifest.json` and rebuild if it is not already covered.

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
