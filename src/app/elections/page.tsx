import FreedomSwordApp from '@/frontend/components/FreedomSwordApp';
import { demoAuthEnabled } from '@/backend/config';

export const dynamic = 'force-dynamic';

export default function ElectionsPage() {
  return <FreedomSwordApp demoEnabled={demoAuthEnabled()} />;
}
