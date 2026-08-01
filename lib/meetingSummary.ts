// "회의록 정리"/회의록 인쇄 문서에서 공용으로 쓰는 회의록 반영 업무 표기 로직.
export function formatMD(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const WEEKDAY_KO_FULL = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

// 회의록 문서 제목 밑 날짜 부제 — "2026년 7월 7일 화요일"
export function formatKoreanDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY_KO_FULL[d.getDay()]}`;
}

export type MeetingContentSection = { category: string; names: string[]; lines: string[] };

// 담당사업(직원관리의 "담당사업" 필드) 기준으로 묶어서 "1. 사업명(담당자1,담당자2)" + 업무 불릿 목록을 만든다.
// 같은 업무내용이 그 사업 안에서 여러 날 반복 체크됐으면 "업무내용(7/27, 7/29)"처럼 한 줄로 합친다.
export function groupHighlightedTasksByCategory(
  tasks: Record<string, string>[],
  staffList: Record<string, string>[]
): MeetingContentSection[] {
  const categoryByEmail = new Map<string, string>();
  for (const s of staffList) {
    categoryByEmail.set((s['이메일(아이디)'] ?? '').toLowerCase(), s['담당사업'] || '기타');
  }

  const order: string[] = [];
  const byCategory = new Map<string, { names: Set<string>; datesByText: Map<string, string[]> }>();

  for (const t of tasks) {
    const email = (t['이메일(아이디)'] ?? '').toLowerCase();
    const category = categoryByEmail.get(email) || '기타';
    if (!byCategory.has(category)) {
      byCategory.set(category, { names: new Set(), datesByText: new Map() });
      order.push(category);
    }
    const bucket = byCategory.get(category)!;
    if (t['성명']) bucket.names.add(t['성명']);
    const key = t['업무내용'];
    if (!bucket.datesByText.has(key)) bucket.datesByText.set(key, []);
    bucket.datesByText.get(key)!.push(t['날짜']);
  }

  return order.map((category) => {
    const bucket = byCategory.get(category)!;
    const lines = Array.from(bucket.datesByText.entries()).map(([text, dates]) => {
      const dateLabel = [...dates].sort().map(formatMD).join(', ');
      return `${text}(${dateLabel})`;
    });
    return { category, names: Array.from(bucket.names), lines };
  });
}
