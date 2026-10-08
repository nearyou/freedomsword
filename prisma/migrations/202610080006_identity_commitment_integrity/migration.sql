CREATE FUNCTION protect_verified_subject() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Verification records cannot be deleted'; END IF;
  IF OLD."subjectCommitment" IS NOT NULL AND NEW."subjectCommitment" IS DISTINCT FROM OLD."subjectCommitment" THEN
    RAISE EXCEPTION 'Verified subject commitment is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER verification_subject_immutable BEFORE UPDATE OR DELETE ON "VoterVerification" FOR EACH ROW EXECUTE FUNCTION protect_verified_subject();
CREATE TRIGGER verification_no_truncate BEFORE TRUNCATE ON "VoterVerification" FOR EACH STATEMENT EXECUTE FUNCTION forbid_evidence_mutation();
