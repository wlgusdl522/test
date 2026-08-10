'use client';

import { useState } from 'react';

// 화면에 실제로 렌더링된 표(outerHTML)를 그대로 클립보드에 text/html로 담아 붙여넣기 시
// 표 구조와 인라인 스타일(테두리·배경 등)이 그대로 유지되게 한다 — 별도로 만든 HTML 문자열을
// 복사하면 화면과 다르게 보일 수 있어 항상 화면에 있는 실제 엘리먼트를 기준으로 복사한다.
export default function CopyPlanTableButton({ targetId, className }: { targetId: string; className?: string }) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle');

  async function onClick() {
    const el = document.getElementById(targetId);
    if (!el) {
      setStatus('err');
      setTimeout(() => setStatus('idle'), 2500);
      return;
    }
    try {
      if (typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([el.outerHTML], { type: 'text/html' }),
            'text/plain': new Blob([el.textContent ?? ''], { type: 'text/plain' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(el.textContent ?? '');
      }
      setStatus('ok');
    } catch {
      setStatus('err');
    }
    setTimeout(() => setStatus('idle'), 2500);
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {status === 'ok' ? '복사 완료 · 한글(HWP)에 붙여넣으세요' : status === 'err' ? '복사 실패 · 표를 직접 선택해 복사하세요' : '표 복사(한글 붙여넣기용)'}
    </button>
  );
}
