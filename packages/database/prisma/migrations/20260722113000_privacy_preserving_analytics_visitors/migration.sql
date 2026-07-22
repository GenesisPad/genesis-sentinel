CREATE TABLE "AnalyticsVisitor" (
    "id" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "visitCount" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "AnalyticsVisitor_pkey" PRIMARY KEY ("id")
);
