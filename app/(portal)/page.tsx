import Link from 'next/link';
import { getMyRecordsSummary } from '@/lib/mutate/dashboard';
import { getWeeklyTasks } from '@/lib/mutate/weeklyTask';
import { getVehicleRequestList } from '@/lib/mutate/vehicleRequest';
import { getMyPendingItemCheckReportApprovals } from '@/lib/mutate/itemCheckReport';
import { getMyPendingVehicleLogApprovals, getVehicleLogList } from '@/lib/mutate/vehicleLog';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { parseLeaveTag } from '@/lib/weeklyLeave';
import { parseAmount } from '@/lib/format';
import { TEAM_ORDER } from '@/lib/teamOrder';
import { hasVehicleUseEnded } from '@/lib/vehicleTimeOverlap';
import { NAV_SECTION_ICON_PATH } from '@/lib/nav';
import { btn, pageFluid } from '@/lib/ui';
import { getDutyWeekdayLogs, getDutySaturdayLogs } from '@/lib/supabase/duty';
import { formatDutyDayLabel } from '@/components/duty/DutyWeeklyLogTable';
import { todayISO } from '@/lib/dutyDate';
import { getGreetingMessages, pickGreetingMessage } from '@/lib/supabase/greetingMessages';
import { getAwayStaff } from '@/lib/supabase/staffStatus';
import AwayToggle from '@/components/home/AwayToggle';
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
  { href: '/vehicles?new=1', label: '차량사용신청', desc: '차량 예약', tone: 'amber', icon: NAV_SECTION_ICON_PATH.차량관리 },
  { href: '/transit-card?new=1', label: '교통카드 사용등록', desc: '교통카드 사용 등록', tone: 'sky', icon: NAV_SECTION_ICON_PATH.차량관리 },
  {
    href: 'https://web-ten-sigma-h3hmsi041o.vercel.app/documents/dashboard',
    label: '공문결재시스템',
    desc: '공문 접수·결재',
    tone: 'rose',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    external: true,
  },
] as const;

