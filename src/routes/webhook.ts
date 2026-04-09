import type { FastifyInstance } from "fastify";
import { rewritePath, type Config } from "../config.js";
import type { ScanDebouncer } from "../services/debounce.js";
import { authHook } from "../hooks/auth.js";
import {
  baseWebhookSchema,
  radarrDownloadSchema,
  sonarrDownloadSchema,
} from "../schemas/webhook.js";

export function webhookRoutes(
  app: FastifyInstance,
  config: Config,
  debouncer: ScanDebouncer,
): void {
  app.addHook("onRequest", authHook(config.WEBHOOK_SECRET));

  app.post("/webhook/radarr", async (request, reply) => {
    const base = baseWebhookSchema.parse(request.body);

    if (base.eventType !== "Download") {
      return reply.send({ status: "ignored", eventType: base.eventType });
    }

    const result = radarrDownloadSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: "invalid payload", issues: result.error.issues });
    }

    const path = rewritePath(
      config.RADARR_PATH_REWRITE_FROM,
      config.RADARR_PATH_REWRITE_TO,
      result.data.movie.folderPath,
    );
    debouncer.schedule(path, config.MOVIES_SECTION_ID);

    return reply.send({ status: "accepted", path });
  });

  app.post("/webhook/sonarr", async (request, reply) => {
    const base = baseWebhookSchema.parse(request.body);

    if (base.eventType !== "Download") {
      return reply.send({ status: "ignored", eventType: base.eventType });
    }

    const result = sonarrDownloadSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: "invalid payload", issues: result.error.issues });
    }

    const path = rewritePath(
      config.SONARR_PATH_REWRITE_FROM,
      config.SONARR_PATH_REWRITE_TO,
      result.data.series.path,
    );
    debouncer.schedule(path, config.TV_SECTION_ID);

    return reply.send({ status: "accepted", path });
  });
}
