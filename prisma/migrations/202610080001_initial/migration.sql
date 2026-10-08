-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ElectionType" AS ENUM ('COUNCIL', 'BUDGET', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "ElectionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "VoteEventType" AS ENUM ('CAST', 'RECALL');

-- CreateEnum
CREATE TYPE "PromiseStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DELIVERED', 'DELAYED');

-- CreateEnum
CREATE TYPE "BlockchainStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "voterKey" TEXT NOT NULL,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoterVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "receipt" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoterVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoterAgreement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "textHash" TEXT NOT NULL,
    "signatureHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoterAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Election" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ElectionType" NOT NULL,
    "status" "ElectionStatus" NOT NULL DEFAULT 'OPEN',
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "party" TEXT NOT NULL,
    "ideology" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidatePlatform" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidatePlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPromise" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "PromiseStatus" NOT NULL DEFAULT 'PLANNED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "evidence" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPromise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "pseudonym" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteEvent" (
    "id" TEXT NOT NULL,
    "voteId" TEXT NOT NULL,
    "type" "VoteEventType" NOT NULL,
    "units" INTEGER NOT NULL,
    "requestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "commitment" TEXT NOT NULL,
    "previousHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockchainRecord" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "adapter" TEXT NOT NULL DEFAULT 'MOCK',
    "status" "BlockchainStatus" NOT NULL DEFAULT 'PENDING',
    "receipt" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "BlockchainRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "User_voterKey_key" ON "User"("voterKey");

-- CreateIndex
CREATE UNIQUE INDEX "VoterVerification_userId_provider_key" ON "VoterVerification"("userId", "provider");

-- CreateIndex
CREATE INDEX "VoterAgreement_documentId_version_idx" ON "VoterAgreement"("documentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "VoterAgreement_userId_documentId_version_key" ON "VoterAgreement"("userId", "documentId", "version");

-- CreateIndex
CREATE INDEX "Candidate_electionId_fullName_idx" ON "Candidate"("electionId", "fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_id_electionId_key" ON "Candidate"("id", "electionId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidatePlatform_candidateId_version_key" ON "CandidatePlatform"("candidateId", "version");

-- CreateIndex
CREATE INDEX "Vote_candidateId_idx" ON "Vote"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_electionId_pseudonym_key" ON "Vote"("electionId", "pseudonym");

-- CreateIndex
CREATE UNIQUE INDEX "VoteEvent_voteId_requestId_key" ON "VoteEvent"("voteId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_sequence_key" ON "AuditEvent"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_commitment_key" ON "AuditEvent"("commitment");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_hash_key" ON "AuditEvent"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "BlockchainRecord_auditId_key" ON "BlockchainRecord"("auditId");

-- AddForeignKey
ALTER TABLE "VoterVerification" ADD CONSTRAINT "VoterVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoterAgreement" ADD CONSTRAINT "VoterAgreement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePlatform" ADD CONSTRAINT "CandidatePlatform_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPromise" ADD CONSTRAINT "PlatformPromise_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "CandidatePlatform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_candidateId_electionId_fkey" FOREIGN KEY ("candidateId", "electionId") REFERENCES "Candidate"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteEvent" ADD CONSTRAINT "VoteEvent_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "Vote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockchainRecord" ADD CONSTRAINT "BlockchainRecord_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "AuditEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain constraints and append-only evidence. Run via a migration role.
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_balance_valid" CHECK ("balance" BETWEEN 0 AND 100 AND "balance" % 25 = 0);
ALTER TABLE "VoteEvent" ADD CONSTRAINT "VoteEvent_units_valid" CHECK (("type" = 'CAST' AND "units" = 100) OR ("type" = 'RECALL' AND "units" IN (-25, -50, -75, -100)));
CREATE UNIQUE INDEX "VoteEvent_one_cast" ON "VoteEvent" ("voteId") WHERE "type" = 'CAST';
ALTER TABLE "PlatformPromise" ADD CONSTRAINT "Promise_progress_valid" CHECK ("progress" BETWEEN 0 AND 100);
ALTER TABLE "Election" ADD CONSTRAINT "Election_dates_valid" CHECK ("closesAt" > "opensAt");
ALTER TABLE "AuditEvent" ADD CONSTRAINT "Audit_hash_format" CHECK ("commitment" ~ '^[0-9a-f]{64}$' AND "hash" ~ '^[0-9a-f]{64}$' AND "previousHash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "BlockchainRecord" ADD CONSTRAINT "Blockchain_commitment_format" CHECK ("adapter" = 'MOCK' AND "commitment" ~ '^[0-9a-f]{64}$');

CREATE FUNCTION forbid_evidence_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Evidence is append-only'; END;
$$;
CREATE TRIGGER vote_event_immutable BEFORE UPDATE OR DELETE ON "VoteEvent" FOR EACH ROW EXECUTE FUNCTION forbid_evidence_mutation();
CREATE TRIGGER audit_event_immutable BEFORE UPDATE OR DELETE ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION forbid_evidence_mutation();
CREATE TRIGGER agreement_immutable BEFORE UPDATE OR DELETE ON "VoterAgreement" FOR EACH ROW EXECUTE FUNCTION forbid_evidence_mutation();

CREATE FUNCTION protect_ballot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Ballots cannot be deleted'; END IF;
  IF NEW."id" <> OLD."id" OR NEW."electionId" <> OLD."electionId" OR NEW."candidateId" <> OLD."candidateId" OR NEW."pseudonym" <> OLD."pseudonym" OR NEW."createdAt" <> OLD."createdAt" THEN RAISE EXCEPTION 'Ballot identity is immutable'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER ballot_immutable BEFORE UPDATE OR DELETE ON "Vote" FOR EACH ROW EXECUTE FUNCTION protect_ballot();

CREATE FUNCTION check_ballot_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ballot_id text; projected integer; actual bigint; casts bigint;
BEGIN
  IF TG_TABLE_NAME = 'Vote' THEN ballot_id := NEW."id"; ELSE ballot_id := NEW."voteId"; END IF;
  SELECT "balance" INTO projected FROM "Vote" WHERE "id" = ballot_id;
  SELECT COALESCE(SUM("units"),0), COUNT(*) FILTER (WHERE "type" = 'CAST') INTO actual, casts FROM "VoteEvent" WHERE "voteId" = ballot_id;
  IF projected IS NULL OR actual <> projected OR casts <> 1 THEN RAISE EXCEPTION 'Ballot projection does not match immutable ledger'; END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER ballot_ledger_matches AFTER INSERT OR UPDATE ON "Vote" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_ballot_ledger();
CREATE CONSTRAINT TRIGGER event_ledger_matches AFTER INSERT ON "VoteEvent" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_ballot_ledger();

CREATE FUNCTION check_audit_link() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous text;
BEGIN
  PERFORM pg_advisory_xact_lock(741219);
  SELECT "hash" INTO previous FROM "AuditEvent" ORDER BY "sequence" DESC LIMIT 1;
  IF NEW."previousHash" <> COALESCE(previous, repeat('0',64)) THEN RAISE EXCEPTION 'Audit chain fork'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER audit_chain_link BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION check_audit_link();
