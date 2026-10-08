ALTER TABLE "Election" ADD COLUMN "recallEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Election" ADD COLUMN "fullRecallEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Election" ADD COLUMN "partialRecallEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Election" ADD COLUMN "partialRecallAmount" INTEGER NOT NULL DEFAULT 25;
ALTER TABLE "Election" ADD COLUMN "firstRecallDelaySeconds" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Election" ADD COLUMN "recallCooldownSeconds" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Election" ADD COLUMN "maxRecallOperations" INTEGER;
ALTER TABLE "Election" ADD CONSTRAINT "Election_recall_policy_valid" CHECK (
  "partialRecallAmount" BETWEEN 1 AND 100 AND
  "firstRecallDelaySeconds" BETWEEN 0 AND 31536000 AND
  "recallCooldownSeconds" BETWEEN 0 AND 31536000 AND
  ("maxRecallOperations" IS NULL OR "maxRecallOperations" BETWEEN 1 AND 100)
);
ALTER TABLE "Vote" DROP CONSTRAINT "Vote_balance_valid";
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_balance_valid" CHECK ("balance" BETWEEN 0 AND 100);
ALTER TABLE "VoteEvent" DROP CONSTRAINT "VoteEvent_units_valid";
ALTER TABLE "VoteEvent" ADD CONSTRAINT "VoteEvent_units_valid" CHECK (
  ("type" = 'CAST' AND "units" = 100) OR
  ("type" = 'RECALL' AND "units" BETWEEN -100 AND -1)
);
