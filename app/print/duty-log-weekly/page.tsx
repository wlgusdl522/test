import { getDutyHolidays, getDutySaturdayLogs, getDutyWeekdayLogs } from '@/lib/supabase/duty';
import PrintButton from '@/components/print/PrintButton';
import DutyWeeklyLogTable, { formatDutyDayLabel } from '@/components/duty/DutyWeeklyLogTable';
import { addDays, mondayOf, todayISO } from '@/lib/dutyDate';
import { card, inputBase, btn } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function DutyLogWeeklyPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ monday?: string }>;
}) {
  const { monday: mondayParam } = await searchParams;
  const monday = mondayParam ?? mondayOf(todayISO());
  const saturday = addDays(monday, 5);

  const [weekdayLogs, saturdayLogs, holidays] = await Promise.all([
    getDutyWeekdayLogs(),
    getDutySaturdayLogs(),
    getDutyHolidays(),
  ]);

  return (
    <div className="p-6">
      <div className={`${card} print:hidden flex flex-wrap items-center gap-4`}>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="date" name="monday" defaultValue={monday} className={`${inputBase} w-auto`} />
          <button type="submit" className={btn}>조회</button>
        </form>
        <PrintButton />
      </div>

      <div className="bg-white dark:bg-zinc-900" style={{ fontSize: 13.5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            당직근무일지 ({formatDutyDayLabel(monday)} ~ {formatDutyDayLabel(saturday)})
          </h2>
          <div style={{ display: 'flex', border: '1px solid #333' }}>
            {['담당', '과장'].map((role) => (
              <div key={role} style={{ width: 70, textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid #333', background: '#f2f2f2', padding: '4px 0', fontWeight: 600 }}>{role}</div>
                <div style={{ height: 42 }} />
              </div>
            ))}
          </div>
        </div>

        <DutyWeeklyLogTable monday={monday} weekdayLogs={weekdayLogs} saturdayLogs={saturdayLogs} holidays={holidays} />
      </div>
    </div>
  );
}
