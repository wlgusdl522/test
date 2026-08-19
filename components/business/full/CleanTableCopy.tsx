'use client';

import { useEffect } from 'react';

// 드래그로 표를 선택해 Ctrl+C로 복사하면 브라우저가 기본으로 화면의 실제 글자체·색상·크기
// 스타일까지 그대로 클립보드에 담아서, 한글에 "원본 형식 유지"로 붙이면 문서 서식과 안 맞아
// 깨져 보인다. 그래서 표 구조(행/열, colspan/rowspan)만 남기고 스타일은 전부 걷어낸 새
// 엘리먼트로 다시 만들어 클립보드에 덮어써서, 한글이 자기 기본 서식으로 표를 그리게 한다.
const STRUCTURAL_TAGS = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col']);

function cleanClone(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent ?? '');
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (tag === 'script' || tag === 'style') return null;
  if (tag === 'br') return document.createElement('br');

  const outTag = STRUCTURAL_TAGS.has(tag) ? tag : 'span';
  const clone = document.createElement(outTag);
  if (tag === 'table') {
    clone.setAttribute('border', '1');
    clone.setAttribute('cellspacing', '0');
    clone.setAttribute('cellpadding', '4');
  }
  const colspan = el.getAttribute('colspan');
  const rowspan = el.getAttribute('rowspan');
  if (colspan) clone.setAttribute('colspan', colspan);
  if (rowspan) clone.setAttribute('rowspan', rowspan);

  Array.from(el.childNodes).forEach((child) => {
    const c = cleanClone(child);
    if (c) clone.appendChild(c);
  });
  return clone;
}

export default function CleanTableCopy({ containerId }: { containerId: string }) {
  useEffect(() => {
    function onCopy(e: ClipboardEvent) {
      const container = document.getElementById(containerId);
      const sel = document.getSelection();
      if (!container || !sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) return;

      const frag = range.cloneContents();
      const wrapper = document.createElement('div');
      Array.from(frag.childNodes).forEach((n) => {
        const c = cleanClone(n);
        if (c) wrapper.appendChild(c);
      });
      if (!wrapper.innerHTML) return;

      e.clipboardData?.setData('text/html', wrapper.innerHTML);
      e.clipboardData?.setData('text/plain', sel.toString());
      e.preventDefault();
    }
    document.addEventListener('copy', onCopy);
    return () => document.removeEventListener('copy', onCopy);
  }, [containerId]);

  return null;
}
