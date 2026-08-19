// 웹훅 URL로 그냥 POST만 한다. 전송 실패해도 저장 자체는 계속돼야 하므로 항상 조용히 무시한다.
export async function jandiPost(url: string, message: string): Promise<void> {
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: message }),
    });
  } catch {
    // 알림 실패는 무시한다.
  }
}

// 제목/본문을 하나의 body로 합쳐서 보내면 잔디가 전체를 한 줄로 뭉쳐 미리보기(굵은 글씨)로
// 보여주면서 제목이 본문 앞부분과 섞여 이상하게 잘려 보인다. 잔디 웹훅이 지원하는
// body(제목 역할, 굵게 표시)/connectInfo[].description(본문) 구조로 분리해서 보낸다.
export async function jandiPostRich(url: string, title: string, description: string): Promise<void> {
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: title,
        ...(description ? { connectInfo: [{ description }] } : {}),
      }),
    });
  } catch {
    // 알림 실패는 무시한다.
  }
}

// 개인 잔디웹훅이 있으면 그쪽으로, 없으면 관리자가 설정해둔 공용 웹훅으로 보내서 알림이 조용히 사라지지 않게 한다.
export async function notifyJandiPersonal(
  email: string,
  staffList: Record<string, string>[],
  message: string,
  fallbackUrl: string
): Promise<void> {
  const staff = staffList.find((s) => (s['이메일(아이디)'] ?? '').toLowerCase() === email.toLowerCase());
  const personalUrl = staff?.['잔디웹훅'] ?? '';
  await jandiPost(personalUrl || fallbackUrl, message);
}
