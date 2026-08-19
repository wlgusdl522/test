'use client';

import { useState } from 'react';

// 화면에 실제로 렌더링된 표(outerHTML)를 그대로 클립보드에 text/html로 담아 붙여넣기 시
// 표 구조와 인라인 스타일(테두리·배경 등)이 그대로 유지되게 한다 — 별도로 만든 HTML 문자열을
// 복사하면 화면과 다르게 보일 수 있어 항상 화면에 있는 실제 엘리먼트를 기준으로 복사한다.
function copyAsHtml(el: HTMLElement) {
  if (typeof ClipboardItem !== 'undefined') {
    return navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([el.outerHTML], { type: 'text/html' }),
        'text/plain': new Blob([el.textContent ?? ''], { type: 'text/plain' }),
      }),
    ]);
  }
  return navigator.clipboard.writeText(el.textContent ?? '');
}

// 표/서식을 그대로 붙여넣으면 rowspan·좌우분할 같은 복잡한 표 구조가 한글에서 깨져 보일 수 있어,
// 셀은 탭으로 행은 줄바꿈으로만 구분한 순수 텍스트만 뽑아내는 모드. 중첩된 div/p마다 줄바꿈이
// 겹치는 걸 막기 위해 마지막에 빈 줄을 정리한다.
function nodeToText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (tag === 'br') return '\n';
  if (tag === 'script' || tag === 'style') return '';
  const inner = Array.from(el.childNodes).map(nodeToText).join('');
  if (tag === 'td' || tag === 'th') return `${inner}\t`;
  if (tag === 'tr') return `${inner.replace(/\t+$/, '')}\n`;
  if (tag === 'div' || tag === 'p' || tag === 'li' || tag === 'table') return `${inner}\n`;
  return inner;
}

function elementToPlainText(el: HTMLElement): string {
  return nodeToText(el)
    .split('\n')
    .map((line) => line.replace(/[\t ]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function CopyPlanTableButton({
  targetId,
  className,
  mode = 'html',
}: {
  targetId: string;
  className?: string;
  mode?: 'html' | 'text';
}) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle');

  async function onClick() {
    const el = document.getElementById(targetId);
    if (!el) {
      setStatus('err');
      setTimeout(() => setStatus('idle'), 2500);
      return;
    }
    try {
      if (mode === 'text') {
        await navigator.clipboard.writeText(elementToPlainText(el));
      } else {
        await copyAsHtml(el);
      }
      setStatus('ok');
    } catch {
      setStatus('err');
    }
    setTimeout(() => setStatus('idle'), 2500);
  }

  const idleLabel = mode === 'text' ? '텍스트 복사(한글 붙여넣기용)' : '표 복사(한글 붙여넣기용)';

  return (
    <button type="button" onClick={onClick} className={className}>
      {status === 'ok' ? '복사 완료 · 한글(HWP)에 붙여넣으세요' : status === 'err' ? '복사 실패 · 직접 선택해 복사하세요' : idleLabel}
    </button>
  );
}
