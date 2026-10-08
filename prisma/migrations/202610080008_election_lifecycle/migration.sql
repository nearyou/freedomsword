CREATE TYPE "ElectionStatus_v2" AS ENUM ('DRAFT', 'UPCOMING', 'ACTIVE', 'FINISHED', 'ARCHIVED');
ALTER TABLE "Election" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Election" ALTER COLUMN "status" TYPE "ElectionStatus_v2"
  USING (CASE "status"::text WHEN 'OPEN' THEN 'ACTIVE' WHEN 'CLOSED' THEN 'FINISHED' ELSE "status"::text END)::"ElectionStatus_v2";
DROP TYPE "ElectionStatus";
ALTER TYPE "ElectionStatus_v2" RENAME TO "ElectionStatus";
ALTER TABLE "Election" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
