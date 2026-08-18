import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList, upsertKeyedRecord } from '@/lib/mutate/keyedTable';
import {
  DOCUMENT_INDEX_PREFIX_TABLE,
  DOCUMENT_INDEX_STATE_TABLE,
  DOCUMENT_INDEX_TABLE,
} from '@/lib/sheets/registry';
import { getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';

export type DocumentIndexKind = '일반문서' | '스탬프결재';

export type DocumentIndexEntry = {
  id: string;
  팀명: string;
  연도: string;
  권: number;
  구분: DocumentIndexKind;
  일련번호: number | null;
  문서번호: string;
  제목: string;
  월일: string;
  수신: string;
  발신: string;
  정렬순서: number;
  등록일시: string;
  작성자이메일: string;
  작성자명: string;
};

export type DocumentIndexState = { 팀명: string; 연도: string; 현재권: number; 다음일련번호: number };

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export async function getDocumentIndexEntries(팀명: string, 연도: string): Promise<DocumentIndexEntry[]> {
  const rows = await getKeyedList(DOCUMENT_INDEX_TABLE);
  return rows
    .filter((r) => r.id && r.팀명 === 팀명 && r.연도 === 연도)
    .map((r) => ({
      id: r.id,
      팀명: r.팀명,
      연도: r.연도,
      권: num(r.권) || 1,
      구분: (r.구분 === '스탬프결재' ? '스탬프결재' : '일반문서') as DocumentIndexKind,
      일련번호: r.일련번호 ? num(r.일련번호) : null,
      문서번호: r.문서번호,
      제목: r.제목,
      월일: r.월일,
      수신: r.수신,
      발신: r.발신,
      정렬순서: num(r.정렬순서),
      등록일시: r.등록일시,
      작성자이메일: r.작성자이메일,
      작성자명: r.작성자명,
    }))
    .sort((a, b) => a.정렬순서 - b.정렬순서);
}

export async function getDocumentIndexState(팀명: string, 연도: string): Promise<DocumentIndexState> {
  const rows = await getKeyedList(DOCUMENT_INDEX_STATE_TABLE);
  const found = rows.find((r) => r.팀명 === 팀명 && r.연도 === 연도);
  if (!found) return { 팀명, 연도, 현재권: 1, 다음일련번호: 1 };
  return { 팀명, 연도, 현재권: num(found.현재권) || 1, 다음일련번호: num(found.다음일련번호) || 1 };
}

// "새 권 시작" — 담당자가 판단해서 수동으로 넘긴다(고정 건수/연도 자동전환 아님). 현재권만 +1 하고
// 일련번호는 그대로 이어간다(같은 연도 안에서는 권이 바뀌어도 일련번호가 리셋되지 않으므로).
export async function startNewVolume(팀명: string, 연도: string): Promise<void> {
  const state = await getDocumentIndexState(팀명, 연도);
  await upsertKeyedRecord(
    DOCUMENT_INDEX_STATE_TABLE,
    { 팀명, 연도 },
    { 팀명, 연도, 현재권: String(state.현재권 + 1), 다음일련번호: String(state.다음일련번호) }
  );
}

export async function getDocumentIndexPrefixes(): Promise<{ 팀명: string; 접두사: string }[]> {
  const rows = await getKeyedList(DOCUMENT_INDEX_PREFIX_TABLE);
  return rows.filter((r) => r.팀명).map((r) => ({ 팀명: r.팀명, 접두사: r.접두사 }));
}

export async function setDocumentIndexPrefix(팀명: string, 접두사: string): Promise<void> {
  const trimmedTeam = 팀명.trim();
  if (!trimmedTeam) throw new Error('팀을 선택해주세요.');
  await upsertKeyedRecord(DOCUMENT_INDEX_PREFIX_TABLE, { 팀명: trimmedTeam }, { 팀명: trimmedTeam, 접두사: 접두사.trim() });
}

export async function addDocumentIndexEntry(params: {
  팀명: string;
  연도: string;
  구분: DocumentIndexKind;
  제목: string;
  월일: string;
  수신: string;
  발신: string;
}): Promise<void> {
  const { 팀명, 연도, 구분, 제목, 월일, 수신, 발신 } = params;
  if (!팀명 || !연도 || !제목.trim()) throw new Error('팀/연도/제목은 필수입니다.');

  const [state, entries] = await Promise.all([
    getDocumentIndexState(팀명, 연도),
    getDocumentIndexEntries(팀명, 연도),
  ]);
  const nextOrder = Math.max(0, ...entries.map((e) => e.정렬순서)) + 1;

  let 일련번호 = '';
  let 문서번호 = '';
  if (구분 === '일반문서') {
    const prefixes = await getDocumentIndexPrefixes();
    const prefix = prefixes.find((p) => p.팀명 === 팀명)?.접두사;
    if (!prefix) throw new Error('먼저 설정 화면(색인목록 접두사)에서 이 팀의 문서번호 접두사를 등록해주세요.');
    일련번호 = String(state.다음일련번호);
    문서번호 = `${prefix}-${state.다음일련번호}호`;
    await upsertKeyedRecord(
      DOCUMENT_INDEX_STATE_TABLE,
      { 팀명, 연도 },
      { 팀명, 연도, 현재권: String(state.현재권), 다음일련번호: String(state.다음일련번호 + 1) }
    );
  }

  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();

  await addKeyedRecord(DOCUMENT_INDEX_TABLE, {
    id: randomUUID(),
    팀명,
    연도,
    권: String(state.현재권),
    구분,
    일련번호,
    문서번호,
    제목: 제목.trim(),
    월일: 월일.trim(),
    수신: 수신.trim(),
    발신: 발신.trim(),
    정렬순서: String(nextOrder),
    등록일시: nowTimestamp(),
    작성자이메일: viewerEmail,
    작성자명: me?.성명 ?? '',
  });
}

// 지우는 문서가 그 팀+연도에서 가장 마지막으로 발급된 번호일 때만 카운터를 되돌려 재사용한다
// (다음 등록이 그 번호를 다시 씀). 중간 번호를 지우면 그 뒤로 이미 더 큰 번호가 발급되어 있어
// 재사용 시 번호가 겹치므로 결번으로 남긴다(취소선 긋고 다시 쓸 수 있는 건 맨 마지막 줄뿐인 것과 같은 이치).
export async function deleteDocumentIndexEntry(id: string): Promise<void> {
  const rows = await getKeyedList(DOCUMENT_INDEX_TABLE);
  const entry = rows.find((r) => r.id === id);
  await deleteKeyedRecord(DOCUMENT_INDEX_TABLE, { id });
  if (!entry || entry.구분 !== '일반문서' || !entry.일련번호) return;

  const seq = num(entry.일련번호);
  const state = await getDocumentIndexState(entry.팀명, entry.연도);
  if (seq > 0 && seq === state.다음일련번호 - 1) {
    await upsertKeyedRecord(
      DOCUMENT_INDEX_STATE_TABLE,
      { 팀명: entry.팀명, 연도: entry.연도 },
      { 팀명: entry.팀명, 연도: entry.연도, 현재권: String(state.현재권), 다음일련번호: String(seq) }
    );
  }
}
