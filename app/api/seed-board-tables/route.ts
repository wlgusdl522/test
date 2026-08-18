import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { seedKeyedListFromSheet } from '@/lib/mutate/keyedTable';
import {
  BOARD_STAT_ITEM_TABLE,
  BOARD_STAT_VALUE_TABLE,
  BOARD_PLAN_TABLE,
  BOARD_REPORT_PERIOD_TABLE,
  BOARD_DONATION_DETAIL_TABLE,
  BOARD_ROSTER_TABLE,
} from '@/lib/sheets/registry';

// 일회성 시딩 라우트 — 실행 후 삭제할 것. 이사회자료 계열 6개 테이블의 Supabase 테이블을
// SQL로 먼저 만든 뒤(board-tables.sql 참고) 이 라우트를 한 번 열어 현재 시트 데이터를
// Supabase로 최초 복사한다. 이후에는 각 테이블의 add/update/delete가 알아서 미러링한다.
const TABLES = [
  BOARD_STAT_ITEM_TABLE,
  BOARD_STAT_VALUE_TABLE,
  BOARD_PLAN_TABLE,
  BOARD_REPORT_PERIOD_TABLE,
  BOARD_DONATION_DETAIL_TABLE,
  BOARD_ROSTER_TABLE,
];

export async function GET() {
  try {
    const email = await requireViewerEmail();
    if (!(await isAdminEmail(email))) {
      return NextResponse.json({ error: '관리자만 실행할 수 있습니다.' }, { status: 403 });
    }

    const result: Record<string, number> = {};
    for (const table of TABLES) {
      const rows = await seedKeyedListFromSheet(table);
      result[table.sheetName] = rows.length;
    }

    return NextResponse.json({ result: 'seeded', counts: result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
