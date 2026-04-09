import { z } from "zod";

const rewritePair = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .refine((data) => (data.from !== undefined) === (data.to !== undefined), {
    message: "PATH_REWRITE_FROM and PATH_REWRITE_TO must both be set or both be unset",
  });

const configSchema = z
  .object({
    PLEX_URL: z.url({ protocol: /^https?$/ }),
    PLEX_TOKEN: z.string().min(1),
    MOVIES_SECTION_ID: z.string().min(1),
    TV_SECTION_ID: z.string().min(1),
    WEBHOOK_SECRET: z.string().min(1),
    PORT: z.coerce.number().int().positive().default(7890),
    RADARR_PATH_REWRITE_FROM: z.string().optional(),
    RADARR_PATH_REWRITE_TO: z.string().optional(),
    SONARR_PATH_REWRITE_FROM: z.string().optional(),
    SONARR_PATH_REWRITE_TO: z.string().optional(),
  })
  .refine(
    (data) =>
      rewritePair.safeParse({
        from: data.RADARR_PATH_REWRITE_FROM,
        to: data.RADARR_PATH_REWRITE_TO,
      }).success,
    {
      message:
        "RADARR_PATH_REWRITE_FROM and RADARR_PATH_REWRITE_TO must both be set or both be unset",
    },
  )
  .refine(
    (data) =>
      rewritePair.safeParse({
        from: data.SONARR_PATH_REWRITE_FROM,
        to: data.SONARR_PATH_REWRITE_TO,
      }).success,
    {
      message:
        "SONARR_PATH_REWRITE_FROM and SONARR_PATH_REWRITE_TO must both be set or both be unset",
    },
  );

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env: Record<string, string | undefined>): Config {
  return configSchema.parse(env);
}

export function rewritePath(
  from: string | undefined,
  to: string | undefined,
  arrPath: string,
): string {
  if (from && to) {
    return arrPath.replace(from, to);
  }
  return arrPath;
}
