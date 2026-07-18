import pino, { type Logger, type LoggerOptions } from "pino";
import type { AppEnv } from "@genesis-sentinel/config";

const redactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "headers.authorization",
  "headers.cookie",
  "*.DATABASE_URL",
  "*.REDIS_URL",
  "*.ROBINHOOD_RPC_URL",
  "*.TELEGRAM_BOT_TOKEN",
  "*.SENTRY_DSN"
];

export function createLogger(env: Pick<AppEnv, "LOG_LEVEL" | "NODE_ENV">, service: string): Logger {
  const options: LoggerOptions = {
    base: {
      service
    },
    level: env.LOG_LEVEL,
    redact: {
      paths: redactPaths,
      censor: "[redacted]"
    }
  };

  if (env.NODE_ENV === "development") {
    options.transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
        singleLine: true
      }
    };
  }

  return pino(options);
}
