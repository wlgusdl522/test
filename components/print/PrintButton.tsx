'use client';

import { btnSecondary } from '@/lib/ui';

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={btnSecondary}>
      인쇄
    </button>
  );
}
