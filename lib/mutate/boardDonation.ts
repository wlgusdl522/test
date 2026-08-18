import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList, updateKeyedRecord } from '@/lib/mutate/keyedTable';
import { BOARD_DONATION_DETAIL_TABLE } from '@/lib/sheets/registry';
import { priorCumulative, type BoardStatValue } from '@/lib/mutate/boardStat';

export type DonationItem = '후원금' | '후원물품';

export type DonationDetail = {
  id: string;
  항목: DonationItem;
  시설: string;
  년월: string;
  이름: string;
  수량: string;
  금액: number;
  후원자: string;
  지급대상: string;
  비고: string;
  정렬순서: number;
};

export type DonationRowInput = {
  id?: string;
  이름: string;
  수량?: string;
  금액: number;
  후원자?: string;
  지급대상?: string;
  비고?: string;
};

// 참고 서식의 표기 그대로 — 내부 시설 코드(복지관/요양센터/데이케어센터)와 다른 정식 명칭.
export const DONATION_FACILITY_LABEL: Record<string, string> = {
  복지관: '복지관',
  요양센터: '병설 요양센터',
  데이케어센터: '병설 데이케어센터',
};

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getDonationDetails(항목: DonationItem, 시설: string, ym: string): Promise<DonationDetail[]> {
  const rows = await getKeyedList(BOARD_DONATION_DETAIL_TABLE);
  return rows
    .filter((r) => r.id && r.항목 === 항목 && r.시설 === 시설 && r.년월 === ym)
    .map(toDonationDetail)
    .sort((a, b) => a.정렬순서 - b.정렬순서);
}

// 총괄표의 전월누계/누계 계산에는 조회월 하나가 아니라 그 해 전체 데이터가 필요하다.
export async function getDonationDetailsForYear(항목: DonationItem, 시설: string, year: string): Promise<DonationDetail[]> {
  const rows = await getKeyedList(BOARD_DONATION_DETAIL_TABLE);
  return rows
    .filter((r) => r.id && r.항목 === 항목 && r.시설 === 시설 && r.년월.slice(0, 4) === year)
    .map(toDonationDetail);
}

function toDonationDetail(r: Record<string, string>): DonationDetail {
  return {
    id: r.id, 항목: r.항목 as DonationItem, 시설: r.시설, 년월: r.년월,
    이름: r.이름, 수량: r.수량, 금액: num(r.금액), 후원자: r.후원자, 지급대상: r.지급대상, 비고: r.비고,
    정렬순서: num(r.정렬순서),
  };
}

// 총괄표(전월누계/금월실적/누계)는 회계와 같은 계산식을 쓰므로, 상세 행을 그 함수가 기대하는
// {항목ID,시설,년월,값} 모양으로 바꿔서 priorCumulative/valueFor를 그대로 재사용한다.
function asStatValues(details: DonationDetail[]): BoardStatValue[] {
  return details.map((d) => ({ 항목ID: d.항목, 시설: d.시설, 년월: d.년월, 값: d.금액 }));
}

export function donationPriorCumulative(details: DonationDetail[], 항목: DonationItem, 시설: string, ym: string): number {
  return priorCumulative(asStatValues(details), 항목, 시설, ym);
}

// valueFor(회계용)는 항목+시설+월당 행이 하나뿐이라는 전제로 find() 하나만 반환하는데,
// 후원은 한 달에 후원자 수만큼 행이 여러 개라 반드시 합산해야 한다 — 여기서 직접 sum.
export function donationValueFor(details: DonationDetail[], 항목: DonationItem, 시설: string, ym: string): number {
  return details
    .filter((d) => d.항목 === 항목 && d.시설 === 시설 && d.년월 === ym)
    .reduce((a, d) => a + d.금액, 0);
}

// 업무보고/명단 표와 같은 방식 — 한 시설·항목·조회월의 행 전체를 통째로 편집하다가 저장한다.
export async function saveDonationDetails(
  항목: DonationItem,
  시설: string,
  ym: string,
  rows: DonationRowInput[]
): Promise<void> {
  const existing = await getDonationDetails(항목, 시설, ym);
  const keepIds = new Set(rows.filter((r) => r.id).map((r) => r.id));
  for (const e of existing) {
    if (!keepIds.has(e.id)) await deleteKeyedRecord(BOARD_DONATION_DETAIL_TABLE, { id: e.id });
  }

  let order = 1;
  for (const r of rows) {
    const id = r.id || randomUUID();
    const record = {
      id, 항목, 시설, 년월: ym,
      이름: r.이름, 수량: r.수량 ?? '', 금액: String(r.금액 || 0),
      후원자: r.후원자 ?? '', 지급대상: r.지급대상 ?? '', 비고: r.비고 ?? '',
      정렬순서: String(order),
    };
    if (r.id) {
      await updateKeyedRecord(BOARD_DONATION_DETAIL_TABLE, { id }, record);
    } else {
      await addKeyedRecord(BOARD_DONATION_DETAIL_TABLE, record);
    }
    order++;
  }
}
