import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { Logger } from "../src/logger.js";
import type { Server } from "node:http";

const config = loadConfig({
  PLEX_URL: "http://localhost:32400",
  PLEX_TOKEN: "test-token",
  MOVIES_SECTION_ID: "1",
  TV_SECTION_ID: "2",
  WEBHOOK_SECRET: "test-secret",
});

const silentLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
};

const jsonHeader = { "content-type": "application/json" };

async function request(
  server: Server,
  method: string,
  path: string,
  body?: unknown,
  reqHeaders?: Record<string, string>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server not listening");

  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

function listen(server: Server): Promise<void> {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}

describe("app", () => {
  let server: Server;

  beforeEach(async () => {
    server = buildApp(config, silentLogger);
    await listen(server);
  });

  afterEach(async () => {
    await close(server);
  });

  describe("GET /health", () => {
    it("returns 200 with status ok", async () => {
      const res = await request(server, "GET", "/health");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
    });

    it("does not require auth", async () => {
      const res = await request(server, "GET", "/health");
      expect(res.status).toBe(200);
    });
  });

  describe("auth", () => {
    it("returns 401 when secret is missing", async () => {
      const res = await request(
        server,
        "POST",
        "/webhook/radarr",
        { eventType: "Test" },
        jsonHeader,
      );
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "unauthorized" });
    });

    it("returns 401 when secret is wrong", async () => {
      const res = await request(
        server,
        "POST",
        "/webhook/radarr?secret=wrong",
        { eventType: "Test" },
        jsonHeader,
      );
      expect(res.status).toBe(401);
    });
  });

  describe("malformed body", () => {
    it("returns 400 on invalid JSON", async () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("server not listening");

      const response = await fetch(
        `http://127.0.0.1:${address.port}/webhook/radarr?secret=test-secret`,
        {
          method: "POST",
          headers: jsonHeader,
          body: "not json{{{",
        },
      );

      expect(response.status).toBe(400);
      const data = (await response.json()) as Record<string, unknown>;
      expect(data).toEqual({ error: "invalid json" });
    });
  });

  describe("POST /webhook/radarr", () => {
    it("accepts Download event", async () => {
      const res = await request(
        server,
        "POST",
        "/webhook/radarr?secret=test-secret",
        { eventType: "Download", movie: { folderPath: "/movies/The Matrix (1999)" } },
        jsonHeader,
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "accepted", path: "/movies/The Matrix (1999)" });
    });

    it("ignores non-Download events", async () => {
      const res = await request(
        server,
        "POST",
        "/webhook/radarr?secret=test-secret",
        { eventType: "Test" },
        jsonHeader,
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ignored", eventType: "Test" });
    });

    it("returns 400 when Download lacks movie.folderPath", async () => {
      const res = await request(
        server,
        "POST",
        "/webhook/radarr?secret=test-secret",
        { eventType: "Download" },
        jsonHeader,
      );

      expect(res.status).toBe(400);
    });
  });

  describe("POST /webhook/sonarr", () => {
    it("accepts Download event", async () => {
      const res = await request(
        server,
        "POST",
        "/webhook/sonarr?secret=test-secret",
        { eventType: "Download", series: { path: "/tv/Breaking Bad" } },
        jsonHeader,
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "accepted", path: "/tv/Breaking Bad" });
    });

    it("ignores non-Download events", async () => {
      const res = await request(
        server,
        "POST",
        "/webhook/sonarr?secret=test-secret",
        { eventType: "Grab" },
        jsonHeader,
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ignored", eventType: "Grab" });
    });

    it("returns 400 when Download lacks series.path", async () => {
      const res = await request(
        server,
        "POST",
        "/webhook/sonarr?secret=test-secret",
        { eventType: "Download" },
        jsonHeader,
      );

      expect(res.status).toBe(400);
    });
  });

  describe("path rewriting", () => {
    let rewriteServer: Server;

    beforeEach(async () => {
      const rewriteConfig = loadConfig({
        PLEX_URL: "http://localhost:32400",
        PLEX_TOKEN: "test-token",
        MOVIES_SECTION_ID: "1",
        TV_SECTION_ID: "2",
        WEBHOOK_SECRET: "test-secret",
        RADARR_PATH_REWRITE_FROM: "/movies",
        RADARR_PATH_REWRITE_TO: "/MEDIA/MOVIES",
        SONARR_PATH_REWRITE_FROM: "/tv",
        SONARR_PATH_REWRITE_TO: "/MEDIA/TV",
      });
      rewriteServer = buildApp(rewriteConfig, silentLogger);
      await listen(rewriteServer);
    });

    afterEach(async () => {
      await close(rewriteServer);
    });

    it("rewrites radarr paths", async () => {
      const res = await request(
        rewriteServer,
        "POST",
        "/webhook/radarr?secret=test-secret",
        { eventType: "Download", movie: { folderPath: "/movies/Foo" } },
        jsonHeader,
      );

      expect(res.body).toEqual({ status: "accepted", path: "/MEDIA/MOVIES/Foo" });
    });

    it("rewrites sonarr paths", async () => {
      const res = await request(
        rewriteServer,
        "POST",
        "/webhook/sonarr?secret=test-secret",
        { eventType: "Download", series: { path: "/tv/Breaking Bad" } },
        jsonHeader,
      );

      expect(res.body).toEqual({ status: "accepted", path: "/MEDIA/TV/Breaking Bad" });
    });
  });

  describe("404", () => {
    it("returns 404 for unknown routes", async () => {
      const res = await request(server, "GET", "/unknown");
      expect(res.status).toBe(404);
    });
  });
});
