import Link from 'next/link';
import { getMyApprovalCount, getMyRecordsSummary } from '@/lib/mutate/dashboard';
import { getWeeklyTasks } from '@/lib/mutate/weeklyTask';
import { getVehicleRequestList } from '@/lib/mutate/vehicleRequest';
import { getMyPendingItemCheckReportApprovals } from '@/lib/mutate/itemCheckReport';
import { getMyPendingVehicleLogApprovals } from '@/lib/mutate/vehicleLog';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { parseLeaveTag } from '@/lib/weeklyLeave';
import { parseAmount } from '@/lib/format';
import { teamRank } from '@/lib/teamOrder';
import { NAV_SECTION_ICON_PATH } from '@/lib/nav';
import { pageFluid, statCard } from '@/lib/ui';
import ScheduleSlideshow, { type ScheduleSlide } from '@/components/home/ScheduleSlideshow';
import ListSlideshow, { type ListSlide } from '@/components/home/ListSlideshow';

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

function dayLabel(iso: string, weekdayIndex: number): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_LABELS[weekdayIndex]})`;
}

const SHORTCUTS = [
  { href: '/weekly-plan', label: '주간업무', desc: '이번 주 업무 입력', tone: 'blue', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { href: '/expenses', label: '카드사용대장', desc: '지출 등록', tone: 'emerald', icon: NAV_SECTION_ICON_PATH.지출관리 },
  { href: '/vehicles/requests', label: '차량사용신청', desc: '차량 예약', tone: 'amber', icon: NAV_SECTION_ICON_PATH.차량관리 },
  { href: '/staff/directory', label: '전직원 주소록', desc: '연락처 찾기', tone: 'violet', icon: NAV_SECTION_ICON_PATH.인사관리 },
  { href: '/mypage', label: '내 결재함', desc: '결재 대기 확인', tone: 'cyan', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
] as const;

const TONE_BADGE: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
  cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400',
};

function ShortcutIcon({ d, className = 'h-4 w-4' }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default async function HomePage() {
  const now = new Date();
  const weekStart = mondayOf(now);
  const monday = new Date(`${weekStart}T00:00:00`);
  const dayDates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const [me, summary, approvalCount, allWeekTasks, vehicleRequests, pendingReports, pendingLogs] = await Promise.all([
    getViewerStaffRecord(),
    getMyRecordsSummary(),
    getMyApprovalCount(),
    getWeeklyTasks(null, weekStart),
    getVehicleRequestList(),
    getMyPendingItemCheckReportApprovals(),
    getMyPendingVehicleLogApprovals(),
  ]);

  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
  const viewerEmail = (me?.['이메일(아이디)'] ?? '').toLowerCase();
  const pendingTasks = summary.pendingTasks;

  const stats = [
    { label: '내 결재 대기', value: approvalCount, href: '/mypage' },
    { label: '최근 지출 등록', value: summary.cardLedger.length, href: '/expenses' },
    { label: '최근 차량신청', value: summary.vehicleRequest.length, href: '/vehicles/requests' },
  ];

  const leaveByDate = new Map<string, { primary: string; secondary?: string }[]>();
  allWeekTasks.forEach((t) => {
    const tag = parseLeaveTag(t.업무내용);
    if (!tag) return;
    const list = leaveByDate.get(t.날짜) ?? [];
    list.push({ primary: tag.name, secondary: tag.type });
    leaveByDate.set(t.날짜, list);
  });

  const dayDateSet = new Set(dayDates);
  const vehicleByDate = new Map<string, { primary: string; secondary?: string }[]>();
  vehicleRequests.forEach((r) => {
    if (!dayDateSet.has(r.사용일자)) return;
    const list = vehicleByDate.get(r.사용일자) ?? [];
    list.push({ primary: r.차량번호, secondary: [r.목적, r.신청자명].filter(Boolean).join(' · ') });
    vehicleByDate.set(r.사용일자, list);
  });

  const scheduleSlides: ScheduleSlide[] = [
    {
      title: '차량 예약',
      emptyText: '이번 주 등록된 차량 예약이 없습니다.',
      days: dayDates.map((iso, i) => ({ iso, label: dayLabel(iso, i), items: vehicleByDate.get(iso) ?? [] })),
    },
    {
      title: '복지관 일정 (휴가 현황)',
      emptyText: '이번 주 등록된 휴가가 없습니다.',
      days: dayDates.map((iso, i) => ({ iso, label: dayLabel(iso, i), items: leaveByDate.get(iso) ?? [] })),
    },
  ];

  const inspectionIncomplete = pendingTasks.filter((t) => t.status === '사진필요' || t.status === '조서필수');
  const myWeekTasks = allWeekTasks.filter((t) => (t['이메일(아이디)'] ?? '').toLowerCase() === viewerEmail);

  // 전체 팀 취합 — 세로축 팀 × 가로축 요일로 된 캘린더 표. 휴가 태그는 위 슬라이드에 이미 있으니 제외.
  const nonLeaveTeamTasks = allWeekTasks.filter((t) => !parseLeaveTag(t.업무내용));
  const activeTeams = Array.from(new Set(nonLeaveTeamTasks.map((t) => t.소속팀)))
    .filter(Boolean)
    .sort((a, b) => teamRank(a) - teamRank(b));
  const dayColumnLabels = dayDates.map((iso, i) => dayLabel(iso, i));
  const teamGridRows = activeTeams.map((team) => ({
    label: team,
    cells: dayDates.map((iso) =>
      nonLeaveTeamTasks
        .filter((t) => t.날짜 === iso && t.소속팀 === team)
        .map((t) => ({ primary: t.성명, secondary: t.업무내용 }))
    ),
  }));

  const listSlides: ListSlide[] = [
    {
      title: '검수 미완료 건',
      emptyText: '검수 미완료 건이 없습니다.',
      viewAllHref: '/expenses/mine',
      items: inspectionIncomplete.map((t) => ({ title: t.title, meta: `${t.date} · ${t.status}` })),
    },
    {
      title: '결재 대기 건',
      emptyText: '결재 대기 중인 건이 없습니다.',
      viewAllHref: '/mypage',
      items: [
        ...pendingReports.map((r) => ({
          title: `${r.품명} · ${parseAmount(r.금액).toLocaleString()}원`,
          meta: `물품검수조서 · ${r.현재결재단계}`,
        })),
        ...pendingLogs.map((r) => ({ title: `${r.차량번호} · ${r.목적}`, meta: `차량운행일지 · ${r.현재결재단계}` })),
      ],
    },
    {
      title: '이번주 내 주간업무계획',
      emptyText: '이번 주 등록한 업무가 없습니다.',
      viewAllHref: '/weekly-plan',
      items: myWeekTasks.map((t) => ({ title: t.업무내용, meta: t.날짜 })),
    },
    {
      kind: 'grid',
      title: '전체 팀 주간업무 취합',
      emptyText: '이번 주 등록된 업무가 없습니다.',
      columns: dayColumnLabels,
      rows: teamGridRows,
    },
  ];

  return (
    <main className={pageFluid}>
      <div className="mb-8 flex flex-wrap items-start gap-6 rounded-2xl bg-gradient-to-br from-brand-tint to-white p-8 dark:from-brand-tint/10 dark:to-transparent">
        <div className="max-w-md shrink-0">
          <p className="mb-2 text-xs font-semibold text-brand">서대문노인종합복지관 업무포털 · {monthLabel}</p>
          <h1 className="text-2xl font-bold leading-snug text-zinc-900 dark:text-zinc-100">
            {me?.성명 ?? ''}
            {me?.['직급/직책'] ? ` ${me['직급/직책']}` : ''}님, 오늘도 <span className="text-brand">수고 많으세요</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            처리할 일 {pendingTasks.length}건, 결재 대기 {approvalCount}건이 있어요.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <Link key={s.label} href={s.href} className={statCard}>
                <p className="text-xs font-medium text-zinc-500">{s.label}</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{s.value}</p>
                <p className="mt-0.5 text-xs text-zinc-400">건</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 rounded-xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-zinc-900">
          <ScheduleSlideshow slides={scheduleSlides} />
        </div>
      </div>

      <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-zinc-500">바로가기</p>
      <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_BADGE[s.tone]}`}>
              <ShortcutIcon d={s.icon} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">{s.label}</span>
              <span className="block truncate text-xs text-zinc-500">{s.desc}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <ListSlideshow slides={listSlides} />
      </div>
    </main>
  );
}
