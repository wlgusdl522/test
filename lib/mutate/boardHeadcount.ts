import { getKeyedList, upsertKeyedRecord } from '@/lib/mutate/keyedTable';
import { BOARD_HEADCOUNT_DATE_TABLE } from '@/lib/sheets/registry';

// 실인원 산출내역의 사업구분/실인원 수치는 이사회항목(모듈='실인원')+이사회월별값을 그대로 쓴다
// (boardStat.ts의 getModuleItems/getModuleValues/setModuleValues 참고). 여기서는 그 달 안에서
// 관리자가 고른 기준일 하나만 다룬다.
export async function getHeadcountDate(ym: string): Promise<string> {
  const rows = await getKeyedList(BOARD_HEADCOUNT_DATE_TABLE);
  return rows.find((r) => r.년월 === ym)?.기준일 ?? '';
}

export async function setHeadcountDate(ym: string, 기준일: string): Promise<void> {
  await upsertKeyedRecord(BOARD_HEADCOUNT_DATE_TABLE, { 년월: ym }, { 년월: ym, 기준일 });
}
