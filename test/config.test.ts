import { describe, it, expect } from "vitest";
import { loadConfig, rewritePath } from "../src/config.js";

const validEnv = {
  PLEX_URL: "http://localhost:32400",
  PLEX_TOKEN: "abc123",
  MOVIES_SECTION_ID: "1",
  TV_SECTION_ID: "2",
  WEBHOOK_SECRET: "secret",
};

function omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key)) as Omit<T, K>;
}

describe("loadConfig", () => {
  it("parses valid env with defaults", () => {
    const config = loadConfig(validEnv);
    expect(config.PLEX_URL).toBe("http://localhost:32400");
    expect(config.PLEX_TOKEN).toBe("abc123");
    expect(config.MOVIES_SECTION_ID).toBe("1");
    expect(config.TV_SECTION_ID).toBe("2");
    expect(config.WEBHOOK_SECRET).toBe("secret");
    expect(config.PORT).toBe(7890);
    expect(config.RADARR_PATH_REWRITE_FROM).toBeUndefined();
    expect(config.RADARR_PATH_REWRITE_TO).toBeUndefined();
    expect(config.SONARR_PATH_REWRITE_FROM).toBeUndefined();
    expect(config.SONARR_PATH_REWRITE_TO).toBeUndefined();
  });

  it("parses custom PORT", () => {
    const config = loadConfig({ ...validEnv, PORT: "3000" });
    expect(config.PORT).toBe(3000);
  });

  it("parses radarr path rewrite pair", () => {
    const config = loadConfig({
      ...validEnv,
      RADARR_PATH_REWRITE_FROM: "/movies",
      RADARR_PATH_REWRITE_TO: "/MEDIA/MOVIES",
    });
    expect(config.RADARR_PATH_REWRITE_FROM).toBe("/movies");
    expect(config.RADARR_PATH_REWRITE_TO).toBe("/MEDIA/MOVIES");
  });

  it("parses sonarr path rewrite pair", () => {
    const config = loadConfig({
      ...validEnv,
      SONARR_PATH_REWRITE_FROM: "/tv",
      SONARR_PATH_REWRITE_TO: "/MEDIA/TV",
    });
    expect(config.SONARR_PATH_REWRITE_FROM).toBe("/tv");
    expect(config.SONARR_PATH_REWRITE_TO).toBe("/MEDIA/TV");
  });

  it("parses both rewrite pairs together", () => {
    const config = loadConfig({
      ...validEnv,
      RADARR_PATH_REWRITE_FROM: "/movies",
      RADARR_PATH_REWRITE_TO: "/MEDIA/MOVIES",
      SONARR_PATH_REWRITE_FROM: "/tv",
      SONARR_PATH_REWRITE_TO: "/MEDIA/TV",
    });
    expect(config.RADARR_PATH_REWRITE_FROM).toBe("/movies");
    expect(config.SONARR_PATH_REWRITE_FROM).toBe("/tv");
  });

  it("throws when PLEX_URL is missing", () => {
    expect(() => loadConfig(omit(validEnv, "PLEX_URL"))).toThrow();
  });

  it("throws when PLEX_TOKEN is missing", () => {
    expect(() => loadConfig(omit(validEnv, "PLEX_TOKEN"))).toThrow();
  });

  it("throws when MOVIES_SECTION_ID is missing", () => {
    expect(() => loadConfig(omit(validEnv, "MOVIES_SECTION_ID"))).toThrow();
  });

  it("throws when TV_SECTION_ID is missing", () => {
    expect(() => loadConfig(omit(validEnv, "TV_SECTION_ID"))).toThrow();
  });

  it("throws when WEBHOOK_SECRET is missing", () => {
    expect(() => loadConfig(omit(validEnv, "WEBHOOK_SECRET"))).toThrow();
  });

  it("throws when PLEX_URL is not a valid URL", () => {
    expect(() => loadConfig({ ...validEnv, PLEX_URL: "not-a-url" })).toThrow();
  });

  it("throws when only RADARR_PATH_REWRITE_FROM is set", () => {
    expect(() => loadConfig({ ...validEnv, RADARR_PATH_REWRITE_FROM: "/movies" })).toThrow();
  });

  it("throws when only RADARR_PATH_REWRITE_TO is set", () => {
    expect(() => loadConfig({ ...validEnv, RADARR_PATH_REWRITE_TO: "/MEDIA/MOVIES" })).toThrow();
  });

  it("throws when only SONARR_PATH_REWRITE_FROM is set", () => {
    expect(() => loadConfig({ ...validEnv, SONARR_PATH_REWRITE_FROM: "/tv" })).toThrow();
  });

  it("throws when only SONARR_PATH_REWRITE_TO is set", () => {
    expect(() => loadConfig({ ...validEnv, SONARR_PATH_REWRITE_TO: "/MEDIA/TV" })).toThrow();
  });

  it("throws when PORT is not a valid number", () => {
    expect(() => loadConfig({ ...validEnv, PORT: "abc" })).toThrow();
  });
});

describe("rewritePath", () => {
  it("returns path unchanged when no rewrite configured", () => {
    expect(rewritePath(undefined, undefined, "/movies/The Matrix")).toBe("/movies/The Matrix");
  });

  it("rewrites path when rewrite is configured", () => {
    expect(rewritePath("/movies", "/MEDIA/MOVIES", "/movies/The Matrix (1999)")).toBe(
      "/MEDIA/MOVIES/The Matrix (1999)",
    );
  });

  it("only rewrites matching prefix", () => {
    expect(rewritePath("/data", "/media", "/data/data/movies")).toBe("/media/data/movies");
  });

  it("does not rewrite if prefix appears mid-path", () => {
    expect(rewritePath("/media", "/MEDIA", "/some/media/movies")).toBe("/some/media/movies");
  });
});
