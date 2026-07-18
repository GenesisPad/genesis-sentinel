CREATE TYPE "ScanState" AS ENUM ('QUEUED', 'RESOLVING_CHAIN', 'FETCHING_CONTRACT', 'ANALYZING_CONTRACT', 'DISCOVERING_MARKETS', 'ANALYZING_HOLDERS', 'SIMULATING_TRADES', 'SCORING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED');
CREATE TYPE "ScanStageStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');
CREATE TYPE "CheckOutcome" AS ENUM ('DETECTED', 'PASSED', 'UNSUPPORTED', 'FAILED', 'INCONCLUSIVE', 'DATA_UNAVAILABLE');
CREATE TYPE "FindingSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "FindingConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "RiskCategory" AS ENUM ('CONTRACT_CONTROL', 'TRADING_SAFETY', 'LIQUIDITY_SAFETY', 'DISTRIBUTION_RISK', 'REPUTATION_RISK');
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'UNABLE_TO_VERIFY');
CREATE TYPE "EvidenceType" AS ENUM ('FUNCTION', 'EVENT', 'STORAGE', 'BYTECODE', 'TRANSACTION_TRACE', 'SIMULATION', 'HOLDER_DATA', 'LIQUIDITY_DATA', 'EXTERNAL_SOURCE');

