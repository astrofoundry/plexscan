import { z } from "zod";

export const baseWebhookSchema = z.object({
  eventType: z.string(),
});

export const radarrDownloadSchema = z.object({
  eventType: z.literal("Download"),
  movie: z.object({
    folderPath: z.string().min(1),
  }),
});

export const sonarrDownloadSchema = z.object({
  eventType: z.literal("Download"),
  series: z.object({
    path: z.string().min(1),
  }),
});
