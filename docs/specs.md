# Plex Scan — Specification

## Purpose

A lightweight Node.js service that receives webhooks from Radarr and Sonarr on media import events and triggers a Plex partial scan on the affected folder. No polling, no inotify — event-driven via the arr stack.

## Endpoints

| Method | Path              | Description                     |
| ------ | ----------------- | ------------------------------- |
| `POST` | `/webhook/radarr` | Receives Radarr webhook payload |
| `POST` | `/webhook/sonarr` | Receives Sonarr webhook payload |
| `GET`  | `/health`         | Healthcheck for Docker          |

## Events to Listen For

- **Radarr:** `Download` (covers both import and upgrade)
- **Sonarr:** `Download` (covers both import and upgrade)

All other event types should be ignored (return `200 OK`, no action).

## Relevant Payload Fields

**Radarr (`eventType: "Download"`):**

- `movie.folderPath` → the movie folder path (e.g. `/MEDIA/MOVIES/The Fifth Element (1997)`)

**Sonarr (`eventType: "Download"`):**

- `series.path` → the series folder path (e.g. `/MEDIA/TV/Breaking Bad`)

## Plex API Call

```
PUT {PLEX_URL}/library/sections/{sectionId}/refresh?path={encodedFolderPath}&X-Plex-Token={token}
```

- `path` must be URI-encoded
- Path must match how Plex sees it (i.e. `/MEDIA/MOVIES/...` or `/MEDIA/TV/...`)
- If the arr app uses a different mount path than Plex, a path rewrite is needed (see env vars)

## Environment Variables

| Variable            | Required | Default                      | Description                                                |
| ------------------- | -------- | ---------------------------- | ---------------------------------------------------------- |
| `PLEX_URL`          | No       | `http://192.168.1.250:32400` | Plex server address                                        |
| `PLEX_TOKEN`        | Yes      | —                            | Plex authentication token                                  |
| `MOVIES_SECTION_ID` | No       | `1`                          | Plex library section ID for movies                         |
| `TV_SECTION_ID`     | No       | `2`                          | Plex library section ID for TV shows                       |
| `PORT`              | No       | `7890`                       | Port the webhook server listens on                         |
| `PATH_REWRITE_FROM` | No       | —                            | If arr paths differ from Plex paths, the prefix to replace |
| `PATH_REWRITE_TO`   | No       | —                            | The replacement prefix for Plex                            |

## Docker

- Base image: `node:22-alpine`
- Expose: `PORT` (default `7890`)
- Add to existing Portainer compose stack
- Must be on the same Docker network as the arr stack so it can reach Plex at `192.168.1.250:32400`

### Compose snippet

```yaml
plex-scan-webhook:
  build: ./plex-scan-webhook
  container_name: plex-scan-webhook
  restart: unless-stopped
  ports:
    - "7890:7890"
  environment:
    - PLEX_TOKEN=your_plex_token_here
  networks:
    - your_existing_network
```

## Radarr / Sonarr Configuration

1. Settings → Connect → Add → Webhook
2. Name: `Plex Scan`
3. Triggers: **On Import**, **On Upgrade**
4. URL:
   - Radarr: `http://plex-scan-webhook:7890/webhook/radarr`
   - Sonarr: `http://plex-scan-webhook:7890/webhook/sonarr`
5. Method: `POST`

## Optional Enhancements

- **Debounce:** If multiple episodes of the same series import within a short window (e.g. 10 seconds), batch into a single scan
- **Logging:** Timestamp, source (radarr/sonarr), folder path, Plex response status code
- **Auth:** Optional shared secret header between arr apps and the webhook service to prevent unauthorized triggers

## Section ID Discovery

To find your Plex section IDs:

```
curl -s "http://192.168.1.250:32400/library/sections?X-Plex-Token=YOUR_TOKEN"
```

Look for `key="1"` (Movies) and `key="2"` (TV Shows) in the XML response.
