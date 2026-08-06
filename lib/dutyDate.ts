// Date -> "YYYY-MM-DD" 변환에 toISOString()을 쓰면 UTC로 바뀌면서 KST(UTC+9) 환경에서
// 하루가 밀린다(다른 기능들도 겪었던 문제 — VehicleReservationClient.tsx의 addDays 주석 참고).
// 당직 배정/달력 관련 날짜 계산은 전부 이 로컬 연/월/일 getter 기반 헬퍼로 통일한다.

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toDateStr(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function mondayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const day = d.getDay(); // 0=일 ~ 6=토
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

export function dayOfWeek(iso: string): number {
  return new Date(`${iso}T00:00:00`).getDay();
}