const TONE_BADGE: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
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

  const [
    me,
    summary,
    allWeekTasks,
    vehicleRequests,
    vehicleLogs,
    pendingReports,
    pendingLogs,
    weekdayDutyLogs,
    saturdayDutyLogs,
    greetingMessages,
    awayStaff,
  ] = await Promise.all([
    getViewerStaffRecord(),
    getMyRecordsSummary(),
    getWeeklyTasks(null, weekStart),
    getVehicleRequestList(),
    getVehicleLogList(),
    getMyPendingItemCheckReportApprovals(),
    getMyPendingVehicleLogApprovals(),
    getDutyWeekdayLogs(),
    getDutySaturdayLogs(),
    getGreetingMessages(),
    getAwayStaff(),
  ]);

  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
  const viewerEmail = (me?.['이메일(아이디)'] ?? '').toLowerCase();
  const pendingTasks = summary.pendingTasks;

  const today = todayISO();
  const currentYearMonth = today.slice(0, 7);
  const myWeekdayDutyDates = weekdayDutyLogs
    .filter((r) => (r.이메일 ?? '').toLowerCase() === viewerEmail && (r.근무일자 ?? '').startsWith(currentYearMonth))
    .map((r) => r.근무일자)
    .sort()
    .map((d) => formatDutyDayLabel(d));
  const mySaturdayDutyDates = saturdayDutyLogs
    .filter(
      (r) =>
        ((r.이메일1 ?? '').toLowerCase() === viewerEmail || (r.이메일2 ?? '').toLowerCase() === viewerEmail) &&
        (r.근무일자 ?? '').startsWith(currentYearMonth)
    )
    .map((r) => r.근무일자)
    .sort()
    .map((d) => formatDutyDayLabel(d));

  const todayWeekdayDuty = weekdayDutyLogs.find(
    (r) => r.근무일자 === today && (r.이메일 ?? '').toLowerCase() === viewerEmail
  );
  const todaySaturdayDuty = saturdayDutyLogs.find(
    (r) =>
      r.근무일자 === today &&
      ((r.이메일1 ?? '').toLowerCase() === viewerEmail || (r.이메일2 ?? '').toLowerCase() === viewerEmail)
  );
  const todayDutyLogHref = todayWeekdayDuty
    ? `/duty/log/weekday/${todayWeekdayDuty.id}`
    : todaySaturdayDuty
      ? `/duty/log/saturday/${todaySaturdayDuty.id}`
      : null;

  const greetingMessage = pickGreetingMessage(greetingMessages, now) || '오늘도 수고 많으세요';
  const myAwayStatus = awayStaff.find((a) => a.이메일.toLowerCase() === viewerEmail);

  const leaveByDate = new Map<string, { primary: string; secondary?: string }[]>();
  const leaveByTeamDate = new Map<string, { primary: string; secondary?: string; highlight: true }[]>();
  allWeekTasks.forEach((t) => {
    const tag = parseLeaveTag(t.업무내용);
    if (!tag) return;
    const list = leaveByDate.get(t.날짜) ?? [];
    list.push({ primary: tag.name, secondary: tag.type });
    leaveByDate.set(t.날짜, list);

    const teamKey = `${t.소속팀}|${t.날짜}`;
    const teamList = leaveByTeamDate.get(teamKey) ?? [];
    teamList.push({ primary: `${tag.name} · ${tag.type}`, highlight: true });
    leaveByTeamDate.set(teamKey, teamList);
  });

  const awayByTeam = new Map<string, { primary: string; secondary?: string; highlight: true }[]>();
  awayStaff.forEach((a) => {
    const list = awayByTeam.get(a.소속팀) ?? [];
    list.push({ primary: `${a.성명} 부재중`, secondary: a.사유, highlight: true });
    awayByTeam.set(a.소속팀, list);

    const todayList = leaveByDate.get(today) ?? [];
    todayList.push({ primary: a.성명, secondary: '외근' });
    leaveByDate.set(today, todayList);
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
      title: '금주 휴가·출장·외근현황',
      emptyText: '이번 주 등록된 휴가·출장·외근이 없습니다.',
      days: dayDates.map((iso, i) => ({ iso, label: dayLabel(iso, i), items: leaveByDate.get(iso) ?? [] })),
    },
  ];

  const inspectionIncomplete = pendingTasks.filter((t) => t.status === '사진필요' || t.status === '조서필수');
  const myWeekTasks = allWeekTasks.filter((t) => (t['이메일(아이디)'] ?? '').toLowerCase() === viewerEmail);

  // 내 차량예약현황 — 최근(지난 7일)부터 담주까지(다음 14일) 내 예약만, 최대 10건.
  // 사용 시간이 지났는데 운행일지가 없으면 바로 작성하러 갈 수 있게 링크를 건다.
  const nextWeekEndIso = (() => {
    const d = new Date(now);
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  })();
  const recentStartIso = (() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  })();
  const myLogByRequestId = new Map(vehicleLogs.filter((l) => l.신청ID).map((l) => [l.신청ID, l]));
  const myVehicleItems = vehicleRequests
    .filter((r) => (r.신청자이메일 ?? '').toLowerCase() === viewerEmail)
    .filter((r) => r.사용일자 >= recentStartIso && r.사용일자 <= nextWeekEndIso)
    .sort((a, b) => a.사용일자.localeCompare(b.사용일자) || (a.출발시간 || '').localeCompare(b.출발시간 || ''))
    .slice(0, 10)
    .map((r) => {
      const hasLog = myLogByRequestId.has(r.id);
      const ended = hasVehicleUseEnded(r.사용일자, r.복귀시간);
      return {
        title: `${r.사용일자.slice(5)} · ${r.차량번호} · ${r.목적}`,
        meta: hasLog ? '작성완료' : ended ? '일지작성 필요' : '예약됨',
        href: !hasLog && ended ? `/vehicles/logs?requestId=${r.id}#log-form` : '/vehicles/requests',
      };
    });

  const dayColumnLabels = dayDates.map((iso, i) => dayLabel(iso, i));
  const myWeekGridRow = {
    label: me?.성명 || '내 업무',
    cells: dayDates.map((iso) => [
      ...myWeekTasks.filter((t) => t.날짜 === iso).map((t) => ({ primary: t.업무내용 })),
      ...(iso === today && myAwayStatus ? [{ primary: `부재중 · ${myAwayStatus.사유}`, highlight: true as const }] : []),
    ]),
  };

  // 전체 팀 취합 — 세로축 팀 × 가로축 요일로 된 캘린더 표. 회의록 후보로 표시한 업무만 보여준다.
  // 이번 주에 올라온 업무가 없는 팀도 항상 행으로 보이도록 팀 목록은 데이터가 아니라 고정 순서에서 가져온다.
  const meetingTeamTasks = allWeekTasks.filter(
    (t) => !parseLeaveTag(t.업무내용) && (t.회의록후보 === 'TRUE' || t.회의록후보 === 'true')
  );
  const activeTeams = TEAM_ORDER.filter((t) => t !== '미배정');
  const teamGridRows = activeTeams.map((team) => ({
    label: team,
    cells: dayDates.map((iso) => [
      ...meetingTeamTasks.filter((t) => t.날짜 === iso && t.소속팀 === team).map((t) => ({ primary: t.업무내용 })),
      ...(leaveByTeamDate.get(`${team}|${iso}`) ?? []),
      ...(iso === today ? (awayByTeam.get(team) ?? []) : []),
    ]),
  }));

  const listSlides: ListSlide[] = [
    {
      kind: 'split',
      title: '검수 미완료 건 · 내 차량예약현황',
      emptyText: '',
      left: {
        title: '검수 미완료 건',
        emptyText: '검수 미완료 건이 없습니다.',
        viewAllHref: '/expenses/mine',
        items: inspectionIncomplete.map((t) => ({
          title: t.title,
          meta: `${t.date} · ${t.status}`,
          href: t.status === '사진필요' ? `/expenses/mine?photoFor=${t.id}&all=1` : `/expenses/mine?reportFor=${t.id}&all=1`,
        })),
      },
      right: {
        title: '내 차량예약현황',
        emptyText: '최근~다음주 등록된 차량 예약이 없습니다.',
        viewAllHref: '/vehicles/requests',
        items: myVehicleItems,
      },
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
      kind: 'grid',
      title: '이번주 내 주간업무계획',
      emptyText: '이번 주 등록한 업무가 없습니다.',
      columns: dayColumnLabels,
      rows: [myWeekGridRow],
      rowHeight: 360,
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
            {me?.['직급/직책'] ? ` ${me['직급/직책']}` : ''}님, <span className="text-brand">{greetingMessage}</span>
          </h1>

          <div className="mt-5 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:border-zinc-800 dark:bg-zinc-900">
            <Link href="/duty" className="block">
              <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />내 당직일자 (이번 달)
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {myWeekdayDutyDates.length > 0 ? myWeekdayDutyDates.join(', ') : '없음'}
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />토요당직 (이번 달)
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {mySaturdayDutyDates.length > 0 ? mySaturdayDutyDates.join(', ') : '없음'}
              </p>
            </Link>
            {todayDutyLogHref && (
              <Link href={todayDutyLogHref} className={`${btn} mt-3 w-fit`}>
                오늘 당직 · 당직일지 작성하기
              </Link>
            )}
            <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />부재중 표시
              </p>
              <AwayToggle initialAway={!!myAwayStatus} initialReason={myAwayStatus?.사유} />
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 rounded-xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-zinc-900">
          <ScheduleSlideshow slides={scheduleSlides} />
        </div>
      </div>

      <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-zinc-500">바로가기</p>
      <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {SHORTCUTS.map((s) => {
          const cardClassName =
            'flex items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900';
          const cardContent = (
            <>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_BADGE[s.tone]}`}>
                <ShortcutIcon d={s.icon} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">{s.label}</span>
                <span className="block truncate text-xs text-zinc-500">{s.desc}</span>
              </span>
            </>
          );

          if ('external' in s && s.external) {
            return (
              <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" className={cardClassName}>
                {cardContent}
              </a>
            );
          }

          return (
            <Link key={s.href} href={s.href} className={cardClassName}>
              {cardContent}
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <ListSlideshow slides={listSlides} />
      </div>
    </main>
  );
}
