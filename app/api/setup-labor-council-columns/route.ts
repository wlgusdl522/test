import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { getSheetsClient } from '@/lib/sheets/client';
import { LABOR_COUNCIL_AGENDA_TABLE, LABOR_COUNCIL_ROUND_INFO_TABLE } from '@/lib/sheets/registry';

// 일회성 스키마 보정 라우트 — 실행 후 삭제할 것.
// 노사협의회안건에 '공개여부'/'상태'/'상정회차' 컬럼, 노사협의회회차정보(회의 등록으로 용도 변경)에
// '회의일시'/'회의장소'/'상태' 컬럼을 뒤에 추가한다(기존 데이터 위치는 안 밀림).
function colLetter(n: number): string {
  let s = '';
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

export async function GET() {
  try {
    const email = await requireViewerEmail();
    if (!(await isAdminEmail(email))) {
      return NextResponse.json({ error: '관리자만 실행할 수 있습니다.' }, { status: 403 });
    }

    const sheets = getSheetsClient();

    await sheets.spreadsheets.values.update({
      spreadsheetId: LABOR_COUNCIL_AGENDA_TABLE.spreadsheetId,
      range: `${LABOR_COUNCIL_AGENDA_TABLE.sheetName}!${colLetter(LABOR_COUNCIL_AGENDA_TABLE.headers.length - 2)}2:${colLetter(LABOR_COUNCIL_AGENDA_TABLE.headers.length)}2`,
      valueInputOption: 'RAW',
      requestBody: { values: [['공개여부', '상태', '상정회차']] },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: LABOR_COUNCIL_ROUND_INFO_TABLE.spreadsheetId,
      range: `${LABOR_COUNCIL_ROUND_INFO_TABLE.sheetName}!${colLetter(LABOR_COUNCIL_ROUND_INFO_TABLE.headers.length - 2)}2:${colLetter(LABOR_COUNCIL_ROUND_INFO_TABLE.headers.length)}2`,
      valueInputOption: 'RAW',
      requestBody: { values: [['회의일시', '회의장소', '상태']] },
    });

    return NextResponse.json({ result: 'ok', columns: '노사협의회안건(공개여부/상태/상정회차), 노사협의회회차정보(회의일시/회의장소/상태) 추가 완료' });
  } catch (err) {
    console.error('[setup-labor-council-columns]', err);
    const message = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
