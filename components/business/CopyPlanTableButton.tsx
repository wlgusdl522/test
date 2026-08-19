'use client';

import { useState } from 'react';

// 화면에 실제로 렌더링된 표(outerHTML)를 그대로 클립보드에 text/html로 담아 붙여넣기 시
// 표 구조와 인라인 스타일(테두리·배경 등)이 그대로 유지되게 한다 — 별도로 만든 HTML 문자열을
// 복사하면 화면과 다르게 보일 수 있어 항상 화면에 있는 실제 엘리먼트를 기준으로 복사한다.
// 한글에 "원본 형식 유지"로 붙여넣은 뒤 전체 선택해서 글자체만 한 번에 바꾸는 방식이 더
// 빠르다는 판단으로, 서식을 걷어내는 다른 모드는 만들었다가 다시 걷어냄.
//
// 단, display:flex로 표를 나란히 배치한 곳(후원금 좌우분할, 회계 수입/지출 좌우배치)은
// 한글이 flex 레이아웃을 이해하지 못해 표 경계가 헷갈리게 붙여넣어지므로, 복사할 때만
// 그 flex 속성을 걷어낸다(표가 나란히 대신 세로로 붙지만 경계는 명확해짐). 나머지 서식은
// 그대로 둔다.
function stripFlexLayout(root: HTMLElement): HTMLElement {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
    if (el.style.display === 'flex' || el.style.display === 'inline-flex') {
      el.style.removeProperty('display');
      el.style.removeProperty('flex-direction');
      el.style.removeProperty('flex');
      el.style.removeProperty('gap');
    }
  });
  return clone;
}

function copyAsHtml(el: HTMLElement) {
  const cleaned = stripFlexLayout(el);
  if (typeof ClipboardItem !== 'undefined') {
    return navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([cleaned.outerHTML], { type: 'text/html' }),
        'text/plain': new Blob([el.textContent ?? ''], { type: 'text/plain' }),
      }),
    ]);
  }
  return navigator.clipboard.writeText(el.textContent ?? '');
}

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
      await copyAsHtml(el);
      setStatus('ok');
    } catch {
      setStatus('err');
    }
    setTimeout(() => setStatus('idle'), 2500);
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {status === 'ok' ? '복사 완료 · 한글(HWP)에 붙여넣으세요' : status === 'err' ? '복사 실패 · 표를 직접 선택해 복사하세요' : '원본 서식 그대로 복사'}
    </button>
  );
}
