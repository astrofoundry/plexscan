# PlexScan

Webhook relay: Radarr/Sonarr -> Plex partial scan. Node 24, TypeScript, Fastify 5, Zod 4, pnpm.

## Scripts

- `pnpm dev` — watch mode via tsx
- `pnpm build` — esbuild single-file bundle to `dist/server.mjs`
- `pnpm check` — TypeScript typecheck
- `pnpm test` — Vitest
- `pnpm lint` — ESLint
- `pnpm format` — Prettier

## Architecture

`src/server.ts` loads config, builds app, listens.
`src/app.ts` — Fastify app factory (`buildApp(config)`). Wires health route (no auth), webhook routes (scoped with auth hook), PlexClient, ScanDebouncer.
`src/config.ts` — Zod env validation + `rewritePath` helper. All env vars required except `PORT` (default 7890) and optional `PATH_REWRITE_FROM`/`TO` pair.
`src/routes/webhook.ts` — POST `/webhook/radarr` and `/webhook/sonarr`. Only processes `Download` events.
`src/services/plex.ts` — `PlexClient` wraps `fetch` with 5s timeout, no retry.
`src/services/debounce.ts` — `ScanDebouncer` per-path sliding window (5s).
`src/hooks/auth.ts` — `X-Webhook-Secret` header validation.

## Testing

Tests use `fastify.inject()` for HTTP integration, `vi.useFakeTimers()` for debounce, `vi.stubGlobal("fetch")` for Plex client. Fake timers conflict with Fastify internals — debounce timing tests are in `test/services/debounce.test.ts` only.

## Docker

Multi-stage build: esbuild bundles everything into a single `server.mjs`. Production image has no `node_modules`.
