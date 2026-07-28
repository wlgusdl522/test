import { signIn } from '@/auth';

export default function LoginPage() {
  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 360, margin: '80px auto', textAlign: 'center' }}>
      <h1>서대문노인종합복지관 업무포털</h1>
      <p style={{ color: '#666', fontSize: 14, margin: '16px 0' }}>
        sdmsenior.or.kr 계정으로만 로그인할 수 있습니다.
      </p>
      <form
        action={async () => {
          'use server';
          await signIn('google', { redirectTo: '/settings/simple-lists' });
        }}
      >
        <button type="submit" style={{ padding: '10px 20px' }}>Google 계정으로 로그인</button>
      </form>
    </main>
  );
}
