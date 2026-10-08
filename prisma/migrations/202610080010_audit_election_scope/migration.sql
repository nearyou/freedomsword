ALTER TABLE "AuditEvent" ADD COLUMN "electionId" TEXT;
CREATE INDEX "AuditEvent_electionId_sequence_idx" ON "AuditEvent"("electionId", "sequence");
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
