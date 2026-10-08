CREATE OR REPLACE FUNCTION check_audit_link() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous text; previous_sequence integer;
BEGIN
  PERFORM pg_advisory_xact_lock(741219);
  SELECT "hash", "sequence" INTO previous, previous_sequence FROM "AuditEvent" ORDER BY "sequence" DESC LIMIT 1;
  IF NEW."previousHash" <> COALESCE(previous, repeat('0',64)) OR NEW."sequence" <= COALESCE(previous_sequence,0) THEN RAISE EXCEPTION 'Audit chain fork or sequence reversal'; END IF;
  IF NEW."hash" <> encode(sha256(convert_to(NEW."previousHash" || ':' || NEW."commitment", 'UTF8')), 'hex') THEN RAISE EXCEPTION 'Invalid audit chain hash'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER platform_version_immutable BEFORE UPDATE OR DELETE ON "CandidatePlatform" FOR EACH ROW EXECUTE FUNCTION forbid_evidence_mutation();
CREATE TRIGGER vote_events_no_truncate BEFORE TRUNCATE ON "VoteEvent" FOR EACH STATEMENT EXECUTE FUNCTION forbid_evidence_mutation();
CREATE TRIGGER audit_events_no_truncate BEFORE TRUNCATE ON "AuditEvent" FOR EACH STATEMENT EXECUTE FUNCTION forbid_evidence_mutation();
CREATE TRIGGER agreements_no_truncate BEFORE TRUNCATE ON "VoterAgreement" FOR EACH STATEMENT EXECUTE FUNCTION forbid_evidence_mutation();
CREATE TRIGGER votes_no_truncate BEFORE TRUNCATE ON "Vote" FOR EACH STATEMENT EXECUTE FUNCTION forbid_evidence_mutation();
CREATE TRIGGER platforms_no_truncate BEFORE TRUNCATE ON "CandidatePlatform" FOR EACH STATEMENT EXECUTE FUNCTION forbid_evidence_mutation();
CREATE FUNCTION protect_blockchain_commitment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE audit_commitment text;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Outbox records cannot be deleted'; END IF;
  IF TG_OP = 'UPDATE' AND (NEW."auditId" <> OLD."auditId" OR NEW."commitment" <> OLD."commitment" OR NEW."adapter" <> OLD."adapter" OR NEW."id" <> OLD."id") THEN RAISE EXCEPTION 'Outbox commitment is immutable'; END IF;
  SELECT "commitment" INTO audit_commitment FROM "AuditEvent" WHERE "id" = NEW."auditId";
  IF audit_commitment IS NULL OR audit_commitment <> NEW."commitment" THEN RAISE EXCEPTION 'Outbox commitment does not match audit event'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER blockchain_commitment_bound BEFORE INSERT OR UPDATE OR DELETE ON "BlockchainRecord" FOR EACH ROW EXECUTE FUNCTION protect_blockchain_commitment();
CREATE TRIGGER blockchain_no_truncate BEFORE TRUNCATE ON "BlockchainRecord" FOR EACH STATEMENT EXECUTE FUNCTION forbid_evidence_mutation();
