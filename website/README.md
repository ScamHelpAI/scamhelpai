# Scam Help.AI Website

Next.js site for [Scam Help.AI](https://scamhelp.ai). Uses the same shadcn theme tokens, brand colors, and Atkinson Hyperlegible Next typeface as the browser extension.

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Analysis requests are proxied through Next.js route handlers to `https://api.scamhelp.ai` (override with `SCAMHELP_API_BASE` in `.env.local`).

## Stack

- Next.js (App Router) + React 19
- Tailwind CSS v4 + shadcn/ui (radix-nova)
- Shared design tokens with `browser-extension/src/popup/styles.css`
