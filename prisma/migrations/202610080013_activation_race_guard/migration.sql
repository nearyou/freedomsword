-- Lock the parent election before the existing configuration triggers inspect its
-- state. Otherwise a direct insert can read DRAFT while activation holds the
-- election row, wait on the foreign key, then commit after activation.
CREATE FUNCTION lock_candidate_election() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE election_key text;
BEGIN
  election_key := CASE WHEN TG_OP = 'DELETE' THEN OLD."electionId" ELSE NEW."electionId" END;
  PERFORM 1 FROM "Election" WHERE "id" = election_key FOR SHARE;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER a_candidate_election_lock BEFORE INSERT OR UPDATE OR DELETE ON "Candidate"
FOR EACH ROW EXECUTE FUNCTION lock_candidate_election();

CREATE FUNCTION lock_platform_election() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE candidate_key text;
BEGIN
  candidate_key := CASE WHEN TG_OP = 'DELETE' THEN OLD."candidateId" ELSE NEW."candidateId" END;
  PERFORM 1 FROM "Election" e JOIN "Candidate" c ON c."electionId" = e."id"
    WHERE c."id" = candidate_key FOR SHARE OF e;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER a_platform_election_lock BEFORE INSERT OR UPDATE OR DELETE ON "CandidatePlatform"
FOR EACH ROW EXECUTE FUNCTION lock_platform_election();

CREATE FUNCTION lock_promise_election() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE platform_key text;
BEGIN
  platform_key := CASE WHEN TG_OP = 'DELETE' THEN OLD."platformId" ELSE NEW."platformId" END;
  PERFORM 1 FROM "Election" e JOIN "Candidate" c ON c."electionId" = e."id"
    JOIN "CandidatePlatform" p ON p."candidateId" = c."id"
    WHERE p."id" = platform_key FOR SHARE OF e;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER a_promise_election_lock BEFORE INSERT OR UPDATE OR DELETE ON "PlatformPromise"
FOR EACH ROW EXECUTE FUNCTION lock_promise_election();
