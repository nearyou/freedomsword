import DemocracyApp from '@/components/DemocracyApp';
import { demoAuthEnabled } from '@/server/config';
export const dynamic = 'force-dynamic';
export default function Home() {
  return (
    <DemocracyApp demoEnabled={demoAuthEnabled()} />
  );
}
