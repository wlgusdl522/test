// 시트 값 중 일부(특히 레거시로 이관된 데이터)는 "137,800"처럼 콤마가 포함된 문자열로 들어있어
// 그냥 Number()로 바꾸면 NaN이 된다. 금액류 필드를 숫자로 쓸 때는 항상 이 함수를 거친다.
export function parseAmount(value: string | undefined | null): number {
  if (!value) return 0;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// 카드사용대장의 예산과목은 실제 "사업명"이 아니라 예산과목명이다 — 예산과목설정 시트에 등록된
// 연계사업명으로 바꿔서 보여준다(매핑이 없으면 예산과목명 그대로 표시).
export function resolveBusinessName(budgetItemName: string, budgetItems: Record<string, string>[]): string {
  const match = budgetItems.find((b) => b.예산과목명 === budgetItemName);
  return match?.연계사업명 || budgetItemName || '';
}
