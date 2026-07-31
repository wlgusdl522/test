import { getKeyedList } from '@/lib/mutate/keyedTable';
import { APPROVAL_JEONGYEOL_TABLE } from '@/lib/sheets/registry';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { APPROVAL_LINE_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { getStaffList } from '@/lib/mutate/staff';
import { getSupervisorWeeklyRollup } from '@/lib/mutate/weeklyRollup';
import { buildApprovalBoxData } from '@/lib/approval/approvalLine';
import ApprovalBox from '@/components/print/ApprovalBox';
import PrintButton from '@/components/print/PrintButton';
import { btn, card, input, inputBase, table, td, th } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

// 원본 엑셀 "휴가" 행의 팀별 표시 라벨(총무/1팀/2팀/3팀/요양/데이) — 못 찾는 팀은 그냥 팀 이름 그대로 보여준다.
const LEAVE_LABELS: Record<string, string> = {
  총무팀: '총무',
  복지1팀: '1팀',
  복지2팀: '2팀',
  복지3팀: '3팀',
  요양센터: '요양',
  데이케어센터: '데이',
};

function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function formatDayHeader(iso: string, weekdayLabel: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${weekdayLabel})`;
}

function formatRollupDateRange(monday: Date, friday: Date): string {
  return `${monday.getFullYear()}. ${monday.getMonth() + 1}. ${monday.getDate()} ~${friday.getMonth() + 1}. ${friday.getDate()}.`;
}

function bulletCell(tasks: Record<string, string>[], iso: string) {
  const dayTasks = tasks.filter((t) => t['날짜'] === iso);
  if (!dayTasks.length) return <td className={td}></td>;
  return (
    <td className={td}>
      {dayTasks.map((t, i) => (
        <div key={i}>• {t['업무내용']}</div>
      ))}
    </td>
  );
}

export default async function WeeklyPlanRollupPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ weekStart?: string }>;
}) {
  const params = await searchParams;
  const weekStart = params.weekStart ?? mondayOf(new Date());
  const [me, approvalRules, approvalLine, staffList, rollup] = await Promise.all([
    getViewerStaffRecord(),
    getKeyedList(APPROVAL_JEONGYEOL_TABLE),
    getSimpleList(APPROVAL_LINE_SHEET_NAME),
    getStaffList(),
    getSupervisorWeeklyRollup(weekStart),
  ]);

  const monday = new Date(`${weekStart}T00:00:00`);
  const dayDates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    dayDates.push(d.toISOString().slice(0, 10));
  }
  const friday = new Date(`${dayDates[4]}T00:00:00`);

  const rule = approvalRules.find((r) => r.페이지ID === 'weekly-plan-rollup');
  const approvalData = buildApprovalBoxData(
    approvalLine,
    rule?.전결기준 ?? '',
    rule?.담당표시 ?? '자동',
    rule?.결재라인여부 ?? '사용',
    me?.['직급/직책'] ?? '',
    me?.소속팀 ?? '',
    staffList
  );

  const leaveTeams = Object.keys(LEAVE_LABELS).filter((t) => rollup.teams.some((tr) => tr.team === t));
  const teamsForLeave = leaveTeams.length ? leaveTeams : rollup.teams.map((t) => t.team);

  return (
    <div className="p-6">
      <div className={`${card} print:hidden flex flex-wrap items-center gap-4`}>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="date" name="weekStart" defaultValue={weekStart} className={`${inputBase} w-auto`} />
          <button type="submit" className={btn}>조회</button>
        </form>
        <PrintButton />
      </div>

      <div className="bg-white dark:bg-zinc-900">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>부서별 주간업무계획</h2>
            <div style={{ marginTop: 6, fontSize: 15, color: '#666', textDecoration: 'underline' }}>
              {formatRollupDateRange(monday, friday)}
            </div>
          </div>
          <ApprovalBox data={approvalData} />
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #d7dbe0', borderRadius: 6 }}>
          <table className={table}>
            <colgroup>
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              {dayDates.map((iso) => <col key={iso} style={{ width: `${(86 / dayDates.length).toFixed(2)}%` }} />)}
            </colgroup>
            <thead>
              <tr>
                <th className={th} colSpan={2}>담당자</th>
                {dayDates.map((iso, i) => (
                  <th key={iso} className={th}>{formatDayHeader(iso, WEEKDAY_LABELS[i])}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rollup.leaders.map((l) => (
                <tr key={l.email}>
                  <td className={td} colSpan={2}><b>{l.position}</b></td>
                  {dayDates.map((iso) => bulletCell(l.tasks, iso))}
                </tr>
              ))}
              {rollup.teams.map((t) => (
                <tr key={t.team}>
                  <td className={td} colSpan={2}><b>{t.team}</b></td>
                  {dayDates.map((iso) => bulletCell(t.tasks, iso))}
                </tr>
              ))}
              {teamsForLeave.map((teamName, idx) => {
                const teamLeaves = rollup.leaves.filter((lv) => lv['소속팀'] === teamName);
                return (
                  <tr key={teamName}>
                    {idx === 0 && (
                      <td className={td} rowSpan={teamsForLeave.length}><b>휴가</b></td>
                    )}
                    <td className={td}>{LEAVE_LABELS[teamName] ?? teamName}</td>
                    {dayDates.map((iso) => bulletCell(teamLeaves, iso))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
