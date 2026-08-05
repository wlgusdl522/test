// 순수 함수만 모아둔다 — 서버(lib/mutate/vehicleRequest.ts)와 클라이언트(예약 폼의
// 실시간 검사) 양쪽에서 같은 겹침 판정 로직을 그대로 재사용하기 위함.

// 시간이 비어있으면 하루 전체를 막는 것으로 보고 겹침을 판정한다(부분적으로만 아는 경우 안전한 쪽으로).
export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const aS = aStart || '00:00';
  const aE = aEnd || '23:59';
  const bS = bStart || '00:00';
  const bE = bEnd || '23:59';
  return aS < bE && bS < aE;
}

// 예약의 사용 시간대(복귀시간, 없으면 하루 끝)가 이미 지났는지 — 지났으면 "일지작성"으로 유도한다.
export function hasVehicleUseEnded(date: string, endTime: string, now: Date = new Date()): boolean {
  const end = new Date(`${date}T${endTime || '23:59'}:00`);
  return end.getTime() < now.getTime();
}

export function findOverlappingRequest(
  requests: Record<string, string>[],
  target: { 차량번호: string; 사용일자: string; 출발시간: string; 복귀시간: string },
  excludeId?: string
): Record<string, string> | null {
  if (!target.차량번호 || !target.사용일자) return null;
  const conflict = requests.find(
    (r) =>
      r.id !== excludeId &&
      r['차량번호'] === target.차량번호 &&
      r['사용일자'] === target.사용일자 &&
      timesOverlap(r['출발시간'], r['복귀시간'], target.출발시간, target.복귀시간)
  );
  return conflict ?? null;
}
