# ScamHelpAI API Server

Hono API on the [Bun](https://bun.com) runtime.

## Prerequisites

- [Bun](https://bun.com/docs/installation) 1.1+

## Setup

```sh
bun install
cp .env.example .env
# fill in OPENAI_API_KEY and optional provider keys
```

From the repo root, start local Postgres, Redis, and MinIO:

```sh
docker compose up -d postgres redis minio minio-init
```

Host ports: Postgres `5433`, Redis `6380`, MinIO `9100` / console `9101`.

## Asset uploads

1. `POST /v1/assets/presign` with `{ "contentType": "image/png", "filename": "shot.png" }`
2. `PUT` the file bytes to the returned `uploadUrl` (include `requiredHeaders`)
3. `POST /v1/assets/{assetId}/complete`
4. Use `assetId` in analysis inputs (`image` / `pdf` / `audio`)

## Rate limits

Per client IP:

**Short window** — fixed 60s in-memory counter:

| Route                          | Limit / min |
| ------------------------------ | ----------- |
| `POST /v1/check/url`           | 60          |
| `POST /v1/check/urls`          | 15          |
| `POST /v1/analyses`            | 5           |
| `GET /v1/analyses/:id`         | 30          |
| `POST /v1/assets/presign`      | 20          |
| `POST /v1/assets/:id/complete` | 20          |
| `GET /v1/assets/:id`           | 60          |

**Daily window** — rolling 24h Redis counter (`REDIS_URL` required; skipped if Redis is down):

| Route               | Limit / day |
| ------------------- | ----------- |
| `POST /v1/analyses` | 300         |

Health probes are not rate limited. Exceeded requests return `429` with `Retry-After` and `scope` of `minute` or `day`.

Push the Drizzle schema to Postgres:

```sh
bun run db:push
```

## Development

```sh
bun run dev
```

Open http://localhost:3000/health

## Database

```sh
bun run db:push      # sync schema to the database (dev)
bun run db:generate  # generate SQL migrations
bun run db:studio    # open Drizzle Studio
```

## Production

```sh
bun run start
```

Bun runs TypeScript directly — no separate build step is required for deployment.

## Typecheck

```sh
bun run typecheck
```

## Lint & format

```sh
bun run lint
bun run lint:fix
bun run format
bun run format:check
```

## Deploy (Railway)

1. Create a Railway service pointing at `api-server/`
2. Set the start command to `bun run start`
3. Add environment variables from `.env.example` (use an AI Gateway API key)
