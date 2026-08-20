import { hasPageAccess } from '@/lib/mutate/permissions';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import PageAccessDenied from '@/components/PageAccessDenied';
import {
  buildAgendaCallNotificationContent,
  buildAgendaCallNotificationTitle,
  canSendAgendaNotification,
  getMyAgendaItems,
  isLaborCouncilMember,
} from '@/lib/mutate/laborCouncil';
import LaborCouncilTabs from '@/components/laborCouncil/LaborCouncilTabs';
import FormToggle from '@/components/FormToggle';
import SubmitButton from '@/components/SubmitButton';
import { badgeBase, badgeTone, btn, btnSuccess, card, h1, h2, input, label as labelCls, pageFluid } from '@/lib/ui';
import { addAgendaItemAction, sendAgendaNotificationAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, keyof typeof badgeTone> = {
  접수: 'gray',
  검토중: 'blue',
  상정예정: 'amber',
  협의완료: 'green',
  결과공유: 'gray',
};

export default async function LaborCouncilPage() {
  if (!(await hasPageAccess('labor-council'))) return <PageAccessDenied />;

  const me = await getViewerStaffRecord();
  const email = me?.['이메일(아이디)'] ?? '';
  const [myItems, isCouncil, canSendNotification] = await Promise.all([
    getMyAgendaItems(email),
    isLaborCouncilMember(email),
    canSendAgendaNotification(),
  ]);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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
                노사협의회 위원만 확인할 수 있습니다.
              </p>
            </div>
            <div>
              <SubmitButton className={btn} pendingLabel="등록 중...">제안하기</SubmitButton>
            </div>
          </form>
        </div>

        <div>
          <h2 className={h2}>나의 안건 진행 현황</h2>
          <div className="flex flex-col gap-3">
            {myItems.length === 0 ? (
              <div className="text-sm text-zinc-400">아직 제안한 안건이 없습니다.</div>
            ) : (
              myItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.항목명 || '(제목 없음)'}
                    </div>
                    <span className={`${badgeBase} ${badgeTone[STATUS_TONE[item.상태]]}`}>{item.상태}</span>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                    {item.제안내용}
                  </div>
                  <div className="mt-2 text-xs text-zinc-400">
                    {item.등록일시}
                    {item.상정회차 && ` · 제${item.상정회차}차 노사협의회에 상정`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-zinc-400">
        제안된 모든 안건은 &quot;안건 현황&quot; 탭에서 전체 직원이 조회할 수 있습니다(제안자는 항상 익명 표시).
        {!isCouncil && ' 취합·상정·회의 관리는 노사협의회 위원만 할 수 있습니다.'}
      </p>
    </main>
  );
}
