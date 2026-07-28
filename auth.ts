import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

const ALLOWED_DOMAIN = 'sdmsenior.or.kr';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: { params: { hd: ALLOWED_DOMAIN, prompt: 'select_account' } },
    }),
  ],
  callbacks: {
    // hd 파라미터는 클라이언트 힌트일 뿐이라 신뢰하지 않고, 서버에서 실제 이메일 도메인을 다시 검증한다.
    async signIn({ profile }) {
      const email = profile?.email;
      return !!email && email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
    },
  },
  pages: {
    signIn: '/login',
  },
});
