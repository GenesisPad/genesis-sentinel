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
  "*.DWELLIR_API_KEY",
  "*.TELEGRAM_BOT_TOKEN",
  "*.SENTRY_DSN"
];

const dwellirApiKeyPattern = /(https:\/\/api-[^/\s]+\.dwellir\.com\/)[^/?#\s"']+/giu;

/** RPC libraries include request URLs inside nested error messages. Pino path redaction cannot
 * reach credentials embedded in strings, so scrub Dwellir URL-path keys recursively first. */
export function redactRpcCredentials(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(dwellirApiKeyPattern, "$1[redacted]");
  }
  if (Array.isArray(value)) {
    return value.map(redactRpcCredentials);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, redactRpcCredentials(nestedValue)])
    );
  }
  return value;
}

function serializeError(error: unknown): unknown {
  return redactRpcCredentials(error instanceof Error ? pino.stdSerializers.err(error) : error);
}

export function createLogger(env: Pick<AppEnv, "LOG_LEVEL" | "NODE_ENV">, service: string): Logger {
  const options: LoggerOptions = {
    base: {
      service
    },
    level: env.LOG_LEVEL,
    redact: {
      paths: redactPaths,
      censor: "[redacted]"
    },
    serializers: {
      err: serializeError,
      error: serializeError
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
