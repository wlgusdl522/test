export default function PageAccessDenied() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">이 페이지에 접근할 권한이 없습니다.</p>
    </div>
  );
}
