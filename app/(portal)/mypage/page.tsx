import Link from 'next/link';
import { getMyRecordsSummary } from '@/lib/mutate/dashboard';
import { getMyPendingItemCheckReportApprovals } from '@/lib/mutate/itemCheckReport';
import { getMyPendingVehicleLogApprovals } from '@/lib/mutate/vehicleLog';
import { getMyPendingCertificateApprovals } from '@/lib/supabase/certificate';
import { getDutyWeekdayLogs, getDutySaturdayLogs } from '@/lib/supabase/duty';
import { formatDutyDayLabel } from '@/components/duty/DutyWeeklyLogTable';
import { todayISO } from '@/lib/dutyDate';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { btn, btnDanger, card, cardTableWrap, h1, h2, inputBase, pageFluid, tableClean, tdClean, thClean, trHoverClean } from '@/lib/ui';
import { actOnItemCheckReportAction } from '@/app/(portal)/expenses/reports/actions';
import { actOnVehicleLogAction } from '@/app/(portal)/vehicles/logs/actions';
import { actOnCertificateAction } from '@/app/(portal)/staff/certificates/actions';
import MyPageTabs from '@/components/mypage/MyPageTabs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TaskItem = { key: string; title: string; meta: string; href: string };

function ApprovalActions({ actionFn, id }: { actionFn: (formData: FormData) => Promise<void>; id: string }) {
  return (
    <>
      <form action={actionFn}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="action" value="승인" />
        <button type="submit" className={btn}>승인</button>
      </form>
      <form action={actionFn} className="flex items-center gap-1">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="action" value="반려" />
        <input name="comment" placeholder="반려 사유" className={`${inputBase} w-24 text-xs`} />
        <button type="submit" className={btnDanger}>반려</button>
      </form>
    </>
  );
}

// 업무탭 2x2 카드 하나(제목 + 건수 + 미리보기 목록). '미정' 카드처럼 목록이 없는 경우는
// items 없이 children으로 안내 문구만 채워서 쓴다.
function TaskGridCard({
  title,
  count,
  items,
  emptyText,
  children,
}: {
  title: string;
  count?: number;
  items?: TaskItem[];
  emptyText?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`${card} mb-0 flex flex-col`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-zinc-800 dark:text-zinc-100">{title}</h3>
        {typeof count === 'number' && (
          <span className={`text-lg font-bold ${count > 0 ? 'text-brand' : 'text-zinc-300 dark:text-zinc-600'}`}>{count}</span>
        )}
      </div>
      {children ?? (
        <ul className="flex flex-col gap-1">
          {(items ?? []).slice(0, 4).map((t) => (
            <li key={t.key}>
              <Link href={t.href} className="block truncate rounded-md px-1.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800">
                <span className="text-zinc-400">{t.meta} · </span>{t.title}
              </Link>
            </li>
          ))}
          {(items ?? []).length === 0 && <li className="px-1.5 py-1 text-xs text-zinc-400">{emptyText}</li>}
        </ul>
      )}
    </div>
  );
}

