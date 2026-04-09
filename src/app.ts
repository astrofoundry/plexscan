import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { rewritePath, type Config } from "./config.js";
import type { Logger } from "./logger.js";
import { PlexClient } from "./services/plex.js";
import { ScanDebouncer } from "./services/debounce.js";
import {
  baseWebhookSchema,
  radarrDownloadSchema,
  sonarrDownloadSchema,
} from "./schemas/webhook.js";

const MAX_BODY_SIZE = 64 * 1024;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error("payload too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
}

function verifySecret(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function buildApp(config: Config, logger: Logger): Server {
  const plexClient = new PlexClient(config.PLEX_URL, config.PLEX_TOKEN, logger);

  const debouncer = new ScanDebouncer(5000, async (path, sectionId) => {
    try {
      await plexClient.scan(sectionId, path);
    } catch (err) {
      logger.error({ err: String(err), path, sectionId }, "plex scan failed");
    }
  });

  const server = createServer(async (req, res) => {
    try {
      const method = req.method;
      const url = req.url;

      if (method === "GET" && url === "/health") {
        return json(res, 200, { status: "ok" });
      }

      if (method === "POST" && (url === "/webhook/radarr" || url === "/webhook/sonarr")) {
        const secret = Array.isArray(req.headers["x-webhook-secret"])
          ? req.headers["x-webhook-secret"][0]
          : req.headers["x-webhook-secret"];
        const source = url === "/webhook/radarr" ? "radarr" : "sonarr";

        if (!verifySecret(secret, config.WEBHOOK_SECRET)) {
          logger.error({ source }, "unauthorized webhook attempt");
          return json(res, 401, { error: "unauthorized" });
        }

        let body: unknown;
        try {
          body = JSON.parse(await readBody(req));
        } catch {
          return json(res, 400, { error: "invalid json" });
        }

        const base = baseWebhookSchema.safeParse(body);
        if (!base.success) {
          return json(res, 400, { error: "invalid payload" });
        }

        if (base.data.eventType !== "Download") {
          logger.info({ source, eventType: base.data.eventType }, "event ignored");
          return json(res, 200, { status: "ignored", eventType: base.data.eventType });
        }

        if (url === "/webhook/radarr") {
          const result = radarrDownloadSchema.safeParse(body);
          if (!result.success) {
            return json(res, 400, { error: "invalid payload" });
          }
          const path = rewritePath(
            config.RADARR_PATH_REWRITE_FROM,
            config.RADARR_PATH_REWRITE_TO,
            result.data.movie.folderPath,
          );
          debouncer.schedule(path, config.MOVIES_SECTION_ID);
          logger.info({ source, path, sectionId: config.MOVIES_SECTION_ID }, "scan scheduled");
          return json(res, 200, { status: "accepted", path });
        }

        const result = sonarrDownloadSchema.safeParse(body);
        if (!result.success) {
          return json(res, 400, { error: "invalid payload" });
        }
        const path = rewritePath(
          config.SONARR_PATH_REWRITE_FROM,
          config.SONARR_PATH_REWRITE_TO,
          result.data.series.path,
        );
        debouncer.schedule(path, config.TV_SECTION_ID);
        logger.info({ source, path, sectionId: config.TV_SECTION_ID }, "scan scheduled");
        return json(res, 200, { status: "accepted", path });
      }

      json(res, 404, { error: "not found" });
    } catch (err) {
      logger.error({ err: String(err) }, "unhandled error");
      json(res, 500, { error: "internal server error" });
    }
  });

  server.on("close", () => debouncer.clear());

  return server;
}
