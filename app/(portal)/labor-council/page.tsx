import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import {
  canEditLaborCouncilMinutes,
  getAgendaItems,
  getAgendaRounds,
  getNextRound,
} from '@/lib/mutate/laborCouncil';
import LaborCouncilTabs from '@/components/laborCouncil/LaborCouncilTabs';
import SubmitButton from '@/components/SubmitButton';
import {
  btn, btnDanger, btnOutline, card, h1, hint, input, inputBase, label as labelCls, pageFluid, table, td, th, tableWrap,
} from '@/lib/ui';
import { addAgendaItemAction, deleteAgendaItemAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function LaborCouncilPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  if (!(await hasPageAccess('labor-council'))) return <PageAccessDenied />;

  const [rounds, canEdit] = await Promise.all([getAgendaRounds(), canEditLaborCouncilMinutes()]);
  const { round: roundParam } = await searchParams;
  const 회차 = roundParam || rounds[0] || (await getNextRound());
  const items = await getAgendaItems(회차);
  const nextRound = await getNextRound();

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>인사관리 &gt; 노사협의회</h1>
      <LaborCouncilTabs 회차={회차} />

      <form method="get" className="mb-5 flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">회차</label>
        <select name="round" defaultValue={회차} className={`${inputBase} w-auto`}>
          {!rounds.includes(회차) && <option value={회차}>{회차}차 (신규)</option>}
          {rounds.map((r) => <option key={r} value={r}>{r}차</option>)}
        </select>
        <SubmitButton className={btnOutline} pendingLabel="조회 중...">조회</SubmitButton>
        {회차 !== nextRound && (
          <Link href={`/labor-council?round=${nextRound}`} className={btn}>+ {nextRound}차 새로 시작</Link>
        )}
      </form>

      <p className={hint}>
        업무고충이나 안건이 있으면 누구나 아래에 등록할 수 있습니다. 위원은 회의 전 내용을 확인·정리한 뒤
        &quot;회의록 보기/작성&quot;에서 협의사항으로 옮겨 논의 결과를 기록합니다.
      </p>

      <div className={card}>
        <form action={addAgendaItemAction} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-3 items-end">
          <input type="hidden" name="회차" value={회차} />
          <label className={labelCls}>
            업무고충처리 관련(항목명)
            <input name="항목명" className={input} placeholder="예: 출근부 관리 업무 개선" />
          </label>
          <label className={labelCls}>
            사유 및 구체적 제안내용
            <textarea name="제안내용" rows={2} className={`${input} whitespace-pre-wrap`} />
          </label>
          <SubmitButton className={btn} pendingLabel="등록 중...">등록</SubmitButton>
        </form>
      </div>

      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={`${th} w-48`}>항목명</th>
              <th className={th}>사유 및 구체적 제안내용</th>
              <th className={`${th} w-24`}>제출자</th>
              {canEdit && <th className={`${th} w-16`}></th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td className={td} colSpan={canEdit ? 4 : 3}>등록된 안건이 없습니다.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                  <td className={`${td} align-top whitespace-pre-wrap`}>{item.항목명}</td>
                  <td className={`${td} align-top whitespace-pre-wrap`}>{item.제안내용}</td>
                  <td className={`${td} align-top whitespace-nowrap`}>{item.성명}</td>
                  {canEdit && (
                    <td className={`${td} align-top`}>
                      <form action={deleteAgendaItemAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <button type="submit" className={btnDanger}>삭제</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
