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

## Development

```sh
bun run dev
```

Open http://localhost:3000/health

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
3. Add environment variables from `.env.example`
