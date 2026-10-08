CREATE TABLE "TelegramAuthReplay" (
  "digest" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TelegramAuthReplay_pkey" PRIMARY KEY ("digest")
);
CREATE INDEX "TelegramAuthReplay_expiresAt_idx" ON "TelegramAuthReplay"("expiresAt");

CREATE TABLE "VotingCredential" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "electionId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "legacyPseudonym" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VotingCredential_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VotingCredential_token_key" ON "VotingCredential"("token");
CREATE UNIQUE INDEX "VotingCredential_userId_electionId_key" ON "VotingCredential"("userId", "electionId");
CREATE INDEX "VotingCredential_electionId_idx" ON "VotingCredential"("electionId");
ALTER TABLE "VotingCredential" ADD CONSTRAINT "VotingCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VotingCredential" ADD CONSTRAINT "VotingCredential_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VotingCredential" ADD CONSTRAINT "VotingCredential_token_valid" CHECK ("token" ~ '^[0-9a-f]{64}$' AND ("legacyPseudonym" IS NULL OR "legacyPseudonym" ~ '^[0-9a-f]{64}$'));

ALTER TABLE "VoterVerification" ADD COLUMN "subjectCommitment" TEXT;
CREATE UNIQUE INDEX "VoterVerification_provider_subjectCommitment_key" ON "VoterVerification"("provider", "subjectCommitment");
ALTER TABLE "VoterVerification" ADD CONSTRAINT "VoterVerification_subjectCommitment_valid" CHECK ("subjectCommitment" IS NULL OR "subjectCommitment" ~ '^[0-9a-f]{64}$');
