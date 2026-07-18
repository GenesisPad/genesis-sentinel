-- Milestone 7: widen RiskAssessment.score to nullable (UNABLE_TO_ASSESS carries no numeric
-- score) and persist finding-level contributions plus unable-to-assess reasons alongside the
-- existing aggregate score/level.
ALTER TABLE "RiskAssessment" ALTER COLUMN "score" DROP NOT NULL;
ALTER TABLE "RiskAssessment" ADD COLUMN "contributions" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "RiskAssessment" ADD COLUMN "unableToAssessReasons" TEXT[] NOT NULL DEFAULT '{}';
