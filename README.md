# ScamHelp.AI

ScamHelp.AI is an online scam detection tool that doubles as a verification tool and a teaching platform. It tells you whether something is legit or a scam before you click a link, share personal info, or send money, and it shows you why so you can spot the next one yourself.

## What it does

- **Check anything suspicious.** Upload a screenshot of an email, paste a text message, or attach a photo of a letter that seems off.
- **Browser extension.** Scans the page you're on and your emails, and flags dangerous links hidden in the HTML.
- **Clear verdict.** Scam or not, a 0–100 risk score, the scam type, highlighted red flags, and clear recommendations.
- **Annotated pages.** Marks up the page so you can see why something is a scam and how to spot it next time.

## How it works

Analysis runs as a two-stage pipeline.

**Stage 1: Decision model.** Through the browser extension, page content is sent to the API as text, URLs, and files (with the user's permission). The content is formatted and read by a decision model using the OpenAI GPT-6 Luna API, which quickly returns a verdict on whether the page may contain a scam, with a confidence level and the reasons behind it.

**Stage 2: Reviewer agent.** A Reviewer AI agent (built with the OpenAI package) fact-checks that evidence using specialized tools, then delivers the final verdict: scam or not, a 0–100 risk score, the scam type, and highlighted red flags with recommendations.

The first result is returned right away. The reviewer finishes in the background, and clients poll for the final verdict.

## Lessons

Confirmed scams become lessons that feed back into the agents and teach users. There is a lesson for each scam archetype, such as phishing, fake invoices, tech support scams, and impersonation, so users learn the pattern behind a scam instead of memorizing one example.

## Repository layout

| Folder | What it is |
| --- | --- |
| `api-server/` | Bun + Hono API. Collects evidence, runs the decision model and reviewer agent, stores results in Postgres, caches URL checks in Redis, stores uploads in S3/MinIO. |
| `browser-extension/` | Chrome extension (Manifest V3, React, Vite). Page and Gmail scanning, link checking, on-page annotations, popup and options UI. |
| `website/` | Next.js web app for pasting or uploading content, plus the extension landing page. |
| `testing-pages/` | Static phishing and safe pages for testing the extension. |

## API

| Endpoint | Purpose |
| --- | --- |
| `POST /v1/analyses` | Start an analysis from text, URL, image, audio, or PDF inputs. Returns the decision-model result. |
| `GET /v1/analyses/:id` | Fetch the current result. Status moves from `reviewing` to `completed`. |
| `POST /v1/assets/presign` | Get a presigned upload URL for a file. |
| `POST /v1/assets/:assetId/complete` | Confirm the upload landed. |
| `GET /v1/assets/:assetId` | Read asset metadata. |
| `POST /v1/check/url`, `POST /v1/check/urls` | Quick safe / warning / danger check for one URL or up to 100, used by link scanning. |
| `GET /health`, `GET /ready` | Liveness and readiness. |

## Evidence tools

The collector and reviewer use these tools to gather and verify evidence:

- URL inspection: redirect chain, HTTPS and TLS, suspicious URL features
- Domain lookup: age, registrar, DNS
- Threat intelligence: VirusTotal, PhishTank, URLhaus, AbuseIPDB
- Brand identity checks for impersonation
- Email header and body inspection (SPF, DKIM, DMARC, sender mismatches)
- QR code decoding and file scanning
- Phone and crypto address lookups
- Web search to confirm or refute "official" claims

## Running locally

```bash
cd api-server
cp .env.example .env        # add OPENAI_API_KEY
docker compose -f ../docker-compose.yml up -d postgres redis minio minio-init
bun install
bun run db:push
bun run dev                 # http://localhost:3000
bun run test
```

```bash
cd browser-extension && npm install && npm run build   # load dist/ as an unpacked extension
cd website && npm install && npm run dev
```

## Who it's for

Scams target people of all ages, but older adults and less tech-savvy users are targeted disproportionately. ScamHelp.AI is built with accessibility and education in mind. Most tools block a threat and move on. ScamHelp.AI explains what it found and why, so users build real instincts instead of relying on a filter alone, and learn to avoid scams entirely.
