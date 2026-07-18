ALTER TABLE "Token"
  ADD COLUMN "deployerAddress" TEXT,
  ADD COLUMN "contractCreatedAt" TIMESTAMP(3),
  ADD COLUMN "creationTxHash" TEXT,
  ADD COLUMN "tokenType" TEXT,
  ADD COLUMN "iconUrl" TEXT,
  ADD COLUMN "reputation" TEXT;
