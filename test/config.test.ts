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
    expect(config.PATH_REWRITE_FROM).toBeUndefined();
    expect(config.PATH_REWRITE_TO).toBeUndefined();
  });

  it("parses custom PORT", () => {
    const config = loadConfig({ ...validEnv, PORT: "3000" });
    expect(config.PORT).toBe(3000);
  });

  it("parses path rewrite pair", () => {
    const config = loadConfig({
      ...validEnv,
      PATH_REWRITE_FROM: "/data",
      PATH_REWRITE_TO: "/MEDIA",
    });
    expect(config.PATH_REWRITE_FROM).toBe("/data");
    expect(config.PATH_REWRITE_TO).toBe("/MEDIA");
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

  it("throws when only PATH_REWRITE_FROM is set", () => {
    expect(() => loadConfig({ ...validEnv, PATH_REWRITE_FROM: "/data" })).toThrow();
  });

  it("throws when only PATH_REWRITE_TO is set", () => {
    expect(() => loadConfig({ ...validEnv, PATH_REWRITE_TO: "/MEDIA" })).toThrow();
  });

  it("throws when PORT is not a valid number", () => {
    expect(() => loadConfig({ ...validEnv, PORT: "abc" })).toThrow();
  });
});

describe("rewritePath", () => {
  it("returns path unchanged when no rewrite configured", () => {
    const config = loadConfig(validEnv);
    expect(rewritePath(config, "/movies/The Matrix")).toBe("/movies/The Matrix");
  });

  it("rewrites path when rewrite is configured", () => {
    const config = loadConfig({
      ...validEnv,
      PATH_REWRITE_FROM: "/data/movies",
      PATH_REWRITE_TO: "/MEDIA/MOVIES",
    });
    expect(rewritePath(config, "/data/movies/The Matrix (1999)")).toBe(
      "/MEDIA/MOVIES/The Matrix (1999)",
    );
  });

  it("only rewrites first occurrence", () => {
    const config = loadConfig({
      ...validEnv,
      PATH_REWRITE_FROM: "/data",
      PATH_REWRITE_TO: "/media",
    });
    expect(rewritePath(config, "/data/data/movies")).toBe("/media/data/movies");
  });
});
