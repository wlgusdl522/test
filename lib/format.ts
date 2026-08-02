// 시트 값 중 일부(특히 레거시로 이관된 데이터)는 "137,800"처럼 콤마가 포함된 문자열로 들어있어
// 그냥 Number()로 바꾸면 NaN이 된다. 금액류 필드를 숫자로 쓸 때는 항상 이 함수를 거친다.
export function parseAmount(value: string | undefined | null): number {
  if (!value) return 0;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}
