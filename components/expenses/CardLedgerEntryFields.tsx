'use client';

import { useState } from 'react';
import { input, label } from '@/lib/ui';

export default function CardLedgerEntryFields({
  defaultAmount,
  defaultExempt,
  defaultExemptReason,
  reportThreshold,
}: {
  defaultAmount?: string;
  defaultExempt?: boolean;
  defaultExemptReason?: string;
  reportThreshold: number;
}) {
  const [amount, setAmount] = useState(defaultAmount ?? '');
  const [exempt, setExempt] = useState(defaultExempt ?? false);

  const amt = Number(amount) || 0;
  const needsReport = reportThreshold > 0 && amt >= reportThreshold;

  let hint: string;
  if (exempt) {
    hint = '물품검수 불요로 처리되어 사진/조서 등록 없이 바로 저장됩니다. 사유가 함께 기록되어 회계가 언제든 조회할 수 있습니다.';
  } else if (needsReport) {
    hint = `저장 후 물품검수사진과 물품검수조서를 이어서 등록합니다. (${reportThreshold.toLocaleString()}원 이상 - 조서 필요)`;
  } else {
    hint = '저장 후 물품검수사진을 이어서 등록합니다.';
  }

  return (
    <>
      <label className={label}>
        사용금액 *
        <input
          type="number"
          name="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className={input}
        />
      </label>
      <div className="col-span-2 rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 p-3">
        <label className="text-sm flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="exempt" checked={exempt} onChange={(e) => setExempt(e.target.checked)} />
          물품검수 불요 (자동이체, 정기결제 등)
        </label>
        {exempt && (
          <input
            name="exemptReason"
            defaultValue={defaultExemptReason ?? ''}
            placeholder="사유를 입력하세요 (예: 공공요금 자동이체)"
            required
            className={`${input} mt-2`}
          />
        )}
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">{hint}</p>
      </div>
    </>
  );
}
