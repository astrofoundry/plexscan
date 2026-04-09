import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { buildApp } from "./app.js";

const config = loadConfig(process.env);
const logger = createLogger();
const server = buildApp(config, logger);

server.listen(config.PORT, "0.0.0.0", () => {
  logger.info({ port: config.PORT }, "plexscan started");
});
