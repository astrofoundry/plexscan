# PlexScan

Webhook relay: Radarr/Sonarr -> Plex partial scan. Node 24, TypeScript, node:http, Zod 4, pnpm.

## Scripts

- `pnpm dev` — watch mode via tsx
- `pnpm build` — esbuild single-file bundle to `dist/server.mjs`
- `pnpm check` — TypeScript typecheck
- `pnpm test` — Vitest
- `pnpm lint` — ESLint
- `pnpm format` — Prettier
- `pnpm release:patch|minor|major` — bump, tag, push (triggers CI)

## Architecture

`src/server.ts` loads config, creates logger, builds app, listens.
`src/app.ts` — `node:http` server factory (`buildApp(config, logger)`). Routes: GET `/health` (no auth), POST `/webhook/radarr` and `/webhook/sonarr` (auth via `X-Webhook-Secret` header).
`src/config.ts` — Zod env validation + `rewritePath` helper. All env vars required except `PORT` (default 7890) and optional per-source path rewrite pairs.
`src/logger.ts` — Minimal structured JSON logger.
`src/services/plex.ts` — `PlexClient` wraps `fetch` with 5s timeout, no retry.
`src/services/debounce.ts` — `ScanDebouncer` per-path sliding window (5s).
`src/schemas/webhook.ts` — Zod schemas for Radarr/Sonarr payloads.

## Dependencies

One production dep: `zod`. Everything else is `node:*` built-ins.

## Docker

Multi-stage build: esbuild bundles everything into a single `server.mjs` (~500KB). Production image has no `node_modules`.

## CI

GitHub Actions on `v*` tags: check → build + push Docker image to GHCR → create GitHub Release.
