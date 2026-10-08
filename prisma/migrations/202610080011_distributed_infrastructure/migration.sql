ALTER TYPE "BlockchainStatus" ADD VALUE 'PROCESSING';
ALTER TABLE "BlockchainRecord" ADD COLUMN "claimToken" TEXT;
ALTER TABLE "BlockchainRecord" ADD COLUMN "leaseExpiresAt" TIMESTAMP(3);
CREATE INDEX "BlockchainRecord_status_leaseExpiresAt_idx" ON "BlockchainRecord"("status", "leaseExpiresAt");
CREATE TABLE "RateLimitCounter" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimitCounter_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "RateLimitCounter_resetAt_idx" ON "RateLimitCounter"("resetAt");
