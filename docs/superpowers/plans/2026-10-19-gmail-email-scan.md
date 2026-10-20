# Gmail Email Scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-page Gmail “Check with ScamHelp” button that analyzes the open email as text and highlights risky parts only inside the email body.

**Architecture:** Extend annotations to accept an optional root; add a Gmail content script that extracts the open message, drives analyze/poll via existing background messages, and applies scoped highlights.

**Tech Stack:** Chrome MV3 content scripts, TypeScript, existing analyze API.

## Global Constraints

- Reuse existing `analyze` / `getAnalysis` / annotations; do not duplicate LLM logic.
- Gmail selectors prefer `data-legacy-message-id`; body uses `.a3s` (known fragile).
- Scope annotations via root so the same script works for page or email.

---

### Task 1: Scoped annotations API

**Files:**
- Modify: `browser-extension/src/content/annotations/decorate.ts`
- Modify: `browser-extension/src/content/annotations/index.ts`
- Modify: `browser-extension/src/shared/messages.ts`
- Test: `browser-extension/src/content/annotations/highlight.test.ts` (or new decorate test)

- [ ] Add `root` / `rootSelector` options to `applyAnnotations` and `clearAnnotations`
- [ ] Apply glow class to root element when scoped, else `body`
- [ ] Pass `rootSelector` through `ApplyPageAnnotationsMessage` and content listener
- [ ] Unit test that a quote outside the root is not wrapped

### Task 2: Gmail DOM helpers + button + scan flow

**Files:**
- Create: `browser-extension/src/content/gmail/dom.ts`
- Create: `browser-extension/src/content/gmail/dom.test.ts`
- Create: `browser-extension/src/content/gmail/button.ts`
- Create: `browser-extension/src/content/gmail/scan.ts`
- Create: `browser-extension/src/content/gmail/index.ts`

- [ ] Find open message container and `.a3s` body; extract subject/from/body text
- [ ] Mark body with `data-scamhelp-annotate-root`
- [ ] Inject button; loading/error states
- [ ] On click: analyze → poll → `applyAnnotations` with email root
- [ ] MutationObserver / hashchange to re-inject when Gmail SPA navigates

### Task 3: Wire build + manifest

**Files:**
- Modify: `browser-extension/vite.config.ts`
- Modify: `browser-extension/public/manifest.json`

- [ ] Bundle `content/gmail.js`
- [ ] Register content script for `https://mail.google.com/*`
- [ ] Run extension tests and build
