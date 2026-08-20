import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import { canEditLaborCouncilMinutes, getAgendaRounds, getMinutes, getNextRound } from '@/lib/mutate/laborCouncil';
import MinutesEditor from '@/components/laborCouncil/MinutesEditor';
import SubmitButton from '@/components/SubmitButton';
import { btnOutline, h1, inputBase, pageFluid } from '@/lib/ui';
import { saveMinutesAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function LaborCouncilMinutesPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  if (!(await hasPageAccess('labor-council'))) return <PageAccessDenied />;

  const [rounds, canEdit] = await Promise.all([getAgendaRounds(), canEditLaborCouncilMinutes()]);
  const { round: roundParam } = await searchParams;
  const 회차 = roundParam || rounds[0] || (await getNextRound());
  const minutes = await getMinutes(회차);

  return (
    <main className={pageFluid}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className={h1}>인사관리 &gt; 노사협의회 (회의록) — 제{회차}차</h1>
        <div className="flex gap-2">
          <Link href={`/labor-council?round=${회차}`} className={btnOutline}>안건취합으로</Link>
          <Link href={`/print/labor-council-minutes?round=${회차}`} target="_blank" className={btnOutline}>
            인쇄 · 복사 화면 열기
          </Link>
        </div>
      </div>

      <form method="get" className="mb-5 flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">회차</label>
        <select name="round" defaultValue={회차} className={`${inputBase} w-auto`}>
          {!rounds.includes(회차) && <option value={회차}>{회차}차</option>}
          {rounds.map((r) => <option key={r} value={r}>{r}차</option>)}
        </select>
        <SubmitButton className={btnOutline} pendingLabel="조회 중...">조회</SubmitButton>
      </form>

      {!canEdit && (
        <p className="mb-5 text-xs text-zinc-400">노사협의회 위원만 회의록을 작성·수정할 수 있어 조회만 가능합니다.</p>
      )}

      <MinutesEditor 회차={회차} minutes={minutes} canEdit={canEdit} action={saveMinutesAction} />
    </main>
  );
}
