import { h1, pageFluid } from '@/lib/ui';
import VehicleTabsClient from '@/components/vehicles/VehicleTabsClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function VehiclesLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>차량관리</h1>
      <VehicleTabsClient />
      {children}
    </main>
  );
}
