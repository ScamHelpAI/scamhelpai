# ScamHelp.AI — Email Chrome Extension

A Manifest V3 extension that checks the Gmail message you're reading for phishing
and scam signals, using the `api-server` in this repo.

## Run it

1. Start the analyzer:

   ```
   cd ../api-server
   npm install
   npm run dev          # http://localhost:3000
   ```

   Set `AI_GATEWAY_API_KEY` in `api-server/.env` to enable the LLM analyzer;
   without it the heuristic analyzers still run.

2. Load the extension: `chrome://extensions` → enable Developer mode →
   **Load unpacked** → select this folder.

3. Open Gmail, click an email, press **🛡️ Check this email** at the bottom right.
   The toolbar popup can also check the open email or any pasted text.

If the analyzer runs somewhere other than `http://localhost:3000`, set the address
in the extension's Settings page and add that origin to `host_permissions` in
`manifest.json`.

## How it works

| File | Role |
| --- | --- |
| `content/gmail.js` | Reads the open Gmail message (sender, subject, body, links) and renders the verdict panel |
| `background.js` | The only caller of `POST /analyze`, so page CSP and CORS never block a check |
| `popup.html/js` | Toolbar entry point: check the open email, or paste text |
| `options.html/js` | Stores the analyzer address in `chrome.storage.sync` |

The request sent is `{ type: "text", text, url }` — the email as plain text, plus
the first link found in the body. The response is rendered in plain language with
a read-aloud button.

## Designed for older readers

- 18–26px type, 4px focus rings, large tap targets, no colour-only signals
  (every verdict carries an icon and a sentence).
- Verdict copy leads with the action ("Do not enter your login information"),
  not the score.
- `🔊 Read this to me` speaks the verdict via the browser's speech synthesis.

## Known limits

- Gmail only. Its DOM is generated, so `div.adn.ads` / `div.a3s` selectors may
  need updating if Gmail changes.
- Email body text is sent to the analyzer, which may forward it to an LLM.
  Say so before putting this in front of real users.
- No attachment or image analysis yet.