CREATE TABLE "Chain" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Chain_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Token" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "address" TEXT NOT NULL,
  "symbol" TEXT,
  "name" TEXT,
  "decimals" INTEGER,
  "metadataBlock" BIGINT,
  "metadataUpdatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Contract" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "address" TEXT NOT NULL,
  "firstObservedBlock" BIGINT,
  "lastBytecodeBlock" BIGINT,
  "bytecodeHash" TEXT,
  "sourceVerified" BOOLEAN,
  "sourceVerificationUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Scan" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "tokenId" TEXT,
  "targetAddress" TEXT NOT NULL,
  "state" "ScanState" NOT NULL DEFAULT 'QUEUED',
  "scannerVersion" TEXT NOT NULL,
  "idempotencyKeyHash" TEXT NOT NULL,
  "requestedBy" TEXT,
  "scanBlockNumber" BIGINT,
  "scanBlockTimestamp" TIMESTAMP(3),
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failureSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScanStage" (
  "id" TEXT NOT NULL,
  "scanId" TEXT NOT NULL,
  "name" "ScanState" NOT NULL,
  "status" "ScanStageStatus" NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "metadata" JSONB,
  CONSTRAINT "ScanStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Detector" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Detector_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DetectorResult" (
  "id" TEXT NOT NULL,
  "scanId" TEXT NOT NULL,
  "detectorId" TEXT NOT NULL,
  "detectorVersion" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "outcome" "CheckOutcome",
  "errorMessage" TEXT,
  "metadata" JSONB,
  CONSTRAINT "DetectorResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Finding" (
  "id" TEXT NOT NULL,
  "scanId" TEXT NOT NULL,
  "detectorResultId" TEXT,
  "code" TEXT NOT NULL,
  "detectorId" TEXT NOT NULL,
  "detectorVersion" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "severity" "FindingSeverity" NOT NULL,
  "category" "RiskCategory" NOT NULL,
  "confidence" "FindingConfidence" NOT NULL,
  "description" TEXT NOT NULL,
  "technicalExplanation" TEXT NOT NULL,
  "recommendation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FindingEvidence" (
  "id" TEXT NOT NULL,
  "findingId" TEXT NOT NULL,
  "type" "EvidenceType" NOT NULL,
  "summary" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "blockNumber" BIGINT,
  "transactionHash" TEXT,
  "address" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FindingEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RiskAssessment" (
  "id" TEXT NOT NULL,
  "scanId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "level" "RiskLevel" NOT NULL,
  "confidence" "FindingConfidence" NOT NULL,
  "scannerVersion" TEXT NOT NULL,
  "scoringVersion" TEXT NOT NULL,
  "explanation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CategoryScore" (
  "id" TEXT NOT NULL,
  "riskAssessmentId" TEXT NOT NULL,
  "category" "RiskCategory" NOT NULL,
  "score" INTEGER NOT NULL,
  "confidence" "FindingConfidence" NOT NULL,
  "explanation" TEXT,
  CONSTRAINT "CategoryScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiquidityPool" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "tokenAddress" TEXT NOT NULL,
  "poolAddress" TEXT NOT NULL,
  "dex" TEXT,
  "quoteTokenAddress" TEXT,
  "firstObservedBlock" BIGINT,
  "lastObservedBlock" BIGINT,
  "liquidityData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LiquidityPool_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HolderSnapshot" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "tokenAddress" TEXT NOT NULL,
  "blockNumber" BIGINT NOT NULL,
  "holderCount" INTEGER,
  "topHolders" JSONB NOT NULL,
  "concentration" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HolderSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SimulationRun" (
  "id" TEXT NOT NULL,
  "scanId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "outcome" "CheckOutcome" NOT NULL,
  "blockNumber" BIGINT,
  "input" JSONB NOT NULL,
  "result" JSONB,
  "revertReason" TEXT,
  "gasUsed" BIGINT,
  "simulationTool" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SimulationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "APIKey" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "APIKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "APIUsage" (
  "id" TEXT NOT NULL,
  "apiKeyId" TEXT,
  "route" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "status" INTEGER NOT NULL,
  "units" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "APIUsage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Watchlist" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WatchlistItem" (
  "id" TEXT NOT NULL,
  "watchlistId" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "address" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecurityEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "subject" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramUser" (
  "id" TEXT NOT NULL,
  "telegramUserId" BIGINT NOT NULL,
  "username" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TelegramUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramChat" (
  "id" TEXT NOT NULL,
  "telegramChatId" BIGINT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TelegramChat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Chain_chainId_key" ON "Chain"("chainId");
CREATE UNIQUE INDEX "Token_chainId_address_key" ON "Token"("chainId", "address");
CREATE INDEX "Token_address_idx" ON "Token"("address");
CREATE UNIQUE INDEX "Contract_chainId_address_key" ON "Contract"("chainId", "address");
CREATE INDEX "Contract_address_idx" ON "Contract"("address");
CREATE UNIQUE INDEX "Scan_chainId_targetAddress_idempotencyKeyHash_key" ON "Scan"("chainId", "targetAddress", "idempotencyKeyHash");
CREATE INDEX "Scan_chainId_targetAddress_idx" ON "Scan"("chainId", "targetAddress");
CREATE INDEX "Scan_state_idx" ON "Scan"("state");
CREATE UNIQUE INDEX "ScanStage_scanId_name_key" ON "ScanStage"("scanId", "name");
CREATE INDEX "DetectorResult_scanId_idx" ON "DetectorResult"("scanId");
CREATE INDEX "DetectorResult_detectorId_detectorVersion_idx" ON "DetectorResult"("detectorId", "detectorVersion");
CREATE INDEX "Finding_scanId_severity_idx" ON "Finding"("scanId", "severity");
CREATE INDEX "Finding_code_idx" ON "Finding"("code");
CREATE INDEX "FindingEvidence_findingId_idx" ON "FindingEvidence"("findingId");
CREATE INDEX "FindingEvidence_blockNumber_idx" ON "FindingEvidence"("blockNumber");
CREATE UNIQUE INDEX "RiskAssessment_scanId_key" ON "RiskAssessment"("scanId");
CREATE UNIQUE INDEX "CategoryScore_riskAssessmentId_category_key" ON "CategoryScore"("riskAssessmentId", "category");
CREATE UNIQUE INDEX "LiquidityPool_chainId_poolAddress_key" ON "LiquidityPool"("chainId", "poolAddress");
CREATE INDEX "LiquidityPool_chainId_tokenAddress_idx" ON "LiquidityPool"("chainId", "tokenAddress");
CREATE UNIQUE INDEX "HolderSnapshot_chainId_tokenAddress_blockNumber_key" ON "HolderSnapshot"("chainId", "tokenAddress", "blockNumber");
CREATE INDEX "SimulationRun_scanId_idx" ON "SimulationRun"("scanId");
CREATE UNIQUE INDEX "APIKey_keyHash_key" ON "APIKey"("keyHash");
CREATE INDEX "APIUsage_apiKeyId_createdAt_idx" ON "APIUsage"("apiKeyId", "createdAt");
CREATE UNIQUE INDEX "WatchlistItem_watchlistId_chainId_address_key" ON "WatchlistItem"("watchlistId", "chainId", "address");
CREATE INDEX "SecurityEvent_type_createdAt_idx" ON "SecurityEvent"("type", "createdAt");
CREATE UNIQUE INDEX "TelegramUser_telegramUserId_key" ON "TelegramUser"("telegramUserId");
CREATE UNIQUE INDEX "TelegramChat_telegramChatId_key" ON "TelegramChat"("telegramChatId");

ALTER TABLE "Token" ADD CONSTRAINT "Token_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Chain"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Chain"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Chain"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScanStage" ADD CONSTRAINT "ScanStage_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DetectorResult" ADD CONSTRAINT "DetectorResult_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DetectorResult" ADD CONSTRAINT "DetectorResult_detectorId_fkey" FOREIGN KEY ("detectorId") REFERENCES "Detector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_detectorResultId_fkey" FOREIGN KEY ("detectorResultId") REFERENCES "DetectorResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FindingEvidence" ADD CONSTRAINT "FindingEvidence_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CategoryScore" ADD CONSTRAINT "CategoryScore_riskAssessmentId_fkey" FOREIGN KEY ("riskAssessmentId") REFERENCES "RiskAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationRun" ADD CONSTRAINT "SimulationRun_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "APIUsage" ADD CONSTRAINT "APIUsage_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "APIKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
