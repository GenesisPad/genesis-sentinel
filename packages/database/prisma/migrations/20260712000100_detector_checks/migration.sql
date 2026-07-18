CREATE TYPE "OwnershipStatus" AS ENUM ('RENOUNCED', 'ACTIVE', 'UNKNOWN');

CREATE TABLE "DetectorCheck" (
  "id" TEXT NOT NULL,
  "detectorResultId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "outcome" "CheckOutcome" NOT NULL,
  "confidence" "FindingConfidence" NOT NULL,
  "evidence" JSONB NOT NULL,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DetectorCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DetectorCheck_detectorResultId_idx" ON "DetectorCheck"("detectorResultId");
CREATE INDEX "DetectorCheck_code_idx" ON "DetectorCheck"("code");

ALTER TABLE "DetectorCheck"
  ADD CONSTRAINT "DetectorCheck_detectorResultId_fkey"
  FOREIGN KEY ("detectorResultId") REFERENCES "DetectorResult"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
