// 카드사용대장 저장류 액션들이 공통으로 쓰는 리다이렉트 URL 빌더 — 지금 걸려있던
// 월/전체보기/상태 필터를 그대로 들고 목록으로 돌아가야, 예전 달 건을 "전체보기"에서
// 열어 저장했을 때 기본 필터(이번달)로 되돌아가면서 목록이 통째로 사라진 것처럼
// 보이는 일이 없다.
export function mineRedirectUrl(formData: FormData, extra: Record<string, string>): string {
  const sp = new URLSearchParams();
  const ym = formData.get('ym');
  const all = formData.get('all');
  const status = formData.get('status');
  if (ym) sp.set('ym', String(ym));
  if (all) sp.set('all', String(all));
  if (status) sp.set('status', String(status));
  for (const [k, v] of Object.entries(extra)) sp.set(k, v);
  return `/expenses/mine?${sp.toString()}`;
}
