# Gmail email scan + scoped annotations

## Goal

When viewing an open email in Gmail, show a ScamHelp button that analyzes that email’s text in-page (analyze → poll → highlight), with highlights restricted to the email body—not the whole Gmail chrome.

## Product

- Button appears near the open message body.
- Click runs the full flow in-page: loading on the button → POST analysis → poll until completed → apply highlights inside the email body.
- Same annotations module as page scan; scoping is via an optional root element/selector.

## Design

1. **Scoped annotations** — `applyAnnotations` accepts optional `root` (element or CSS selector). Clear/apply/glow only within that root. Default remains `document.body` for full-page scans.
2. **Gmail content script** — registered for `https://mail.google.com/*`. Detects an open message (`[data-legacy-message-id]` + body `.a3s`), injects the button, extracts subject/from/body text, marks the body with `data-scamhelp-annotate-root`, calls background `analyze` / `getAnalysis`, then applies annotations with that root.
3. **Payload** — `{ type: "text", content }` (subject + body), `context.source: browser_extension`, `pageUrl` = Gmail URL.

## Out of scope

- Popup-driven Gmail scan
- Non-Gmail mail clients
- Multi-message thread batch analysis (v1: newest/visible open message body)
