import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import BoardSubTabs from '@/components/business/BoardSubTabs';
import AdminNoteListClient from '@/components/business/AdminNoteListClient';
import { getAdminNotes } from '@/lib/mutate/boardAdminNote';
import { btnSecondary, card, h2, inputBase } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export default async function AdminNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  if (!(await hasPageAccess('business-admin-notes'))) return <PageAccessDenied />;

  const { ym: ymParam } = await searchParams;
  const ym = ymParam || todayKst().slice(0, 7);
  const adminNotes = await getAdminNotes(ym);

  return (
    <>
      <BoardSubTabs ym={ym} />
      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
        <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      <div className={card}>
        <h2 className={`${h2} mb-3`}>행정사항 ({ym})</h2>
        <p className="mb-3 text-xs text-zinc-400">여기서 작성한 내용은 요약보고 &quot;8) 행정사항&quot;에 자동으로 표시됩니다.</p>
        <AdminNoteListClient
          ym={ym}
          initialRows={adminNotes.map((n) => ({ id: n.id, 내용: n.내용, 요약포함: n.요약포함, 요약내용: n.요약내용 }))}
        />
      </div>
    </>
  );
}
