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

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const app = buildApp(config);

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("does not require auth", async () => {
    const app = buildApp(config);

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
  });
});
