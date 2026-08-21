import { hasPageAccess } from '@/lib/mutate/permissions';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import PageAccessDenied from '@/components/PageAccessDenied';
import {
  AGENDA_STATUSES,
  canSeeRealProposerName,
  displayedProposerName,
  getAllAgendaItems,
  getMeetings,
  isLaborCouncilMember,
  parseRoundNumber,
  type AgendaStatus,
} from '@/lib/mutate/laborCouncil';
import LaborCouncilTabs from '@/components/laborCouncil/LaborCouncilTabs';
import {
  badgeBase, badgeTone, btnDanger, btnOutline, btnSecondary, h1, inputBase, pageFluid,
  table, tableWrap, td, th, trZebraHover,
} from '@/lib/ui';
import { deleteAgendaItemAction, updateAgendaStatusAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<AgendaStatus, keyof typeof badgeTone> = {
  접수: 'gray',
  검토중: 'blue',
  상정예정: 'amber',
  협의완료: 'green',
  결과공유: 'gray',
};

const UNASSIGNED_ROUND = '__unassigned__';

function meetingDateLabel(회의일시: string): string {
  if (!회의일시) return '일시 미정';
  return 회의일시.slice(0, 10).replace(/-/g, '.');
}

function statusUrl(status: AgendaStatus | null, round: string | null): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (round) params.set('round', round);
  const qs = params.toString();
  return `/labor-council/status${qs ? `?${qs}` : ''}`;
}

export default async function LaborCouncilStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; round?: string }>;
}) {
  if (!(await hasPageAccess('labor-council'))) return <PageAccessDenied />;

  const me = await getViewerStaffRecord();
  const email = me?.['이메일(아이디)'] ?? '';
  const [allItems, isCouncil, canSeeRealName, meetings] = await Promise.all([
    getAllAgendaItems(),
    isLaborCouncilMember(email),
    canSeeRealProposerName(email),
    getMeetings(),
  ]);

  const { status: statusParam, round: roundParam } = await searchParams;
  const filterStatus = (AGENDA_STATUSES as string[]).includes(statusParam ?? '') ? (statusParam as AgendaStatus) : null;
  const filterRound = roundParam || null;

  const rounds = [...new Set(allItems.map((i) => i.상정회차).filter(Boolean))].sort(
    (a, b) => parseRoundNumber(b) - parseRoundNumber(a)
  );
  const unassignedCount = allItems.filter((i) => !i.상정회차).length;

  let items = filterStatus ? allItems.filter((i) => i.상태 === filterStatus) : allItems;
  if (filterRound === UNASSIGNED_ROUND) items = items.filter((i) => !i.상정회차);
  else if (filterRound) items = items.filter((i) => i.상정회차 === filterRound);

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>인사관리 &gt; 노사협의회</h1>
      <LaborCouncilTabs />

      <div className="mb-2 flex flex-wrap gap-2">
        <a href={statusUrl(null, filterRound)} className={!filterStatus ? btnSecondary : btnOutline}>
          전체 {allItems.length}
        </a>
        {AGENDA_STATUSES.map((s) => (
          <a key={s} href={statusUrl(s, filterRound)} className={filterStatus === s ? btnSecondary : btnOutline}>
            {s} {allItems.filter((i) => i.상태 === s).length}
          </a>
        ))}
      </div>

      {rounds.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <a href={statusUrl(filterStatus, null)} className={!filterRound ? btnSecondary : btnOutline}>
            전체 회차
          </a>
          {rounds.map((r) => (
            <a key={r} href={statusUrl(filterStatus, r)} className={filterRound === r ? btnSecondary : btnOutline}>
              제{r}차 {allItems.filter((i) => i.상정회차 === r).length}
            </a>
          ))}
          {unassignedCount > 0 && (
            <a
              href={statusUrl(filterStatus, UNASSIGNED_ROUND)}
              className={filterRound === UNASSIGNED_ROUND ? btnSecondary : btnOutline}
            >
              회차 미배정 {unassignedCount}
            </a>
          )}
        </div>
      )}

      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>제목</th>
              <th className={th}>제안자</th>
              <th className={th}>등록일</th>
              <th className={th}>상태</th>
              {isCouncil && <th className={th}>상정 회차</th>}
              {isCouncil && <th className={th}>관리</th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td className={td} colSpan={isCouncil ? 6 : 4}>등록된 안건이 없습니다.</td></tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className={trZebraHover}>
                <td className={td}>
                  <div className="font-medium">{item.항목명 || '(제목 없음)'}</div>
                  <div className="mt-0.5 whitespace-pre-wrap text-xs text-zinc-500 dark:text-zinc-400">{item.제안내용}</div>
                </td>
                <td className={td}>{displayedProposerName(item, canSeeRealName)}</td>
                <td className={td}>{item.등록일시.slice(0, 10)}</td>
                <td className={td}>
                  <span className={`${badgeBase} ${badgeTone[STATUS_TONE[item.상태]]}`}>{item.상태}</span>
                </td>
                {isCouncil && (
                  <>
                    <td className={td}>
                      {/* 시각적 내용 없는 form을 이 셀 안에 두고, 옆 셀의 select/button은
                          form 속성(문서 전체에서 id로 소속시킬 수 있음)으로 여기에 연결한다 —
                          <tr> 밑에 <form>을 바로 두면 잘못된 HTML이 되므로 반드시 <td> 안에 둔다. */}
                      <form action={updateAgendaStatusAction} id={`status-form-${item.id}`}>
                        <input type="hidden" name="id" value={item.id} />
                      </form>
                      <select
                        name="상정회차"
                        form={`status-form-${item.id}`}
                        defaultValue={item.상정회차}
                        className={`${inputBase} w-auto`}
                      >
                        <option value="">미배정</option>
                        {meetings.map((m) => (
                          <option key={m.회차} value={m.회차}>
                            제{m.회차}차 · {meetingDateLabel(m.회의일시)} ({m.상태})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-1.5">
                        <select name="상태" form={`status-form-${item.id}`} defaultValue={item.상태} className={`${inputBase} w-auto`}>
                          {AGENDA_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button type="submit" form={`status-form-${item.id}`} className={btnSecondary}>저장</button>
                      </div>
                      <form action={deleteAgendaItemAction} className="mt-1">
                        <input type="hidden" name="id" value={item.id} />
                        <button type="submit" className={btnDanger}>삭제</button>
                      </form>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCouncil && (
        <p className="mt-3 text-xs text-zinc-400">
          &quot;상정 회차&quot; 칸에 회차를 입력한 뒤 상태를 &quot;상정예정&quot; 이상으로 저장하면, 회의록 탭에서 해당 회차에
          자동으로 안건이 채워집니다. 일반 직원에게는 이 열과 관리 버튼이 보이지 않습니다.
        </p>
      )}
    </main>
  );
}
