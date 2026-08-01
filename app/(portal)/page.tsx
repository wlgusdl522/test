import Link from 'next/link';
import { getMyApprovalCount, getMyRecordsSummary } from '@/lib/mutate/dashboard';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { pageHeader, h1, statCard } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const QUICK_LINKS = [
  { href: '/weekly-plan', label: '주간업무', desc: '이번 주 업무 입력' },
  { href: '/expenses', label: '카드사용대장', desc: '지출 등록' },
  { href: '/vehicles', label: '차량관리', desc: '차량 예약' },
  { href: '/staff/directory', label: '전직원 주소록', desc: '연락처 찾기' },
];

export default async function HomePage() {
  const [me, summary, approvalCount] = await Promise.all([
    getViewerStaffRecord(),
    getMyRecordsSummary(),
    getMyApprovalCount(),
  ]);

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <div className={pageHeader}>
        <div>
          <h1 className={h1}>안녕하세요, {me?.성명 ?? ''}님</h1>
          <p className="mt-1 text-sm text-zinc-500">{me?.소속팀 ?? ''} · {me?.['직급/직책'] ?? ''}</p>
        </div>
      </div>

      <div className="mb-8 flex gap-4">
        <Link href="/mypage" className={statCard}>
          <p className="text-xs font-medium text-zinc-500">처리할 일</p>
          <p className="mt-1.5 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{summary.pendingTasks.length}</p>
          <p className="mt-1 text-xs text-zinc-400">건</p>
        </Link>
        <Link href="/mypage" className={statCard}>
          <p className="text-xs font-medium text-zinc-500">내 결재 대기</p>
          <p className="mt-1.5 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{approvalCount}</p>
          <p className="mt-1 text-xs text-zinc-400">건</p>
        </Link>
      </div>

      <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-zinc-500">바로가기</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{l.label}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{l.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
