import { Redis } from "ioredis";
import { Queue, Worker, type ConnectionOptions, type JobsOptions, type Processor, type WorkerOptions } from "bullmq";

export interface DependencyCheck {
  name: "redis";
  status: "ok" | "error";
  message?: string;
}

export async function checkRedis(redisUrl: string): Promise<DependencyCheck> {
  const redis = new Redis(redisUrl, {
    commandTimeout: 2000,
    lazyConnect: true,
    maxRetriesPerRequest: 0
  });

  try {
    await redis.connect();
    const response = await redis.ping();
    return response === "PONG"
      ? { name: "redis", status: "ok" }
      : { name: "redis", status: "error", message: "unexpected ping response" };
  } catch (error) {
    return {
      name: "redis",
      status: "error",
      message: error instanceof Error ? error.message : "unknown redis error"
    };
  } finally {
    redis.disconnect();
  }
}

export const scanQueueName = "scan-orchestration";

export interface ScanJobData {
  scanId: string;
  chainId: number;
  address: `0x${string}`;
}

export interface ScanQueue {
  enqueueScan(input: ScanJobData): Promise<{ jobId: string }>;
  close(): Promise<void>;
}

const defaultScanJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5_000
  },
  removeOnComplete: {
    age: 60 * 60,
    count: 1_000
  },
  removeOnFail: false
};

export function createRedisConnection(redisUrl: string): Redis {
  return new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null
  });
}

export function parseRedisConnectionOptions(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  const options: ConnectionOptions = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379
  };

  if (url.password) {
    options.password = decodeURIComponent(url.password);
  }

  if (url.username) {
    options.username = decodeURIComponent(url.username);
  }

  if (url.protocol === "rediss:") {
    options.tls = {};
  }

  return options;
}

export function createScanQueue(redisUrl: string): ScanQueue {
  const queue = new Queue<ScanJobData, void, "scan">(scanQueueName, {
    connection: parseRedisConnectionOptions(redisUrl)
  });

  return {
    async enqueueScan(input) {
      const job = await queue.add("scan", input, {
        ...defaultScanJobOptions,
        jobId: input.scanId
      });

      return { jobId: job.id ?? input.scanId };
    },

    async close() {
      await queue.close();
    }
  };
}

export function createScanWorker(
  redisUrl: string,
  processor: Processor<ScanJobData, void, "scan">,
  options?: Pick<WorkerOptions, "concurrency">
): Worker<ScanJobData, void, "scan"> {
  const worker = new Worker<ScanJobData, void, "scan">(scanQueueName, processor, {
    connection: parseRedisConnectionOptions(redisUrl),
    concurrency: options?.concurrency ?? 2
  });

  return worker;
}
