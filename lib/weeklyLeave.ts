// "내 업무 입력"에서 요일별 휴가/교육 유형을 고르면 업무내용 끝에 "성명(휴가유형)" 태그가 자동으로 붙는다.
// 부서별 취합/회의록 휴가요약 등 여러 곳에서 이 태그를 다시 파싱해야 해서 한 곳에 모아둔다.
// Index.html/Code.js의 동명 LEAVE_TYPES와 반드시 동일하게 맞춰야 한다.
export const LEAVE_TYPES = ['연가', '공가', '가족돌봄', '특별휴가', '건강검진', '교육(종일)', '0.75', '0.5(오전)', '0.5(오후)', '0.25(오전)', '0.25(오후)'];
export const FULL_DAY_LEAVE_TYPES = ['연가', '공가', '가족돌봄', '특별휴가', '건강검진', '교육(종일)'];

export function parseLeaveTag(content: string): { name: string; type: string } | null {
  const m = /^(.+)\(([^)]+)\)$/.exec(content || '');
  if (!m || !LEAVE_TYPES.includes(m[2])) return null;
  return { name: m[1], type: m[2] };
}

export function isLeaveTagContent(content: string): boolean {
  return !!parseLeaveTag(content);
}

const WEEKDAY_LABELS_FULL = ['일', '월', '화', '수', '목', '금', '토'];

// 그 주 업무 중 휴가 태그가 붙은 항목을 날짜별로 모아 "7/7(화) 홍길동(연가)" 형태로 정리한다.
export function summarizeLeaveEntries(tasks: Record<string, string>[]): string {
  const byDate = new Map<string, string[]>();
  for (const t of tasks) {
    if (!parseLeaveTag(t.업무내용)) continue;
    if (!byDate.has(t.날짜)) byDate.set(t.날짜, []);
    byDate.get(t.날짜)!.push(t.업무내용);
  }
  const dates = [...byDate.keys()].sort();
  return dates
    .map((iso) => {
      const d = new Date(`${iso}T00:00:00`);
      return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_LABELS_FULL[d.getDay()]}) ${byDate.get(iso)!.join(', ')}`;
    })
    .join('\n');
}
