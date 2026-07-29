import { signIn } from '@/auth';

export default function LoginPage() {
  return (
    <main className="mx-auto mt-24 max-w-sm px-6 text-center">
      <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">서대문노인종합복지관 업무포털</h1>
      <p className="mb-6 text-sm text-zinc-500">sdmsenior.or.kr 계정으로만 로그인할 수 있습니다.</p>
      <form
        action={async () => {
          'use server';
          await signIn('google', { redirectTo: '/settings/simple-lists' });
        }}
      >
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Google 계정으로 로그인
        </button>
      </form>
    </main>
  );
}
