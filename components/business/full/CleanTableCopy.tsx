'use client';

import { useEffect } from 'react';
import { cleanHtmlFromSelection } from '@/lib/cleanTableHtml';

// 드래그로 표를 선택해 Ctrl+C로 복사하면 브라우저가 기본으로 화면의 실제 글자체·색상·크기까지
// 그대로 클립보드에 담아서, 한글에 "원본 형식 유지"로 붙이면 문서 서식과 안 맞아 깨져 보인다.
// 그래서 copy 이벤트를 가로채 선택 범위를 표 구조 중심으로 정리한 HTML로 덮어쓴다.
export default function CleanTableCopy({ containerId }: { containerId: string }) {
  useEffect(() => {
    function onCopy(e: ClipboardEvent) {
      const container = document.getElementById(containerId);
      const sel = document.getSelection();
      if (!container || !sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) return;

      const html = cleanHtmlFromSelection(range, container);
      if (!html) return;

      e.clipboardData?.setData('text/html', html);
      e.clipboardData?.setData('text/plain', sel.toString());
      e.preventDefault();
    }
    document.addEventListener('copy', onCopy);
    return () => document.removeEventListener('copy', onCopy);
  }, [containerId]);

  return null;
}
