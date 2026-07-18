import { loadEnv } from "@genesis-sentinel/config";
import { createLogger } from "@genesis-sentinel/observability";
import { buildApp } from "./app.js";

const env = loadEnv();
const logger = createLogger(env, "api");
const app = await buildApp({ env, logger });

try {
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
} catch (error) {
  logger.error({ error }, "api failed to start");
  process.exit(1);
}
