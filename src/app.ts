import Fastify, { type FastifyInstance } from "fastify";
import type { Config } from "./config.js";
import { healthRoute } from "./routes/health.js";
import { webhookRoutes } from "./routes/webhook.js";
import { PlexClient } from "./services/plex.js";
import { ScanDebouncer } from "./services/debounce.js";

export function buildApp(config: Config): FastifyInstance {
  const app = Fastify({
    logger: {
      level: "info",
    },
  });

  const plexClient = new PlexClient(config.PLEX_URL, config.PLEX_TOKEN, app.log);

  const debouncer = new ScanDebouncer(5000, async (path, sectionId) => {
    try {
      await plexClient.scan(sectionId, path);
    } catch (err) {
      app.log.error({ err, path, sectionId }, "plex scan failed");
    }
  });

  app.addHook("onClose", () => debouncer.clear());

  healthRoute(app);

  app.register(async (scope) => {
    webhookRoutes(scope, config, debouncer);
  });

  return app;
}
