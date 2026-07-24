import {
  createRobinhoodChainAdapter,
  createArcChainAdapter,
  createStableChainAdapter
} from "@genesis-sentinel/chain-adapters";
import { loadEnv } from "@genesis-sentinel/config";
import {
  checkPostgres,
  createPrismaClient,
  createScanRepository
} from "@genesis-sentinel/database";
import { createLogger } from "@genesis-sentinel/observability";
import { checkRedis, createScanWorker } from "@genesis-sentinel/queue";
import { scannerVersion } from "@genesis-sentinel/shared";
import { createGanacheForkTradeSimulator } from "./fork-simulator.js";
import { processScanJob } from "./scan-worker.js";

const env = loadEnv();
const logger = createLogger(env, "worker");

logger.info({ scannerVersion }, "worker foundation starting");

const dependencies = await Promise.all([
  checkPostgres(env.DATABASE_URL),
  checkRedis(env.REDIS_URL)
]);
const ready = dependencies.every((dependency) => dependency.status === "ok");

if (!ready) {
  logger.warn({ dependencies }, "worker dependencies are not ready");
} else {
  logger.info({ dependencies }, "worker dependencies are ready");
}

const prisma = createPrismaClient(env.DATABASE_URL);
const scans = createScanRepository(prisma);
const forkTradeSimulator = createGanacheForkTradeSimulator(env);
const worker = createScanWorker(
  env.REDIS_URL,
  async (job) => {
    const processorDependencies = {
      scans,
      ...(forkTradeSimulator ? { forkTradeSimulator } : {}),
      getChainAdapter(chainId: number) {
        const allowPublicDefault = env.NODE_ENV !== "production";
        switch (chainId) {
          case 4663:
            return createRobinhoodChainAdapter(env, { allowPublicDefault });
          case 5042:
            return createArcChainAdapter(env, { allowPublicDefault });
          case 988:
            return createStableChainAdapter(env, { allowPublicDefault });
          default:
            throw new Error(`Unsupported chain ID ${chainId}.`);
        }
      }
    };

    await processScanJob(job, {
      ...processorDependencies
    });
  },
  {
    concurrency: env.WORKER_CONCURRENCY
  }
);

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "scan job completed");
});

worker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, error }, "scan job failed");
});

const shutdown = async () => {
  logger.info("worker shutting down");
  await worker.close();
  await prisma.$disconnect();
};

process.once("SIGINT", () => {
  void shutdown().then(() => process.exit(0));
});
process.once("SIGTERM", () => {
  void shutdown().then(() => process.exit(0));
});

logger.info("scan worker is listening for queued scans");
