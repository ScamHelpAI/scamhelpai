# ScamHelp browser extension

This folder is the React + TypeScript + Vite project for the browser extension.

The popup has an **Analyze page** button. For testing, the content script adds a
green **Test** pill and checkbox above every HTTP(S) link on the current page.

Install dependencies and build the Manifest V3 extension:

```bash
npm install
npm run build
```

In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `browser-extension/dist`.
