import { hasPageAccess } from '@/lib/mutate/permissions';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import PageAccessDenied from '@/components/PageAccessDenied';
import {
  buildAgendaCallNotificationContent,
  buildAgendaCallNotificationTitle,
  canSendAgendaNotification,
  getMeetings,
  getMyAgendaItems,
  isLaborCouncilMember,
} from '@/lib/mutate/laborCouncil';
import { formatMeetingDateTime } from '@/lib/mutate/staffMeeting';
import LaborCouncilTabs from '@/components/laborCouncil/LaborCouncilTabs';
import AgendaProgressFlow, { AGENDA_STAGE_COLOR } from '@/components/laborCouncil/AgendaProgressFlow';
import FormToggle from '@/components/FormToggle';
import SubmitButton from '@/components/SubmitButton';
import { btn, btnSuccess, card, h1, h2, input, label as labelCls, pageFluid } from '@/lib/ui';
import { addAgendaItemAction, sendAgendaNotificationAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 대화하는 세 사람 + 아이디어(전구) 일러스트 — 브랜드색 하나만 쓰지 않고 호박색/남색/청록색을
// 섞어서 화면이 파란색 일색으로 단조로워 보이지 않게 한다.
function ProposeHeroIllustration() {
  return (
    <svg width="220" height="150" viewBox="0 0 220 150" style={{ flexShrink: 0 }}>
      <ellipse cx="110" cy="138" rx="95" ry="8" fill="#d7e9f4" />
      <circle cx="55" cy="60" r="20" fill="#e8a33d" />
      <path d="M25 128 Q25 90 55 90 Q85 90 85 128 Z" fill="#e8a33d" />
      <circle cx="112" cy="45" r="24" fill="#0e5d90" />
      <path d="M76 128 Q76 82 112 82 Q148 82 148 128 Z" fill="#0e5d90" />
      <circle cx="170" cy="62" r="19" fill="#0d9488" />
      <path d="M142 128 Q142 92 170 92 Q198 92 198 128 Z" fill="#0d9488" />
      <rect x="88" y="4" width="52" height="34" rx="10" fill="#ffffff" stroke="#cfe4f0" strokeWidth="1.5" />
      <path d="M108 38 L100 48 L116 38 Z" fill="#ffffff" stroke="#cfe4f0" strokeWidth="1.5" />
      <circle cx="114" cy="21" r="8" fill="#ffd166" />
      <rect x="111" y="28" width="6" height="4" rx="1" fill="#e2b04a" />
    </svg>
  );
}

export default async function LaborCouncilProposePage() {
  if (!(await hasPageAccess('labor-council'))) return <PageAccessDenied />;

  const me = await getViewerStaffRecord();
  const email = me?.['이메일(아이디)'] ?? '';
  const [myItems, isCouncil, canSendNotification, meetings] = await Promise.all([
    getMyAgendaItems(email),
    isLaborCouncilMember(email),
    canSendAgendaNotification(),
    getMeetings(),
  ]);

  // 안건 접수 자체엔 마감이 없지만(상시 접수), 제안자가 "언제쯤 다뤄질지" 감을 잡을 수 있게
  // 가장 가까운 예정 회의를 안내한다 — 예정 회의가 여러 건이면 날짜가 가장 이른 것.
  const nextMeeting = meetings
    .filter((m) => m.상태 === '예정' && m.회의일시)
    .sort((a, b) => a.회의일시.localeCompare(b.회의일시))[0];

  return (
    <main className={pageFluid}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className={h1}>인사관리 &gt; 노사협의회</h1>
        {canSendNotification && (
          <FormToggle label="잔디 알림 보내기" buttonLabel="🟢 잔디 알림 보내기" buttonClassName={btnSuccess} wrapperClassName="">
            <form action={sendAgendaNotificationAction} className="flex flex-col gap-3">
              <label className={labelCls}>
                제목
                <input name="제목" defaultValue={buildAgendaCallNotificationTitle()} className={input} />
              </label>
              <label className={labelCls}>
                내용
                <textarea
                  name="내용"
                  rows={5}
                  defaultValue={buildAgendaCallNotificationContent()}
                  className={`${input} whitespace-pre-wrap`}
                />
              </label>
              <SubmitButton className={btn} pendingLabel="보내는 중...">전송</SubmitButton>
            </form>
          </FormToggle>
        )}
      </div>
      <LaborCouncilTabs />

      {/* 히어로 배너 — card 대신 직접 스타일링(같은 문자열에 bg-white와 bg-brand-tint를 같이 쓰면
          Tailwind 유틸리티 우선순위 문제로 어느 게 이길지 불확실해지므로 분리). */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-6 rounded-lg bg-brand-tint p-5 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
        <div className="max-w-[460px]">
          <div className="text-xl font-extrabold leading-relaxed text-brand-dark dark:text-brand">
            직원 여러분의 의견을<br />노사협의회 안건으로 제안해주세요
          </div>
          <p className="mt-2.5 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300">
            접수된 의견은 위원 검토 후 노사협의회 안건으로 상정될 수 있습니다.
          </p>
          <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-semibold text-brand-dark dark:bg-zinc-900 dark:text-brand">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {nextMeeting
              ? `다음 노사협의회: 제${nextMeeting.회차}차 · ${formatMeetingDateTime(nextMeeting.회의일시)}${nextMeeting.회의장소 ? ` (${nextMeeting.회의장소})` : ''} — 이 전에 제안하시면 이번 회의에서 다뤄질 수 있습니다.`
              : '다음 회의 일정이 아직 없습니다. 안건은 상시 접수되며, 위원이 검토 후 회의 일정에 맞춰 상정합니다.'}
          </div>
        </div>
        <ProposeHeroIllustration />
      </div>

      {/* 안건 제안 폼 */}
      <div className={card}>
        <h2 className={h2}>안건 제안하기</h2>
        <form action={addAgendaItemAction} className="flex flex-col gap-3">
          <label className={labelCls}>
            제목
            <input name="항목명" className={input} placeholder="예: 직원 휴게공간 개선 요청" />
          </label>
          <label className={labelCls}>
            내용
            <textarea
              name="제안내용"
              rows={5}
              className={`${input} whitespace-pre-wrap`}
              placeholder="현재 어떤 문제가 있나요? 어떻게 개선되면 좋을까요? 구체적으로 작성해주세요."
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-4 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-[12.5px] text-zinc-500 dark:text-zinc-400">공개 여부</span>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="공개여부" value="실명" defaultChecked /> 실명 공개
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="공개여부" value="익명" /> 익명 제안
              </label>
            </div>
            <p className="text-xs text-zinc-400">
              &quot;실명 공개&quot;를 선택해도 &quot;안건 현황&quot; 화면에는 항상 익명으로 표시됩니다. 실제 제안자는
              근로자위원(노측)과 관리자만 확인할 수 있습니다(사용자위원에게는 위원이라도 항상 익명으로 보입니다).
            </p>
          </div>
          <div>
            <SubmitButton className={btn} pendingLabel="등록 중...">제안하기</SubmitButton>
          </div>
        </form>
      </div>

      {/* 나의 안건 진행 현황 */}
      <div>
        <h2 className={h2}>나의 안건 진행 현황</h2>
        <div className="flex flex-col gap-3">
          {myItems.length === 0 ? (
            <div className="text-sm text-zinc-400">아직 제안한 안건이 없습니다.</div>
          ) : (
            myItems.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                style={{ borderLeft: `3px solid ${AGENDA_STAGE_COLOR[item.상태].text}` }}
              >
                <div className="mb-2.5 flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {item.항목명 || '(제목 없음)'}
                  </div>
                </div>
                <div className="max-w-[420px]">
                  <AgendaProgressFlow status={item.상태} />
                </div>
                <div className="mt-2 text-xs text-zinc-400">
                  {item.등록일시} 제안
                  {item.상정회차 && ` · 제${item.상정회차}차 노사협의회에 상정`}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-zinc-400">
        제안된 모든 안건은 &quot;안건 현황&quot; 탭에서 전체 직원이 조회할 수 있습니다(제안자는 항상 익명 표시).
        {!isCouncil && ' 취합·상정·회의 관리는 노사협의회 위원만 할 수 있습니다.'}
      </p>
    </main>
  );
}
