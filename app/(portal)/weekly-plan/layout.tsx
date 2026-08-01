import { h1, pageWide } from '@/lib/ui';
import WeeklyPlanTabs from '@/components/weekly/WeeklyPlanTabs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function WeeklyPlanLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={pageWide}>
      <h1 className={h1}>주간업무계획</h1>
      <WeeklyPlanTabs />
      {children}
    </main>
  );
}
