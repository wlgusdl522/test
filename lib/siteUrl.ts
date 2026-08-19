// 잔디 알림처럼 외부(카카오톡/잔디 앱 등)에서 클릭하는 절대경로 링크를 만들 때 쓴다.
// NEXT_PUBLIC_APP_URL을 설정해두면 그걸 우선 쓰고, 없으면 Vercel이 자동으로 채워주는
// 프로덕션 도메인 → 이번 배포 도메인 순으로 대체한다.
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const prodUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prodUrl) return `https://${prodUrl}`;
  const deploymentUrl = process.env.VERCEL_URL;
  if (deploymentUrl) return `https://${deploymentUrl}`;
  return 'http://localhost:3000';
}
