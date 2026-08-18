'use client';

import { btn, btnDanger, inputBase } from '@/lib/ui';
import { AwardPreview } from './CertificateApplyWizard';

export default function AwardApprovalPanel({
  r,
  action,
  staff,
}: {
  r: Record<string, string>;
  action: (formData: FormData) => void;
  staff: Record<string, string>[];
}) {
  const directorName = staff.find((s) => s['재직상태'] === '재직' && s['직급/직책'] === '관장')?.['성명'] ?? '';

  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-[420px] rounded-2xl bg-zinc-100 p-6 dark:bg-black/20">
        <div className="rounded-sm border border-zinc-200 bg-white p-3 shadow-[0_10px_40px_rgba(15,23,42,0.08)] dark:border-zinc-700 dark:bg-zinc-900">
          <div className="border border-zinc-100 p-8 dark:border-zinc-800">
            <AwardPreview kind={r.종류} names={[r.대상자성명]} body={r.본문} directorName={directorName} />
          </div>
        </div>
      </div>

      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="id" value={r.id} />
        <input type="hidden" name="action" value="승인" />
        <button type="submit" className={`${btn} flex-1`}>발급승인</button>
      </form>
      <form action={action} className="flex items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <input type="hidden" name="id" value={r.id} />
        <input type="hidden" name="action" value="반려" />
        <input name="comment" placeholder="반려 사유" className={`${inputBase} flex-1`} />
        <button type="submit" className={btnDanger}>반려</button>
      </form>
    </div>
  );
}
