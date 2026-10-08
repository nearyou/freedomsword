CREATE FUNCTION protect_election_configuration() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Elections cannot be deleted'; END IF;
  IF NEW."id" <> OLD."id" THEN RAISE EXCEPTION 'Election identity is immutable'; END IF;
  IF OLD."status" <> 'DRAFT' AND ROW(
    NEW."title", NEW."description", NEW."type", NEW."opensAt", NEW."closesAt",
    NEW."recallEnabled", NEW."fullRecallEnabled", NEW."partialRecallEnabled",
    NEW."partialRecallAmount", NEW."firstRecallDelaySeconds", NEW."recallCooldownSeconds",
    NEW."maxRecallOperations"
  ) IS DISTINCT FROM ROW(
    OLD."title", OLD."description", OLD."type", OLD."opensAt", OLD."closesAt",
    OLD."recallEnabled", OLD."fullRecallEnabled", OLD."partialRecallEnabled",
    OLD."partialRecallAmount", OLD."firstRecallDelaySeconds", OLD."recallCooldownSeconds",
    OLD."maxRecallOperations"
  ) THEN RAISE EXCEPTION 'Activated election configuration is immutable'; END IF;
  IF (OLD."status" = 'DRAFT' AND NEW."status" NOT IN ('DRAFT','UPCOMING','ACTIVE')) OR
     (OLD."status" = 'UPCOMING' AND NEW."status" NOT IN ('UPCOMING','ACTIVE','FINISHED')) OR
     (OLD."status" = 'ACTIVE' AND NEW."status" NOT IN ('ACTIVE','FINISHED')) OR
     (OLD."status" = 'FINISHED' AND NEW."status" NOT IN ('FINISHED','ARCHIVED')) OR
     (OLD."status" = 'ARCHIVED' AND NEW."status" <> 'ARCHIVED')
  THEN RAISE EXCEPTION 'Invalid election state transition'; END IF;
  IF OLD."status" = 'DRAFT' AND EXISTS (SELECT 1 FROM "Vote" WHERE "electionId" = OLD."id")
  THEN RAISE EXCEPTION 'Election with ballots cannot be edited'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER election_configuration_guard BEFORE UPDATE OR DELETE ON "Election" FOR EACH ROW EXECUTE FUNCTION protect_election_configuration();
CREATE TRIGGER elections_no_truncate BEFORE TRUNCATE ON "Election" FOR EACH STATEMENT EXECUTE FUNCTION forbid_evidence_mutation();

CREATE FUNCTION protect_candidate_configuration() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE election_status "ElectionStatus"; election_key text;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Candidates cannot be deleted'; END IF;
  election_key := NEW."electionId";
  SELECT "status" INTO election_status FROM "Election" WHERE "id" = election_key;
  IF TG_OP = 'INSERT' THEN
    IF election_status <> 'DRAFT' THEN RAISE EXCEPTION 'Activated election candidates are immutable'; END IF;
  ELSE
    IF NEW."id" <> OLD."id" OR NEW."electionId" <> OLD."electionId"
    THEN RAISE EXCEPTION 'Candidate identity is immutable'; END IF;
    IF election_status <> 'DRAFT' AND NEW IS DISTINCT FROM OLD
    THEN RAISE EXCEPTION 'Activated election candidates are immutable'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER candidate_configuration_guard BEFORE INSERT OR UPDATE OR DELETE ON "Candidate" FOR EACH ROW EXECUTE FUNCTION protect_candidate_configuration();

CREATE FUNCTION protect_new_platform() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE election_status "ElectionStatus";
BEGIN
  SELECT e."status" INTO election_status FROM "Candidate" c JOIN "Election" e ON e."id" = c."electionId" WHERE c."id" = NEW."candidateId";
  IF election_status <> 'DRAFT' THEN RAISE EXCEPTION 'Activated election platforms are immutable'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER platform_creation_guard BEFORE INSERT ON "CandidatePlatform" FOR EACH ROW EXECUTE FUNCTION protect_new_platform();

CREATE FUNCTION protect_promise_configuration() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE election_status "ElectionStatus"; platform_key text;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Platform promises cannot be deleted'; END IF;
  platform_key := NEW."platformId";
  SELECT e."status" INTO election_status FROM "CandidatePlatform" p
    JOIN "Candidate" c ON c."id" = p."candidateId"
    JOIN "Election" e ON e."id" = c."electionId" WHERE p."id" = platform_key;
  IF TG_OP = 'INSERT' THEN
    IF election_status <> 'DRAFT' THEN RAISE EXCEPTION 'Activated platform promises cannot be replaced'; END IF;
  ELSE
    IF election_status <> 'DRAFT' AND
      (NEW."id" <> OLD."id" OR NEW."platformId" <> OLD."platformId" OR NEW."title" <> OLD."title")
    THEN RAISE EXCEPTION 'Activated platform promises cannot be replaced'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER promise_configuration_guard BEFORE INSERT OR UPDATE OR DELETE ON "PlatformPromise" FOR EACH ROW EXECUTE FUNCTION protect_promise_configuration();
