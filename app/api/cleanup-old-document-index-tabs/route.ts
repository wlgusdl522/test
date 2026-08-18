import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { getSheetsClient } from '@/lib/sheets/client';
import { WORKLOG_SHEET_ID } from '@/lib/sheets/sheetIds';
import { DOCUMENT_INDEX_TABLE, DOCUMENT_INDEX_STATE_TABLE, DOCUMENT_INDEX_PREFIX_TABLE } from '@/lib/sheets/registry';

// 일회성 정리 라우트 — 실행 후 삭제할 것. 색인목록을 새 스프레드시트("8. 색인목록")로 옮긴 뒤
// "5. 총괄업무일지"에 남아있던 옛 색인목록/색인목록상태/색인목록접두사 탭을 삭제한다.
const OLD_TAB_NAMES = [DOCUMENT_INDEX_TABLE, DOCUMENT_INDEX_STATE_TABLE, DOCUMENT_INDEX_PREFIX_TABLE].map(
  (t) => t.sheetName
);

export async function GET() {
  try {
    const email = await requireViewerEmail();
    if (!(await isAdminEmail(email))) {
      return NextResponse.json({ error: '관리자만 실행할 수 있습니다.' }, { status: 403 });
    }

    const sheets = getSheetsClient();
    const meta = await sheets.spreadsheets.get({ spreadsheetId: WORKLOG_SHEET_ID });
    const 실제탭목록 = meta.data.sheets ?? [];

    const results: Record<string, 'deleted' | 'not_found'> = {};
    const requests: { deleteSheet: { sheetId: number } }[] = [];
    for (const name of OLD_TAB_NAMES) {
      const sheet = 실제탭목록.find((s) => s.properties?.title === name);
      if (sheet?.properties?.sheetId != null) {
        requests.push({ deleteSheet: { sheetId: sheet.properties.sheetId } });
        results[name] = 'deleted';
      } else {
        results[name] = 'not_found';
      }
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: WORKLOG_SHEET_ID,
        requestBody: { requests },
      });
    }

    return NextResponse.json({ result: 'ok', tabs: results });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
