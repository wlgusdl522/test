import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getMeetingMeta } from '@/lib/mutate/meeting';
import { getWeeklyTasks } from '@/lib/mutate/weeklyTask';
import { getStaffList } from '@/lib/mutate/staff';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { summarizeLeaveEntries } from '@/lib/weeklyLeave';
import { groupHighlightedTasksByCategory } from '@/lib/meetingSummary';
import { resolveApprovalLineLabels } from '@/lib/approval/approvalLine';
import { hasPageAccess } from '@/lib/mutate/permissions';
import { btnSecondary, inputBase } from '@/lib/ui';
import MeetingComposer from '@/components/weekly/MeetingComposer';
import PrinterIcon from '@/components/icons/PrinterIcon';
import PageAccessDenied from '@/components/PageAccessDenied';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default async function MeetingPage({
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

  if (!(await hasPageAccess('weekly-plan-meeting'))) {
    return <PageAccessDenied />;
  }

  const [meta, weekStart] = [await getMeetingMeta(team, date), mondayOf(new Date(date))];
  const weekTasks = await getWeeklyTasks(team, weekStart);
  const highlightedTasks = weekTasks.filter((t) => t.회의록후보 === 'TRUE' || t.회의록후보 === 'true');
  const leaveSuggestion = summarizeLeaveEntries(weekTasks);
  const attendeeCount = staffList.filter((s) => s['소속팀'] === team && s['재직상태'] !== '퇴사').length;
  const signaturePositions = resolveApprovalLineLabels(['과장', '부장', '관장'], team, staffList);

  return (
    <>
      <div className="flex items-center justify-end mb-2">
        <a href={`/print/weekly-plan-meeting?team=${encodeURIComponent(team)}&date=${date}`} target="_blank" className={btnSecondary}>
          <PrinterIcon />
          회의록 인쇄
        </a>
      </div>

      <form method="get" className="flex gap-2 mb-6">
        <select name="team" defaultValue={team} className={`${inputBase} w-auto`}>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" name="date" defaultValue={date} className={`${inputBase} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      <MeetingComposer
        team={team}
        date={date}
        writerName={me?.성명 ?? ''}
        attendeeCount={attendeeCount}
        signaturePositions={signaturePositions}
        contentSections={groupHighlightedTasksByCategory(highlightedTasks, staffList)}
        initialTime={meta?.회의시간 ?? ''}
        initialPlace={meta?.회의장소 ?? ''}
        initialNotice={meta?.공지사항 ?? ''}
        initialLeave={meta?.휴가및일정 || leaveSuggestion}
        initialSupervision={meta?.슈퍼비전 ?? ''}
      />
    </>
  );
}
