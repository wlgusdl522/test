import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { getSheetsClient } from '@/lib/sheets/client';
import {
  DOCUMENT_INDEX_TABLE,
  DOCUMENT_INDEX_STATE_TABLE,
  DOCUMENT_INDEX_PREFIX_TABLE,
} from '@/lib/sheets/registry';
import { seedKeyedListFromSheet, upsertKeyedRecord } from '@/lib/mutate/keyedTable';
import { getDocumentIndexPrefixes } from '@/lib/mutate/documentIndex';

// 일회성 이관 라우트 — 실행 후 삭제할 것. "2026년 복지2팀 문서등록철" 원본(1권~7권 탭,
// No/문서번호/제목/월・일/수신/발신)을 읽어 색인목록/색인목록상태/색인목록접두사로 옮겨 적는다.
// 문서번호는 재계산하지 않고 원본 텍스트를 그대로 보존한다(이미 발급된 번호이므로).
const SOURCE_SPREADSHEET_ID = '1FFoj5cBUU5pLth8bQUHblTf0hrRAgCGw6MCGW3Rg7cw';
const TEAM = '복지2팀';
const YEAR = '2026';

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export async function GET() {
  try {
    const email = await requireViewerEmail();
    if (!(await isAdminEmail(email))) {
      return NextResponse.json({ error: '관리자만 실행할 수 있습니다.' }, { status: 403 });
    }

    const sheets = getSheetsClient();
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SOURCE_SPREADSHEET_ID });
    const volumeTabs = (meta.data.sheets ?? [])
      .map((s) => s.properties?.title ?? '')
      .map((title) => {
        const m = title.match(/^(\d+)권$/);
        return m ? { title, 권: Number(m[1]) } : null;
      })
      .filter((t): t is { title: string; 권: number } => t !== null)
      .sort((a, b) => a.권 - b.권);

    if (volumeTabs.length === 0) {
      return NextResponse.json({ error: '"N권" 형식의 탭을 찾지 못했습니다.' }, { status: 400 });
    }

    const records: Record<string, string>[] = [];
    const unparsed: { 권: number; No: string; 문서번호: string }[] = [];
    let 정렬순서 = 0;
    let maxSeq = 0;
    let parsedPrefix = '';

    for (const tab of volumeTabs) {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SOURCE_SPREADSHEET_ID,
        range: `${tab.title}!A3:F1000`,
      });
      const rows = (res.data.values ?? []) as string[][];
      for (const row of rows) {
        const No = (row[0] ?? '').toString().trim();
        if (!No) continue; // 빈 행(그 권의 끝)
        const 원본문서번호 = (row[1] ?? '').toString().trim();
        const 제목 = (row[2] ?? '').toString().trim();
        const 월일 = (row[3] ?? '').toString().trim();
        const 수신 = (row[4] ?? '').toString().trim();
        const 발신 = (row[5] ?? '').toString().trim();

        정렬순서 += 1;
        const id = randomUUID();

        if (원본문서번호.includes('스탬프')) {
          records.push({
            id, 팀명: TEAM, 연도: YEAR, 권: String(tab.권), 구분: '스탬프결재',
            일련번호: '', 문서번호: '', 제목, 월일, 수신, 발신,
            정렬순서: String(정렬순서), 등록일시: '', 작성자이메일: '', 작성자명: '',
          });
          continue;
        }

        const m = 원본문서번호.match(/^(.*)-(\d+)\s*호\s*$/);
        if (m) {
          const seq = Number(m[2]);
          if (!parsedPrefix) parsedPrefix = m[1].trim();
          if (seq > maxSeq) maxSeq = seq;
          records.push({
            id, 팀명: TEAM, 연도: YEAR, 권: String(tab.권), 구분: '일반문서',
            일련번호: String(seq), 문서번호: 원본문서번호, 제목, 월일, 수신, 발신,
            정렬순서: String(정렬순서), 등록일시: '', 작성자이메일: '', 작성자명: '',
          });
        } else {
          unparsed.push({ 권: tab.권, No, 문서번호: 원본문서번호 });
          records.push({
            id, 팀명: TEAM, 연도: YEAR, 권: String(tab.권), 구분: '일반문서',
            일련번호: '', 문서번호: 원본문서번호, 제목, 월일, 수신, 발신,
            정렬순서: String(정렬순서), 등록일시: '', 작성자이메일: '', 작성자명: '',
          });
        }
      }
    }

    if (records.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: DOCUMENT_INDEX_TABLE.spreadsheetId,
        range: `${DOCUMENT_INDEX_TABLE.sheetName}!A3`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: records.map((r) => DOCUMENT_INDEX_TABLE.headers.map((h) => r[h] ?? '')) },
      });
    }
    await seedKeyedListFromSheet(DOCUMENT_INDEX_TABLE);

    // 상태/접두사는 팀+연도(또는 팀)당 한 행뿐이어야 하므로, 이미 테스트 중 생긴 행이 있어도
    // 중복이 안 생기게 upsert(있으면 덮어쓰기, 없으면 추가)로 처리한다.
    const 현재권 = Math.max(...volumeTabs.map((t) => t.권));
    await upsertKeyedRecord(
      DOCUMENT_INDEX_STATE_TABLE,
      { 팀명: TEAM, 연도: YEAR },
      { 팀명: TEAM, 연도: YEAR, 현재권: String(현재권), 다음일련번호: String(maxSeq + 1) }
    );

    const existingPrefixes = await getDocumentIndexPrefixes();
    let 접두사처리 = 'skip_existing';
    if (!existingPrefixes.find((p) => p.팀명 === TEAM)?.접두사 && parsedPrefix) {
      await upsertKeyedRecord(DOCUMENT_INDEX_PREFIX_TABLE, { 팀명: TEAM }, { 팀명: TEAM, 접두사: parsedPrefix });
      접두사처리 = 'set';
    }

    return NextResponse.json({
      result: 'ok',
      가져온행수: records.length,
      권목록: volumeTabs.map((t) => t.title),
      현재권,
      다음일련번호: maxSeq + 1,
      인식된접두사: parsedPrefix,
      접두사처리,
      등록일시: nowTimestamp(),
      파싱실패행: unparsed,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
