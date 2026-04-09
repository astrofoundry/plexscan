import { loadConfig } from "./config.js";
import { buildApp } from "./app.js";

const config = loadConfig(process.env);
const app = buildApp(config);

await app.listen({ port: config.PORT, host: "0.0.0.0" });
