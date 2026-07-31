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
import { btn, card, input, inputBase, table, td, th } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토'];

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

  const roster = staffList.filter((s) => s['소속팀'] === team && s['재직상태'] !== '퇴사');

  const monday = new Date(`${weekStart}T00:00:00`);
  const dayDates: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    dayDates.push(d.toISOString().slice(0, 10));
  }
  const saturday = new Date(dayDates[5]);

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
          <select name="team" defaultValue={team} className={`${inputBase} w-auto`}>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="date" name="weekStart" defaultValue={weekStart} className={`${inputBase} w-auto`} />
          <button type="submit" className={btn}>조회</button>
        </form>
        <PrintButton />
      </div>

      <div className="bg-white dark:bg-zinc-900">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>{team} 주간업무계획</h2>
            <div style={{ marginTop: 6, fontSize: 14, color: '#666' }}>
              ● 기간: {monday.getFullYear()}. {monday.getMonth() + 1}. {monday.getDate()} ~ {saturday.getFullYear()}. {saturday.getMonth() + 1}. {saturday.getDate()}.
            </div>
          </div>
          <ApprovalBox data={approvalData} />
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #d7dbe0', borderRadius: 6 }}>
          <table className={table}>
            <colgroup>
              <col style={{ width: '13%' }} />
              {dayDates.map((iso) => <col key={iso} style={{ width: `${(87 / dayDates.length).toFixed(2)}%` }} />)}
            </colgroup>
            <thead>
              <tr>
                <th className={th}>성명</th>
                {dayDates.map((iso, i) => {
                  const d = new Date(`${iso}T00:00:00`);
                  return <th key={iso} className={th}>{WEEKDAY_LABELS[i]} ({d.getMonth() + 1}/{d.getDate()})</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {roster.length === 0 ? (
                <tr><td className={td} colSpan={7} style={{ textAlign: 'center', color: '#888' }}>해당 팀에 재직 중인 직원이 없습니다.</td></tr>
              ) : roster.map((r) => {
                const email = r['이메일(아이디)'];
                const isLead = ['과장', '팀장'].includes(r['직급/직책']);
                return (
                  <tr key={email}>
                    <td className={td}>
                      <b>{r['성명']}</b>
                      {isLead && <><br /><span style={{ fontSize: 11.5, color: '#888' }}>{r['직급/직책']}</span></>}
                    </td>
                    {dayDates.map((iso) => {
                      const dayTasks = tasks.filter((t) => t['이메일(아이디)'] === email && t['날짜'] === iso);
                      return (
                        <td key={iso} className={td}>
                          {dayTasks.map((t, i) => <div key={i}>• {t['업무내용']}</div>)}
                        </td>
                      );
                    })}
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
