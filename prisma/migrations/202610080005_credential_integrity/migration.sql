CREATE FUNCTION protect_voting_credential() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Voting credentials are immutable';
END;
$$;
CREATE TRIGGER voting_credential_immutable BEFORE UPDATE OR DELETE ON "VotingCredential" FOR EACH ROW EXECUTE FUNCTION protect_voting_credential();
CREATE TRIGGER voting_credential_no_truncate BEFORE TRUNCATE ON "VotingCredential" FOR EACH STATEMENT EXECUTE FUNCTION forbid_evidence_mutation();
