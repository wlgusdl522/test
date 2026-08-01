import type { CSSProperties } from 'react';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getMeetingMeta } from '@/lib/mutate/meeting';
import { getWeeklyTasks } from '@/lib/mutate/weeklyTask';
import { getStaffList } from '@/lib/mutate/staff';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { groupHighlightedTasks } from '@/lib/meetingSummary';
import { btn, card, inputBase } from '@/lib/ui';
import PrintButton from '@/components/print/PrintButton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

const sectionHeader: CSSProperties = {
  background: '#eef1f5',
  fontWeight: 600,
  textAlign: 'center',
  padding: '6px 8px',
  border: '1px solid #d7dbe0',
};
const cell: CSSProperties = { padding: '8px 10px', border: '1px solid #d7dbe0', verticalAlign: 'top' };
const labelCell: CSSProperties = { ...cell, color: '#666', width: 90, fontWeight: 600 };

function SignatureBox() {
  const positions = ['팀장', '부장', '관장'];
  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <tbody>
        <tr>
          {positions.map((p) => (
            <td key={p} style={{ ...cell, textAlign: 'center', width: 70, color: '#666', fontWeight: 600 }}>{p}</td>
          ))}
        </tr>
        <tr>
          {positions.map((p) => (
            <td key={p} style={{ ...cell, height: 60 }} />
          ))}
        </tr>
      </tbody>
    </table>
  );
}

export default async function WeeklyPlanMeetingPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; date?: string }>;
}) {
  const params = await searchParams;
  const [me, teams, staffList] = await Promise.all([
    getViewerStaffRecord(),
    getSimpleList(TEAM_LIST_SHEET_NAME),
    getStaffList(),
  ]);
  const team = params.team ?? me?.소속팀 ?? teams[0] ?? '';
  const date = params.date ?? mondayOf(new Date());
  const weekStart = mondayOf(new Date(`${date}T00:00:00`));

  const [meta, weekTasks] = await Promise.all([getMeetingMeta(team, date), getWeeklyTasks(team, weekStart)]);
  const highlighted = weekTasks.filter((t) => t.회의록후보 === 'TRUE' || t.회의록후보 === 'true');
  const contentLines = groupHighlightedTasks(highlighted);
  const attendeeCount = staffList.filter((s) => s['소속팀'] === team && s['재직상태'] !== '퇴사').length;

  return (
    <div className="p-6">
      <div className={`${card} print:hidden flex flex-wrap items-center gap-4`}>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <select name="team" defaultValue={team} className={`${inputBase} w-auto`}>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="date" name="date" defaultValue={date} className={`${inputBase} w-auto`} />
          <button type="submit" className={btn}>조회</button>
        </form>
        <PrintButton />
      </div>

      <div className="bg-white dark:bg-zinc-900" style={{ maxWidth: 800 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: '#666' }}>{team}</div>
            <h2 style={{ margin: '2px 0 0', fontSize: 22 }}>회의록</h2>
          </div>
          <SignatureBox />
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <tbody>
            <tr><td colSpan={4} style={sectionHeader}>기 본 사 항</td></tr>
            <tr>
              <td style={labelCell}>시간</td>
              <td style={cell}>{meta?.회의시간 || '-'}</td>
              <td style={labelCell}>장소</td>
              <td style={cell}>{meta?.회의장소 || '-'}</td>
            </tr>
            <tr>
              <td style={labelCell}>작성자</td>
              <td style={cell} colSpan={3}>{meta?.작성자명 || '-'}</td>
            </tr>
            <tr>
              <td style={labelCell}>참석자</td>
              <td style={cell} colSpan={3}>총 {attendeeCount}명</td>
            </tr>

            <tr><td colSpan={4} style={sectionHeader}>회 의 내 용</td></tr>
            <tr>
              <td style={labelCell}>내용</td>
              <td style={cell} colSpan={3}>
                {contentLines.length === 0 ? (
                  <span style={{ color: '#999' }}>-</span>
                ) : (
                  contentLines.map((line, i) => (
                    <div key={i} style={{ padding: '2px 0' }}>{i + 1}. {line.name}: {line.label}</div>
                  ))
                )}
              </td>
            </tr>
            <tr>
              <td style={labelCell}>공지사항</td>
              <td style={cell} colSpan={3}>
                {meta?.공지사항 ? meta.공지사항.split('\n').map((l, i) => <div key={i}>{l}</div>) : <span style={{ color: '#999' }}>-</span>}
              </td>
            </tr>
            <tr>
              <td style={labelCell}>휴가 및 일정</td>
              <td style={cell} colSpan={3}>
                {meta?.휴가및일정 ? meta.휴가및일정.split('\n').map((l, i) => <div key={i}>{l}</div>) : <span style={{ color: '#999' }}>-</span>}
              </td>
            </tr>
            <tr>
              <td style={labelCell}>슈퍼비전</td>
              <td style={cell} colSpan={3}>
                {meta?.슈퍼비전 ? meta.슈퍼비전.split('\n').map((l, i) => <div key={i}>{l}</div>) : <span style={{ color: '#999' }}>-</span>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
