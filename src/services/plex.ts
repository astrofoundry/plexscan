import type { FastifyBaseLogger } from "fastify";

export class PlexClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly logger: FastifyBaseLogger;

  constructor(baseUrl: string, token: string, logger: FastifyBaseLogger) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.logger = logger;
  }

  async scan(sectionId: string, folderPath: string): Promise<void> {
    const url = `${this.baseUrl}/library/sections/${sectionId}/refresh?path=${encodeURIComponent(folderPath)}&X-Plex-Token=${this.token}`;

    const response = await fetch(url, {
      method: "PUT",
      signal: AbortSignal.timeout(5000),
    });

    this.logger.info(
      { sectionId, path: folderPath, status: response.status },
      "plex scan triggered",
    );
  }
}
