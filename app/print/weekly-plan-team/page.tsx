import { getWeeklyTasks } from '@/lib/mutate/weeklyTask';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME, APPROVAL_LINE_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getKeyedList } from '@/lib/mutate/keyedTable';
import { APPROVAL_JEONGYEOL_TABLE } from '@/lib/sheets/registry';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { getStaffList } from '@/lib/mutate/staff';
import { buildApprovalBoxData } from '@/lib/approval/approvalLine';
import ApprovalBox from '@/components/print/ApprovalBox';
import PrintButton from '@/components/print/PrintButton';
import { btn, card, input } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default async function WeeklyPlanTeamPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; weekStart?: string }>;
}) {
  const params = await searchParams;
  const [me, teams, approvalRules, approvalLine, staffList] = await Promise.all([
    getViewerStaffRecord(),
    getSimpleList(TEAM_LIST_SHEET_NAME),
    getKeyedList(APPROVAL_JEONGYEOL_TABLE),
    getSimpleList(APPROVAL_LINE_SHEET_NAME),
    getStaffList(),
  ]);
  const team = params.team ?? me?.소속팀 ?? teams[0] ?? '';
  const weekStart = params.weekStart ?? mondayOf(new Date());
  const tasks = await getWeeklyTasks(team, weekStart);

  const rule = approvalRules.find((r) => r.페이지ID === 'weekly-plan-team');
  const approvalData = buildApprovalBoxData(
    approvalLine,
    rule?.전결기준 ?? '',
    rule?.담당표시 ?? '자동',
    rule?.결재라인여부 ?? '사용',
    me?.['직급/직책'] ?? '',
    team,
    staffList
  );

  return (
    <div className="p-6">
      <div className={`${card} print:hidden flex flex-wrap items-center gap-4`}>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <select name="team" defaultValue={team} className={`${input} w-auto`}>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="date" name="weekStart" defaultValue={weekStart} className={`${input} w-auto`} />
          <button type="submit" className={btn}>조회</button>
        </form>
        <PrintButton />
      </div>

      <div className={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>{team} 주간업무계획</h2>
            <div style={{ marginTop: 6, fontSize: 15, color: '#666' }}>{weekStart} 주</div>
          </div>
          <ApprovalBox data={approvalData} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th>날짜</th><th>성명</th><th>업무내용</th></tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', color: '#888' }}>해당 주 등록된 업무가 없습니다.</td></tr>
            ) : tasks.map((t) => (
              <tr key={t.id}>
                <td>{t.날짜}</td>
                <td>{t.성명}</td>
                <td>{t.업무내용}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
