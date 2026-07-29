import Link from 'next/link';
import { getMyApprovalCount, getMyRecordsSummary } from '@/lib/mutate/dashboard';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { card, h1 } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [me, summary, approvalCount] = await Promise.all([
    getViewerStaffRecord(),
    getMyRecordsSummary(),
    getMyApprovalCount(),
  ]);

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className={h1}>안녕하세요, {me?.성명 ?? ''}님</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link href="/mypage" className={`${card} block hover:border-brand`}>
          <p className="text-sm text-zinc-500">처리할 일</p>
          <p className="text-2xl font-semibold text-brand">{summary.pendingTasks.length}건</p>
        </Link>
        <Link href="/mypage" className={`${card} block hover:border-brand`}>
          <p className="text-sm text-zinc-500">내 결재 대기</p>
          <p className="text-2xl font-semibold text-brand">{approvalCount}건</p>
        </Link>
      </div>

      <p className="text-sm text-zinc-500">
        왼쪽 메뉴에서 원하는 업무로 이동하시거나, <Link href="/mypage" className="text-brand hover:underline">마이페이지</Link>에서 내 업무 현황을 확인하세요.
      </p>
    </main>
  );
}
