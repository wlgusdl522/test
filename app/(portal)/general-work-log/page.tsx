import { getBusinessList } from '@/lib/mutate/business';
import { getGeneralLogRollup, getGeneralLogContent, getGeneralLogNote } from '@/lib/mutate/generalLog';
import { hasPageAccess } from '@/lib/mutate/permissions';
import { btnSecondary, card, h1, inputBase, pageHeader } from '@/lib/ui';
import PageAccessDenied from '@/components/PageAccessDenied';
import GeneralLogWorkspace from '@/components/generalLog/GeneralLogWorkspace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function GeneralWorkLogPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; date?: string }>;
}) {
  if (!(await hasPageAccess('general-work-log'))) {
    return <PageAccessDenied />;
  }

  const params = await searchParams;
  const businesses = await getBusinessList();
  const business = params.business || businesses[0]?.name || '';
  const date = params.date || new Date().toISOString().slice(0, 10);

  const [rollup, content, note] = business
    ? await Promise.all([
        getGeneralLogRollup(business, date),
        getGeneralLogContent(business, date),
        getGeneralLogNote(business, date),
      ])
    : [[], [], ''];

  return (
    <>
      <div className={pageHeader}>
        <h1 className={h1}>총괄업무일지</h1>
      </div>

      <div className={card}>
        <form method="get" className="flex items-center gap-2 mb-4 flex-wrap">
          <select name="business" defaultValue={business} className={`${inputBase} w-auto`}>
            {businesses.map((b) => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
          <input type="date" name="date" defaultValue={date} className={`${inputBase} w-auto`} />
          <button type="submit" className={btnSecondary}>조회</button>
          <a href="/settings/general-log-items" className={`${btnSecondary} ml-auto`}>구분항목 설정</a>
        </form>

        {!business ? (
          <p className="text-sm text-zinc-500">
            먼저 사업목록을 등록해주세요. (설정 &gt; 사업목록)
          </p>
        ) : rollup.length === 0 ? (
          <p className="text-sm text-zinc-500">
            &quot;{business}&quot;에 등록된 구분항목이 없습니다.{' '}
            <a href={`/settings/general-log-items?business=${encodeURIComponent(business)}`} className="underline">
              구분항목 설정
            </a>
            에서 먼저 추가해주세요.
          </p>
        ) : (
          <GeneralLogWorkspace
            business={business}
            date={date}
            rollup={rollup}
            initialContent={content}
            initialNote={note}
          />
        )}
      </div>
    </>
  );
}
