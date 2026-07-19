import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import { z } from "zod";
import type { AppEnv } from "@genesis-sentinel/config";
import {
  checkPostgres,
  createPrismaClient,
  createScanRepository,
  createTelegramTrackingRepository,
  type ScanRepository
} from "@genesis-sentinel/database";
import type { Logger } from "pino";
import { checkRedis, createScanQueue, type ScanQueue } from "@genesis-sentinel/queue";
import {
  createHealth,
  normalizeEvmAddress,
  scannerVersion,
  type ServiceReadiness
} from "@genesis-sentinel/shared";
import { submitScanRequest } from "./scan-service.js";
import {
  createTelegramBot,
  createTelegramScanLimiter,
  type TelegramListTrackedAddresses,
  type TelegramTrackAddress,
  type TelegramUntrackAddress
} from "./telegram.js";

const evmAddressSchema = z.custom<`0x${string}`>(
  (value) => typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value),
  "Expected a checksummed or lowercase EVM address"
);

const createScanSchema = z.object({
  chainId: z.literal(4663),
  address: evmAddressSchema
});

const tokenParamsSchema = z.object({
  chainId: z.coerce.number().pipe(z.literal(4663)),
  address: evmAddressSchema
});

const recentScansQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export interface AppOptions {
  env: AppEnv;
  logger: Logger;
  scanRepository?: ScanRepository;
  scanQueue?: ScanQueue;
}

