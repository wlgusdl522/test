import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import BoardSubTabs from '@/components/business/BoardSubTabs';
import ItemManageModal from '@/components/business/ItemManageModal';
import HeadcountEntryClient from '@/components/business/HeadcountEntryClient';
import { getModuleItems, getModuleValues, valueFor } from '@/lib/mutate/boardStat';
import { getHeadcountDate } from '@/lib/mutate/boardHeadcount';
import { setHeadcountDateAction } from '@/app/(portal)/business-summary/boardHeadcountActions';
import { btnOutline, btnSecondary, card, h2, inputBase } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export default async function BusinessSummaryHeadcountPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  if (!(await hasPageAccess('business-headcount'))) return <PageAccessDenied />;

  const { ym: ymParam } = await searchParams;
  const ym = ymParam || todayKst().slice(0, 7);

  const [items, headcountDate] = await Promise.all([getModuleItems('실인원'), getHeadcountDate(ym)]);
  const values = await getModuleValues(items.map((i) => i.id));
  const rows = items.map((i) => ({
    id: i.id, 항목명: i.항목명,
    실인원: valueFor(values, i.id, '전체', ym),
    비고: values.find((v) => v.항목ID === i.id && v.시설 === '전체' && v.년월 === ym)?.비고 ?? '',
  }));

  return (
    <>
      <BoardSubTabs ym={ym} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form action={setHeadcountDateAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="년월" value={ym} />
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">기준일</label>
          <input type="date" name="기준일" defaultValue={headcountDate} className={`${inputBase} w-auto`} />
          <button type="submit" className={btnSecondary}>기준일 저장</button>
        </form>
        <form method="get" className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
          <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
          <button type="submit" className={btnSecondary}>조회</button>
        </form>
        <Link href={`/business-summary/headcount/view?ym=${ym}`} className={btnOutline}>보기 전용 화면</Link>
      </div>

      <ItemManageModal 모듈="실인원" items={items} />

      <div className={card}>
        <h2 className={`${h2} mb-3`}>실인원 산출내역 ({ym}{headcountDate ? `, ${headcountDate} 기준` : ''})</h2>
        <HeadcountEntryClient ym={ym} rows={rows} />
      </div>
    </>
  );
}
