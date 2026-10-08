ALTER TABLE "VoteEvent" ADD COLUMN "requestHash" TEXT NOT NULL DEFAULT repeat('0',64);
ALTER TABLE "VoteEvent" ADD CONSTRAINT "VoteEvent_request_hash_format" CHECK ("requestHash" ~ '^[a-f0-9]{64}$');
