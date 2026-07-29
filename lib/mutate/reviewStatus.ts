import { randomUUID } from 'crypto';
import { addKeyedRecord, getKeyedList, updateKeyedRecord } from '@/lib/mutate/keyedTable';
import { REVIEW_STATUS_TABLE } from '@/lib/sheets/registry';
import { getViewerStaffRecord, requireIsSupervisorForTeam, requireViewerEmail } from '@/lib/auth-helpers';

export type ReviewCompletion = { 완료여부: boolean; 확인자명: string; 확인일시: string };

export async function getReviewCompletionStatus(weekStart: string): Promise<Record<string, ReviewCompletion>> {
  const all = await getKeyedList(REVIEW_STATUS_TABLE);
  const result: Record<string, ReviewCompletion> = {};
  all.forEach((rec) => {
    if (!rec['소속팀'] || rec['주시작일'] !== weekStart) return;
    result[rec['소속팀']] = {
      완료여부: rec['완료여부'] === 'TRUE' || rec['완료여부'] === 'true',
      확인자명: rec['확인자명'] ?? '',
      확인일시: rec['확인일시'] ?? '',
    };
  });
  return result;
}

// 부서장이 그 팀/그 주 검토를 마쳤다고 표시(또는 취소)한다 — 본인 업무 예외 없이 부서장만 가능.
export async function setReviewCompletion(team: string, weekStart: string, flag: boolean): Promise<void> {
  await requireIsSupervisorForTeam(team);
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();

  const all = await getKeyedList(REVIEW_STATUS_TABLE);
  const existing = all.find((r) => r['소속팀'] === team && r['주시작일'] === weekStart);
  const id = existing?.id ?? randomUUID();
  const record: Record<string, string> = {
    id,
    소속팀: team,
    주시작일: weekStart,
    완료여부: String(flag).toUpperCase(),
    확인자이메일: viewerEmail,
    확인자명: me?.['성명'] ?? '',
    확인일시: new Date().toISOString().slice(0, 19).replace('T', ' '),
  };
  if (existing) {
    await updateKeyedRecord(REVIEW_STATUS_TABLE, { id }, record);
  } else {
    await addKeyedRecord(REVIEW_STATUS_TABLE, record);
  }
}
