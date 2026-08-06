'use client';

import { useState } from 'react';

// 표를 그대로 선택해서 복사하면 input/textarea/button 같은 폼 요소가 같이 잡혀서 한글(HWP)에
// 붙여넣었을 때 깨진다. 그래서 별도로 만들어둔 "값만 있는" 표 HTML을 클립보드에 text/html로
// 써서, 한글이 표 자체(병합된 셀 포함)로 인식해 붙여넣기 하도록 한다.
export default function CopyPlanTableButton({ html, className }: { html: string; className?: string }) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle');

  async function onClick() {
    try {
      if (typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) }),
        ]);
      } else {
        await navigator.clipboard.writeText(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
      }
      setStatus('ok');
    } catch {
      setStatus('err');
    }
    setTimeout(() => setStatus('idle'), 2500);
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {status === 'ok' ? '복사 완료 · 한글(HWP)에 붙여넣으세요' : status === 'err' ? '복사 실패 · 표를 직접 선택해 복사하세요' : 'HWP 붙여넣기용 표 복사'}
    </button>
  );
}
