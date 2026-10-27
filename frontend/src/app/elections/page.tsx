import FreedomSwordApp from '@frontend/components/FreedomSwordApp';

export const dynamic = 'force-dynamic';

export default function ElectionsPage() {
  const demoEnabled = process.env.NODE_ENV !== 'production' &&
    (process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development') === 'development' &&
    process.env.ALLOW_DEMO_AUTH === 'true';
  return <FreedomSwordApp demoEnabled={demoEnabled} />;
}
