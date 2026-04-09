import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";
import { loadConfig } from "../../src/config.js";

const config = loadConfig({
  PLEX_URL: "http://localhost:32400",
  PLEX_TOKEN: "test-token",
  MOVIES_SECTION_ID: "1",
  TV_SECTION_ID: "2",
  WEBHOOK_SECRET: "test-secret",
});

const headers = { "x-webhook-secret": "test-secret" };

describe("webhook routes", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  });

  describe("POST /webhook/radarr", () => {
    it("accepts Download event and returns accepted", async () => {
      const app = buildApp(config);

      const response = await app.inject({
        method: "POST",
        url: "/webhook/radarr",
        headers,
        payload: {
          eventType: "Download",
          movie: { folderPath: "/movies/The Matrix (1999)" },
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        status: "accepted",
        path: "/movies/The Matrix (1999)",
      });
    });

    it("ignores non-Download events", async () => {
      const app = buildApp(config);

      const response = await app.inject({
        method: "POST",
        url: "/webhook/radarr",
        headers,
        payload: { eventType: "Test" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: "ignored", eventType: "Test" });
    });

    it("returns 400 when Download event lacks movie.folderPath", async () => {
      const app = buildApp(config);

      const response = await app.inject({
        method: "POST",
        url: "/webhook/radarr",
        headers,
        payload: { eventType: "Download" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /webhook/sonarr", () => {
    it("accepts Download event and returns accepted", async () => {
      const app = buildApp(config);

      const response = await app.inject({
        method: "POST",
        url: "/webhook/sonarr",
        headers,
        payload: {
          eventType: "Download",
          series: { path: "/tv/Breaking Bad" },
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        status: "accepted",
        path: "/tv/Breaking Bad",
      });
    });

    it("ignores non-Download events", async () => {
      const app = buildApp(config);

      const response = await app.inject({
        method: "POST",
        url: "/webhook/sonarr",
        headers,
        payload: { eventType: "Grab" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: "ignored", eventType: "Grab" });
    });

    it("returns 400 when Download event lacks series.path", async () => {
      const app = buildApp(config);

      const response = await app.inject({
        method: "POST",
        url: "/webhook/sonarr",
        headers,
        payload: { eventType: "Download" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("path rewriting", () => {
    it("rewrites radarr paths when configured", async () => {
      const rewriteConfig = loadConfig({
        PLEX_URL: "http://localhost:32400",
        PLEX_TOKEN: "test-token",
        MOVIES_SECTION_ID: "1",
        TV_SECTION_ID: "2",
        WEBHOOK_SECRET: "test-secret",
        RADARR_PATH_REWRITE_FROM: "/movies",
        RADARR_PATH_REWRITE_TO: "/MEDIA/MOVIES",
      });

      const app = buildApp(rewriteConfig);

      const response = await app.inject({
        method: "POST",
        url: "/webhook/radarr",
        headers,
        payload: {
          eventType: "Download",
          movie: { folderPath: "/movies/Foo" },
        },
      });

      expect(response.json()).toEqual({
        status: "accepted",
        path: "/MEDIA/MOVIES/Foo",
      });
    });

    it("rewrites sonarr paths when configured", async () => {
      const rewriteConfig = loadConfig({
        PLEX_URL: "http://localhost:32400",
        PLEX_TOKEN: "test-token",
        MOVIES_SECTION_ID: "1",
        TV_SECTION_ID: "2",
        WEBHOOK_SECRET: "test-secret",
        SONARR_PATH_REWRITE_FROM: "/tv",
        SONARR_PATH_REWRITE_TO: "/MEDIA/TV",
      });

      const app = buildApp(rewriteConfig);

      const response = await app.inject({
        method: "POST",
        url: "/webhook/sonarr",
        headers,
        payload: {
          eventType: "Download",
          series: { path: "/tv/Breaking Bad" },
        },
      });

      expect(response.json()).toEqual({
        status: "accepted",
        path: "/MEDIA/TV/Breaking Bad",
      });
    });
  });
});
