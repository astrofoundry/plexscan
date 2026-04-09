import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlexClient } from "../../src/services/plex.js";
import type { Logger } from "../../src/logger.js";

const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
};

describe("PlexClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("calls Plex API with correct URL", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

    const client = new PlexClient("http://localhost:32400", "mytoken", mockLogger);
    await client.scan("1", "/MEDIA/MOVIES/The Matrix (1999)");

    expect(mockFetch).toHaveBeenCalledOnce();
    const call = mockFetch.mock.calls[0];
    expect(call).toBeDefined();
    const [url, options] = call as [string, RequestInit];
    expect(url).toBe(
      "http://localhost:32400/library/sections/1/refresh?path=%2FMEDIA%2FMOVIES%2FThe%20Matrix%20(1999)&X-Plex-Token=mytoken",
    );
    expect(options.method).toBe("PUT");
  });

  it("URI-encodes the folder path", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

    const client = new PlexClient("http://localhost:32400", "token", mockLogger);
    await client.scan("2", "/TV/Breaking Bad/Season 1");

    const call = mockFetch.mock.calls[0];
    expect(call).toBeDefined();
    const [url] = call as [string, RequestInit];
    expect(url).toContain("path=%2FTV%2FBreaking%20Bad%2FSeason%201");
  });

  it("logs the scan result", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

    const client = new PlexClient("http://localhost:32400", "token", mockLogger);
    await client.scan("1", "/movies/Foo");

    expect(mockLogger.info).toHaveBeenCalledWith(
      { sectionId: "1", path: "/movies/Foo", status: 200 },
      "plex scan triggered",
    );
  });

  it("logs error on non-200 response", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(null, { status: 401 }));

    const client = new PlexClient("http://localhost:32400", "token", mockLogger);
    await client.scan("1", "/movies/Foo");

    expect(mockLogger.error).toHaveBeenCalledWith(
      { sectionId: "1", path: "/movies/Foo", status: 401 },
      "plex scan failed",
    );
  });

  it("throws on network error", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValue(new TypeError("fetch failed"));

    const client = new PlexClient("http://localhost:32400", "token", mockLogger);
    await expect(client.scan("1", "/movies/Foo")).rejects.toThrow("fetch failed");
  });

  it("uses a 5-second timeout signal", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

    const client = new PlexClient("http://localhost:32400", "token", mockLogger);
    await client.scan("1", "/movies/Foo");

    const call = mockFetch.mock.calls[0];
    expect(call).toBeDefined();
    const [, options] = call as [string, RequestInit];
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
});
