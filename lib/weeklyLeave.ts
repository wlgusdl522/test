// "내 업무 입력"에서 요일별 휴가/교육 유형을 고르면 업무내용 끝에 "성명(휴가유형)" 태그가 자동으로 붙는다.
// 부서별 취합/회의록 휴가요약 등 여러 곳에서 이 태그를 다시 파싱해야 해서 한 곳에 모아둔다.
// Index.html/Code.js의 동명 LEAVE_TYPES와 반드시 동일하게 맞춰야 한다.
export const LEAVE_TYPES = ['연가', '공가', '가족돌봄', '특별휴가', '건강검진', '교육(종일)', '출장', '0.75', '0.5(오전)', '0.5(오후)', '0.25(오전)', '0.25(오후)'];
export const FULL_DAY_LEAVE_TYPES = ['연가', '공가', '가족돌봄', '특별휴가', '건강검진', '교육(종일)', '출장'];

export function parseLeaveTag(content: string): { name: string; type: string } | null {
  const m = /^(.+)\(([^)]+)\)$/.exec(content || '');
  if (!m || !LEAVE_TYPES.includes(m[2])) return null;
  return { name: m[1], type: m[2] };
}

export function isLeaveTagContent(content: string): boolean {
  return !!parseLeaveTag(content);
}

function formatMD(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 그 주 업무 중 휴가 태그가 붙은 항목을 날짜순으로 정리한다 — "- 권지현(7/27, 가족돌봄)" 형태.
export function summarizeLeaveEntries(tasks: Record<string, string>[]): string {
  const entries = tasks
    .map((t) => ({ tag: parseLeaveTag(t.업무내용), date: t.날짜 }))
    .filter((e): e is { tag: { name: string; type: string }; date: string } => e.tag !== null)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return entries.map(({ tag, date }) => `- ${tag.name}(${formatMD(date)}, ${tag.type})`).join('\n');
}
