import { getCertificateById } from '@/lib/supabase/certificate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 로그인 없이 QR로 접속하는 공개 검증 페이지 — 개인정보 노출을 최소화하기 위해
// 문서번호/종류/발급일/마스킹된 성명만 보여준다.
function maskName(name: string): string {
  if (!name) return '';
  if (name.length <= 1) return name;
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
}

function formatDate(iso: string): string {
  const parts = String(iso || '').split('-');
  if (parts.length < 3) return iso || '';
  return `${parts[0]}년 ${Number(parts[1])}월 ${Number(parts[2])}일`;
}

export default async function VerifyCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getCertificateById(id);
  const valid = !!record && !!record.문서번호 && record.결재상태 === '승인';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-1 text-xs font-semibold text-brand">서대문노인종합복지관</p>
        <h1 className="mb-5 text-lg font-bold text-zinc-900 dark:text-zinc-100">증명서 진위 확인</h1>

        {valid ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              ✓
            </div>
            <p className="mb-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">정상 발급된 문서입니다.</p>
            <dl className="flex flex-col gap-2 text-left text-sm">
              <div className="flex justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                <dt className="text-zinc-500">문서번호</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">제 {record!.문서번호}호</dd>
              </div>
              <div className="flex justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                <dt className="text-zinc-500">종류</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{record!.종류 || record!.구분}</dd>
              </div>
              <div className="flex justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                <dt className="text-zinc-500">대상자</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{maskName(record!.대상자성명)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">발급일</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{formatDate(record!.발급일)}</dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-2xl text-red-600 dark:bg-red-500/10 dark:text-red-400">
              ✕
            </div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">유효하지 않거나 존재하지 않는 문서입니다.</p>
          </>
        )}
      </div>
    </main>
  );
}
