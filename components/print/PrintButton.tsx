'use client';

import { btn } from '@/lib/ui';
import PrinterIcon from '@/components/icons/PrinterIcon';

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={btn}>
      <PrinterIcon />
      인쇄
    </button>
  );
}
