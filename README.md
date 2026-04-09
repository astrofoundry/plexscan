# PlexScan

Lightweight webhook relay that triggers Plex partial scans when Radarr or Sonarr import media. No polling, no filesystem watchers — pure event-driven.

## How it works

1. Radarr/Sonarr imports media and sends a webhook to PlexScan
2. PlexScan validates the secret, extracts the folder path, and debounces duplicate events (5s window)
3. PlexScan tells Plex to scan just that folder
4. New media appears in Plex within seconds

## Docker Compose

```yaml
services:
  plexscan:
    image: ghcr.io/astrofoundry/plexscan:latest
    container_name: plexscan
    restart: unless-stopped
    ports:
      - "7890:7890"
    environment:
      - PLEX_URL=http://YOUR_PLEX_IP:32400
      - PLEX_TOKEN=your_plex_token
      - MOVIES_SECTION_ID=1
      - TV_SECTION_ID=2
      - WEBHOOK_SECRET=your_secret
```

## Environment Variables

| Variable                   | Required | Default | Description                                                                                                          |
| -------------------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------- |
| `PLEX_URL`                 | Yes      | —       | Plex server URL                                                                                                      |
| `PLEX_TOKEN`               | Yes      | —       | Plex token ([how to find](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)) |
| `MOVIES_SECTION_ID`        | Yes      | —       | Plex library section ID for movies                                                                                   |
| `TV_SECTION_ID`            | Yes      | —       | Plex library section ID for TV shows                                                                                 |
| `WEBHOOK_SECRET`           | Yes      | —       | Shared secret for webhook authentication                                                                             |
| `PORT`                     | No       | `7890`  | Port PlexScan listens on                                                                                             |
| `RADARR_PATH_REWRITE_FROM` | No       | —       | Radarr path prefix to replace (must set both or neither)                                                             |
| `RADARR_PATH_REWRITE_TO`   | No       | —       | Replacement prefix for Plex movie paths                                                                              |
| `SONARR_PATH_REWRITE_FROM` | No       | —       | Sonarr path prefix to replace (must set both or neither)                                                             |
| `SONARR_PATH_REWRITE_TO`   | No       | —       | Replacement prefix for Plex TV paths                                                                                 |

## Finding your Plex section IDs

```bash
curl -s "http://YOUR_PLEX_IP:32400/library/sections?X-Plex-Token=YOUR_TOKEN" | grep -o 'key="[0-9]*" type="[^"]*" title="[^"]*"'
```

Example output:

```
key="1" type="movie" title="Movies"
key="2" type="show" title="TV Shows"
```

Use the `key` values as `MOVIES_SECTION_ID` and `TV_SECTION_ID`.

## Radarr/Sonarr webhook setup

1. **Settings > Connect > Add > Webhook**
2. Triggers: **On Import**, **On Upgrade**
3. URL: `http://PLEXSCAN_HOST:7890/webhook/radarr` (or `/webhook/sonarr`)
4. Method: `POST`
5. Add header: `X-Webhook-Secret` with your secret value

## Path rewriting

If Radarr/Sonarr see media at different mount paths than Plex, configure per-source rewrites:

```yaml
environment:
  - RADARR_PATH_REWRITE_FROM=/movies
  - RADARR_PATH_REWRITE_TO=/MEDIA/MOVIES
  - SONARR_PATH_REWRITE_FROM=/tv
  - SONARR_PATH_REWRITE_TO=/MEDIA/TV
```

Radarr importing at `/movies/Foo` triggers a Plex scan at `/MEDIA/MOVIES/Foo`.

## Local development

```bash
pnpm install
cp .env.example .env  # edit with your values
pnpm dev
```

## License

MIT