export async function buildApp({ env, logger, scanRepository, scanQueue }: AppOptions) {
  const prisma = scanRepository ? undefined : createPrismaClient(env.DATABASE_URL);
  const scans = scanRepository ?? createScanRepository(prisma!);
  const telegramTracking = prisma ? createTelegramTrackingRepository(prisma) : null;
  const queue = scanQueue ?? createScanQueue(env.REDIS_URL);
  const app = Fastify({
    loggerInstance: logger,
    bodyLimit: 16 * 1024,
    routerOptions: {
      maxParamLength: 256
    },
    trustProxy: true
  });

  const corsOrigin =
    env.API_CORS_ORIGIN === "*"
      ? true
      : env.API_CORS_ORIGIN.split(",")
          .map((origin) => origin.trim())
          .filter((origin) => origin.length > 0);

  await app.register(cors, {
    origin: corsOrigin,
    methods: ["GET", "POST"]
  });

  await app.register(rateLimit, {
    max: env.API_RATE_LIMIT_MAX,
    timeWindow: env.API_RATE_LIMIT_TIME_WINDOW
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Genesis Sentinel API",
        version: scannerVersion
      }
    }
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs"
  });

  const submitScan = async (input: {
    chainId: 4663;
    address: `0x${string}`;
    idempotencyKey: string;
    requestedBy?: string;
  }) => {
    const result = await submitScanRequest(input, { scans, queue });
    return result.scan;
  };

  const telegramBot = env.TELEGRAM_BOT_TOKEN
    ? createTelegramBot({
        token: env.TELEGRAM_BOT_TOKEN,
        submitScan,
        getScan: (scanId) => scans.getScan(scanId),
        getScanResult: (scanId) => scans.getScanResult(scanId),
        ...(telegramTracking
          ? {
              trackAddress: ((input) => telegramTracking.trackAddress(input)) satisfies TelegramTrackAddress,
              untrackAddress: ((input) =>
                telegramTracking.untrackAddress(input)) satisfies TelegramUntrackAddress,
              listTrackedAddresses: ((chat) =>
                telegramTracking.listTrackedAddresses(chat)) satisfies TelegramListTrackedAddresses
            }
          : {}),
        scanLimiter: createTelegramScanLimiter({
          cooldownMs: env.TELEGRAM_SCAN_COOLDOWN_SECONDS * 1_000,
          burstLimit: env.TELEGRAM_SCAN_BURST_LIMIT,
          burstWindowMs: env.TELEGRAM_SCAN_BURST_WINDOW_SECONDS * 1_000
        })
      })
    : null;
  let telegramBotInit: Promise<void> | null = null;

  const ensureTelegramBotInitialized = async () => {
    if (!telegramBot) {
      return;
    }

    telegramBotInit ??= telegramBot.init();
    await telegramBotInit;
  };

  app.get("/health", () => createHealth("api"));

  app.get("/ready", async (_request, reply) => {
    const dependencies = await Promise.all([
      checkPostgres(env.DATABASE_URL),
      checkRedis(env.REDIS_URL)
    ]);
    const ready = dependencies.every((dependency) => dependency.status === "ok");
    const response: ServiceReadiness = {
      status: ready ? "ready" : "not_ready",
      service: "api",
      version: scannerVersion,
      time: new Date().toISOString(),
      dependencies
    };

    return reply.code(ready ? 200 : 503).send(response);
  });

  app.post("/v1/scans", async (request, reply) => {
    const parsed = createScanSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_scan_request",
        message: "Provide Robinhood Chain ID 4663 and a valid EVM contract address."
      });
    }

    const result = await submitScanRequest(
      {
        chainId: parsed.data.chainId,
        address: normalizeEvmAddress(parsed.data.address),
        idempotencyKey:
          request.headers["idempotency-key"]?.toString() ??
          `${parsed.data.chainId}:${parsed.data.address.toLowerCase()}`
      },
      { scans, queue }
    );

    return reply.code(result.created ? 202 : 200).send(result.scan);
  });

  app.get("/v1/scans/recent", async (request) => {
    const parsed = recentScansQuerySchema.safeParse(request.query);
    const limit = parsed.success ? parsed.data.limit : 20;
    return { scans: await scans.getRecentScans(limit) };
  });

  app.get("/v1/scans/:scanId", async (request, reply) => {
    const scanId = (request.params as { scanId?: string }).scanId;
    const scan = scanId ? await scans.getScan(scanId) : undefined;

    if (!scan) {
      return reply.code(404).send({
        error: "scan_not_found",
        message: "No scan exists for that foundation scan ID."
      });
    }

    return scan;
  });

  app.get("/v1/scans/:scanId/result", async (request, reply) => {
    const scanId = (request.params as { scanId?: string }).scanId;
    const scan = scanId ? await scans.getScanResult(scanId) : undefined;

    if (!scan) {
      return reply.code(404).send({
        error: "scan_not_found",
        message: "No scan result exists for that scan ID."
      });
    }

    return scan;
  });

  app.get("/v1/tokens/:chainId/:address", async (request, reply) => {
    const parsed = tokenParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_token_request",
        message: "Provide Robinhood Chain ID 4663 and a valid EVM contract address."
      });
    }

    const result = await scans.getLatestScanResult(parsed.data.chainId, parsed.data.address);
    if (!result) {
      return reply.code(404).send({
        error: "scan_not_found",
        message: "No scan has been run for this token yet."
      });
    }

    return result;
  });

  app.get("/v1/tokens/:chainId/:address/findings", async (request, reply) => {
    const parsed = tokenParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_token_request",
        message: "Provide Robinhood Chain ID 4663 and a valid EVM contract address."
      });
    }

    return {
      chainId: parsed.data.chainId,
      address: normalizeEvmAddress(parsed.data.address),
      findings: await scans.getTokenFindings(parsed.data.chainId, parsed.data.address)
    };
  });

  app.get("/v1/risk/:chainId/:address", async (request, reply) => {
    const parsed = tokenParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_risk_request",
        message: "Provide Robinhood Chain ID 4663 and a valid EVM contract address."
      });
    }

    const risk = await scans.getRiskSnapshot(parsed.data.chainId, parsed.data.address);
    if (!risk) {
      return reply.code(404).send({
        error: "risk_not_found",
        message: "No scan exists for that token address yet."
      });
    }

    return risk;
  });

  app.post("/telegram/webhook", async (request, reply) => {
    if (!telegramBot) {
      return reply.code(404).send({
        error: "telegram_not_configured",
        message: "Telegram bot token is not configured for this API instance."
      });
    }

    if (env.TELEGRAM_WEBHOOK_SECRET) {
      const providedSecret = request.headers["x-telegram-bot-api-secret-token"];
      if (providedSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
        return reply.code(401).send({
          error: "telegram_webhook_unauthorized",
          message: "Telegram webhook secret token is invalid."
        });
      }
    }

    await ensureTelegramBotInitialized();
    await telegramBot.handleUpdate(request.body as Parameters<typeof telegramBot.handleUpdate>[0]);
    return { ok: true };
  });

  app.addHook("onClose", async () => {
    await queue.close();
    await prisma?.$disconnect();
  });

  return app;
}
