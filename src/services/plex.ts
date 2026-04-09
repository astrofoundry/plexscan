import type { Logger } from "../logger.js";

export class PlexClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly logger: Logger;

  constructor(baseUrl: string, token: string, logger: Logger) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.logger = logger;
  }

  async scan(sectionId: string, folderPath: string): Promise<void> {
    const url = `${this.baseUrl}/library/sections/${sectionId}/refresh?path=${encodeURIComponent(folderPath)}&X-Plex-Token=${this.token}`;

    const response = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      this.logger.info(
        { sectionId, path: folderPath, status: response.status },
        "plex scan triggered",
      );
    } else {
      this.logger.error(
        { sectionId, path: folderPath, status: response.status },
        "plex scan failed",
      );
    }
  }
}
