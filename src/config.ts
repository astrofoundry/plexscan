import { z } from "zod";

const configSchema = z
  .object({
    PLEX_URL: z.url({ protocol: /^https?$/ }),
    PLEX_TOKEN: z.string().min(1),
    MOVIES_SECTION_ID: z.string().min(1),
    TV_SECTION_ID: z.string().min(1),
    WEBHOOK_SECRET: z.string().min(1),
    PORT: z.coerce.number().int().positive().default(7890),
    PATH_REWRITE_FROM: z.string().optional(),
    PATH_REWRITE_TO: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasFrom = data.PATH_REWRITE_FROM !== undefined;
      const hasTo = data.PATH_REWRITE_TO !== undefined;
      return hasFrom === hasTo;
    },
    { message: "PATH_REWRITE_FROM and PATH_REWRITE_TO must both be set or both be unset" },
  );

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env: Record<string, string | undefined>): Config {
  return configSchema.parse(env);
}

export function rewritePath(config: Config, arrPath: string): string {
  if (config.PATH_REWRITE_FROM && config.PATH_REWRITE_TO) {
    return arrPath.replace(config.PATH_REWRITE_FROM, config.PATH_REWRITE_TO);
  }
  return arrPath;
}
