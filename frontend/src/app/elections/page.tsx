import FreedomSwordApp from '@frontend/components/FreedomSwordApp';
import { citizenLocation } from '@frontend/lib/citizen-location';

export const dynamic = 'force-dynamic';

export default async function ElectionsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const location = citizenLocation(await searchParams);
  const demoEnabled = process.env.NODE_ENV !== 'production' &&
    (process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development') === 'development' &&
    process.env.ALLOW_DEMO_AUTH === 'true';
  return <FreedomSwordApp demoEnabled={demoEnabled} initialTab={location.tab}
    initialElectionId={location.electionId} />;
}
