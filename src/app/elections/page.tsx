import FreedomSwordApp from '@/components/FreedomSwordApp';
import { demoAuthEnabled } from '@/server/config';

export const dynamic = 'force-dynamic';

export default function ElectionsPage() {
  return <FreedomSwordApp demoEnabled={demoAuthEnabled()} />;
}
