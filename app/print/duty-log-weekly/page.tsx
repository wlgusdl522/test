import { getDutyHolidays, getDutySaturdayLogs, getDutyWeekdayLogs } from '@/lib/supabase/duty';
import { getKeyedList } from '@/lib/mutate/keyedTable';
import { APPROVAL_JEONGYEOL_TABLE } from '@/lib/sheets/registry';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { APPROVAL_LINE_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { getStaffList } from '@/lib/mutate/staff';
import { buildApprovalBoxData } from '@/lib/approval/approvalLine';
import ApprovalBox from '@/components/print/ApprovalBox';
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

  const [weekdayLogs, saturdayLogs, holidays, approvalRules, approvalLine, me, staffList] = await Promise.all([
    getDutyWeekdayLogs(),
    getDutySaturdayLogs(),
    getDutyHolidays(),
    getKeyedList(APPROVAL_JEONGYEOL_TABLE),
    getSimpleList(APPROVAL_LINE_SHEET_NAME),
    getViewerStaffRecord(),
    getStaffList(),
  ]);

  const rule = approvalRules.find((r) => r.페이지ID === 'duty-log-weekly');
  const approvalData = buildApprovalBoxData(
    approvalLine,
    rule?.전결기준 ?? '',
    rule?.담당표시 ?? '자동',
    rule?.결재라인여부 ?? '사용',
    me?.['직급/직책'] ?? '',
    me?.소속팀 ?? '',
    staffList
  );

  return (
    <div className="p-6">
      {/* 표가 가로로 넓어(요일/시설점검/민원/특근자 등) 세로 A4보다 가로 A4가 훨씬 자연스럽게 들어간다. */}
      <style>{'@media print { @page { size: A4 landscape; margin: 10mm; } }'}</style>
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
          <ApprovalBox data={approvalData} scale={0.6} />
        </div>

        <DutyWeeklyLogTable monday={monday} weekdayLogs={weekdayLogs} saturdayLogs={saturdayLogs} holidays={holidays} />
      </div>
    </div>
  );
}
