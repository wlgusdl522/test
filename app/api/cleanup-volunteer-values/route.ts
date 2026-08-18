import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { deleteKeyedRecords, getKeyedList } from '@/lib/mutate/keyedTable';
import { getModuleItems } from '@/lib/mutate/boardStat';
import { BOARD_STAT_VALUE_TABLE } from '@/lib/sheets/registry';

// 일회성 정리 라우트 — 실행 후 삭제할 것. 자원봉사자는 이제 명단에서 실제 인원을 계산하므로
// 예전에 손으로 입력했던 금월실적 값(이사회월별값 시트의 자원봉사자 항목 행)은 더 이상 안 쓴다.
export async function GET() {
  try {
    const email = await requireViewerEmail();
    if (!(await isAdminEmail(email))) {
      return NextResponse.json({ error: '관리자만 실행할 수 있습니다.' }, { status: 403 });
    }

    const items = await getModuleItems('자원봉사자');
    const itemIds = new Set(items.map((i) => i.id));
    const rows = await getKeyedList(BOARD_STAT_VALUE_TABLE);
    const toDelete = rows
      .filter((r) => itemIds.has(r.항목ID))
      .map((r) => ({ 항목ID: r.항목ID, 시설: r.시설, 년월: r.년월 }));

    if (toDelete.length === 0) {
      return NextResponse.json({ result: '지울 데이터 없음' });
    }

    await deleteKeyedRecords(BOARD_STAT_VALUE_TABLE, toDelete);
    return NextResponse.json({ result: 'deleted', count: toDelete.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
