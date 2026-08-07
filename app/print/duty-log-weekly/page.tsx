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
        <h2 style={{ margin: '0 0 16px', textAlign: 'center', fontSize: 24, fontWeight: 700, letterSpacing: '0.5em', textIndent: '0.5em' }}>
          당직근무일지
        </h2>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <div style={{ fontSize: 14 }}>
            <span style={{ fontWeight: 600, marginRight: 10 }}>기간</span>
            {formatDutyDayLabel(monday)} ~ {formatDutyDayLabel(saturday)}
          </div>
          <div style={{ display: 'flex', border: '1px solid #333' }}>
            <div style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #333', background: '#f2f2f2', fontWeight: 600, fontSize: 12 }}>
              결<br />재
            </div>
            {['담당', '과장'].map((role, i) => (
              <div key={role} style={{ width: 70, textAlign: 'center', borderLeft: i > 0 ? '1px solid #333' : undefined }}>
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
