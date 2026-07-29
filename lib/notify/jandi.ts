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
