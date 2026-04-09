import type { FastifyInstance } from "fastify";

export function healthRoute(app: FastifyInstance): void {
  app.get("/health", async () => ({ status: "ok" }));
}
