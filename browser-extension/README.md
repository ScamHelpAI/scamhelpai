# ScamHelp browser extension

This folder is the React + TypeScript + Vite project for the browser extension.

Install dependencies and build the Manifest V3 extension:

```bash
npm install
npm run build
```

In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `browser-extension/dist`.

## Dev workflow

Run a watch build that rebuilds `dist/` whenever you save a file:

```bash
npm run dev:ext
```

Leave that running in a terminal. After each rebuild:

1. Go to `chrome://extensions`
2. Click the reload icon on the ScamHelp card

You only need to load unpacked once. Reload the extension after code changes.

`npm run dev` is only for the popup UI in a normal browser tab — it does not load as an extension.