export default async function MyPage() {
  const [
    summary, pendingReports, pendingLogs, pendingCertificates, me,
    weekdayDutyLogs, saturdayDutyLogs,
  ] = await Promise.all([
    getMyRecordsSummary(),
    getMyPendingItemCheckReportApprovals(),
    getMyPendingVehicleLogApprovals(),
    getMyPendingCertificateApprovals(),
    getViewerStaffRecord(),
    getDutyWeekdayLogs(),
    getDutySaturdayLogs(),
  ]);

  const viewerEmail = (me?.['이메일(아이디)'] ?? '').toLowerCase();
  const today = todayISO();

  // 결재필요: 증명서발급 + 물품검수(조서) 결재단계에 있는 건만 (차량운행일지 결재는 제외 — 아래 내 결재함에서는 계속 처리 가능)
  const approvalItems: TaskItem[] = [
    ...pendingReports.map((r) => ({
      key: `report-${r.id}`, title: `${r.품명} · ${Number(r.금액 || 0).toLocaleString()}원`,
      meta: `물품검수조서 · ${r.현재결재단계}`, href: '#approvals',
    })),
    ...pendingCertificates.map((r) => ({
      key: `cert-${r.id}`, title: `${r.종류} · ${r.대상자성명}`,
      meta: `증명서발급 · ${r.현재결재단계}`, href: '#approvals',
    })),
  ];

  // 검수필요: 카드사용내역 중 물품검수(사진)/조서를 아직 완료하지 않은 내역
  const inspectionItems: TaskItem[] = summary.pendingTasks
    .filter((t) => t.section === 'cardLedger' && (t.status === '사진필요' || t.status === '조서필수'))
    .map((t) => ({
      key: `inspection-${t.id}-${t.status}`, title: t.title, meta: `${t.date} · ${t.status}`,
      href: t.status === '사진필요' ? `/expenses/mine?photoFor=${t.id}&all=1` : `/expenses/mine?reportFor=${t.id}&all=1`,
    }));

  // 일지작성: 차량운행일지 미작성 + 당직근무일지 미작성(근무일이 지났는데 아직 서명 안 한 배정)
  const myUnsignedWeekdayDuty = weekdayDutyLogs.filter(
    (r) => (r.이메일 ?? '').toLowerCase() === viewerEmail && r.근무일자 <= today && !r.사인
  );
  const myUnsignedSaturdayDuty = saturdayDutyLogs.filter((r) => {
    const slot1 = (r.이메일1 ?? '').toLowerCase() === viewerEmail && !r.사인1;
    const slot2 = (r.이메일2 ?? '').toLowerCase() === viewerEmail && !r.사인2;
    return (slot1 || slot2) && r.근무일자 <= today;
  });
  const logItems: TaskItem[] = [
    ...summary.pendingTasks
      .filter((t) => t.status === '운행일지 미작성')
      .map((t) => ({ key: `vehiclelog-${t.id}`, title: t.title, meta: `${t.date} · 차량운행일지`, href: `/vehicles/logs?requestId=${t.id}#log-form` })),
    ...myUnsignedWeekdayDuty.map((r) => ({
      key: `duty-weekday-${r.id}`, title: '당직근무일지', meta: `${formatDutyDayLabel(r.근무일자)} · 평일당직`,
      href: `/duty/log/weekday/${r.id}`,
    })),
    ...myUnsignedSaturdayDuty.map((r) => ({
      key: `duty-saturday-${r.id}`, title: '당직근무일지', meta: `${formatDutyDayLabel(r.근무일자)} · 토요당직`,
      href: `/duty/log/saturday/${r.id}`,
    })),
  ];

  // 위 4개 카드에 안 잡히는 반려/주유필요 등은 기타 목록으로 놓쳐서 묻히지 않게 그대로 노출.
  const otherTasks = summary.pendingTasks.filter((t) =>
    ['반려', '조서반려', '운행일지 반려', '주유필요'].includes(t.status)
  );

  const approvalRows = [
    ...pendingReports.map((r) => ({
      key: `report-${r.id}`, label: '물품검수조서',
      content: `${r.품명} · ${Number(r.금액 || 0).toLocaleString()}원`,
      step: r.현재결재단계, actionFn: actOnItemCheckReportAction, id: r.id,
    })),
    ...pendingLogs.map((r) => ({
      key: `log-${r.id}`, label: '차량운행일지',
      content: `${r.차량번호} · ${r.목적}`,
      step: r.현재결재단계, actionFn: actOnVehicleLogAction, id: r.id,
    })),
    ...pendingCertificates.map((r) => ({
      key: `cert-${r.id}`, label: '증명서 발급',
      content: `${r.종류} · ${r.대상자성명}`,
      step: r.현재결재단계, actionFn: actOnCertificateAction, id: r.id,
    })),
  ];

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>마이페이지</h1>
      <MyPageTabs />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TaskGridCard title="결재필요" count={approvalItems.length} items={approvalItems} emptyText="결재 대기 중인 건이 없습니다." />
        <TaskGridCard title="미정">
          <p className="px-1.5 py-1 text-xs text-zinc-400">아직 준비중인 기능입니다.</p>
        </TaskGridCard>
        <TaskGridCard title="검수필요" count={inspectionItems.length} items={inspectionItems} emptyText="검수가 필요한 내역이 없습니다." />
        <TaskGridCard title="일지작성" count={logItems.length} items={logItems} emptyText="작성할 일지가 없습니다." />
      </div>

      {otherTasks.length > 0 && (
        <>
          <h2 className={h2}>기타 처리할 일</h2>
          <ul className="mb-6 flex flex-col gap-1">
            {otherTasks.map((t) => (
              <li key={`${t.section}-${t.id}-${t.status}`} className="text-sm text-zinc-700 dark:text-zinc-300">
                [{t.status}] {t.date} · {t.title}
              </li>
            ))}
          </ul>
        </>
      )}

      {approvalRows.length > 0 && (
        <div id="approvals">
          <h2 className={h2}>내 결재함</h2>
          {/* 모바일: 표는 칸이 너무 좁아져서 대신 카드 목록으로 보여준다 */}
          <div className="flex flex-col gap-2 sm:hidden">
            {approvalRows.map((row) => (
              <div key={row.key} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{row.label}</span>
                  <span className="text-xs text-zinc-400">{row.step}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{row.content}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <ApprovalActions actionFn={row.actionFn} id={row.id} />
                </div>
              </div>
            ))}
          </div>

          {/* 데스크톱: 기존 표 레이아웃 유지 */}
          <div className={`hidden sm:block ${cardTableWrap}`}><table className={tableClean}>
            <thead>
              <tr><th className={thClean}>구분</th><th className={thClean}>내용</th><th className={thClean}>단계</th><th className={thClean}></th></tr>
            </thead>
            <tbody>
              {approvalRows.map((row) => (
                <tr key={row.key} className={trHoverClean}>
                  <td className={tdClean}>{row.label}</td>
                  <td className={tdClean}>{row.content}</td>
                  <td className={tdClean}>{row.step}</td>
                  <td className={`${tdClean} flex items-center gap-1.5`}>
                    <ApprovalActions actionFn={row.actionFn} id={row.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </main>
  );
}
