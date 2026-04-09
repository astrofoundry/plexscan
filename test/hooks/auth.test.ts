import { describe, it, expect } from "vitest";
import { buildApp } from "../../src/app.js";
import { loadConfig } from "../../src/config.js";

const config = loadConfig({
  PLEX_URL: "http://localhost:32400",
  PLEX_TOKEN: "test-token",
  MOVIES_SECTION_ID: "1",
  TV_SECTION_ID: "2",
  WEBHOOK_SECRET: "test-secret",
});

describe("auth hook", () => {
  it("returns 401 when header is missing", async () => {
    const app = buildApp(config);

    const response = await app.inject({
      method: "POST",
      url: "/webhook/radarr",
      payload: { eventType: "Test" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "unauthorized" });
  });

  it("returns 401 when header is wrong", async () => {
    const app = buildApp(config);

    const response = await app.inject({
      method: "POST",
      url: "/webhook/radarr",
      headers: { "x-webhook-secret": "wrong-secret" },
      payload: { eventType: "Test" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "unauthorized" });
  });

  it("allows request with correct header", async () => {
    const app = buildApp(config);

    const response = await app.inject({
      method: "POST",
      url: "/webhook/radarr",
      headers: { "x-webhook-secret": "test-secret" },
      payload: { eventType: "Test" },
    });

    expect(response.statusCode).toBe(200);
  });
});
