'use server';

import { revalidatePath } from 'next/cache';
import { upsertKeyedRecord } from '@/lib/mutate/keyedTable';
import { APPROVAL_JEONGYEOL_TABLE } from '@/lib/sheets/registry';
import { APPROVAL_LINE_USAGE_MODES, DAMDANG_DISPLAY_MODES } from '@/lib/pages-registry';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { APPROVAL_LINE_SHEET_NAME } from '@/lib/sheets/sheetIds';

export async function setApprovalRuleAction(formData: FormData) {
  const pageId = String(formData.get('pageId') ?? '');
  const pageLabel = String(formData.get('pageLabel') ?? '');
  const jeongyeol = String(formData.get('jeongyeol') ?? '');
  const damdangMode = DAMDANG_DISPLAY_MODES.includes(String(formData.get('damdangMode')))
    ? String(formData.get('damdangMode'))
    : '자동';
  const approvalLineUsage = APPROVAL_LINE_USAGE_MODES.includes(String(formData.get('approvalLineUsage')))
    ? String(formData.get('approvalLineUsage'))
    : '사용';

  if (jeongyeol) {
    const approvalLine = await getSimpleList(APPROVAL_LINE_SHEET_NAME);
    if (!approvalLine.includes(jeongyeol)) {
      throw new Error(`결재라인에 없는 직책입니다: ${jeongyeol}`);
    }
  }

  await upsertKeyedRecord(
    APPROVAL_JEONGYEOL_TABLE,
    { 페이지ID: pageId },
    {
      페이지ID: pageId,
      페이지명: pageLabel,
      전결기준: jeongyeol,
      담당표시: damdangMode,
      결재라인여부: approvalLineUsage,
    }
  );
  revalidatePath('/settings/approval-rules');
}
