'use client';

// 표에서 마우스로 드래그하면 브라우저 기본 텍스트 선택은 DOM 순서(위→아래, 왼쪽→오른쪽)를
// 따라가기 때문에, "특정 칸들만" 드래그해도 그 사이에 낀 다른 칸(예: 세부사업명 칸)까지 통째로
// 선택된다 — 표가 사각형 그리드가 아니라 순차적 텍스트로 취급되기 때문(엑셀과 다름). 이걸
// 우회하려고 자식 table의 각 td/th에 data-row/data-col(필요시 data-colspan)을 매겨두고, 이
// 컴포넌트가 마우스다운~드래그~업을 직접 추적해 순수 사각형 범위만 하이라이트하고, 복사(Ctrl+C)
// 시 그 범위의 칸만 탭/줄바꿈으로 구성한 텍스트를 클립보드에 담는다(브라우저 기본 선택 자체는
// 무시).
import { useCallback, useEffect, useRef } from 'react';

const HL_BG = '#1a73e8';
const HL_FG = '#fff';

type Pos = { row: number; col: number };

function cellAt(target: EventTarget | null): Pos | null {
  if (!(target instanceof Element)) return null;
  const cell = target.closest('td[data-row], th[data-row]') as HTMLElement | null;
  if (!cell) return null;
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  if (Number.isNaN(row) || Number.isNaN(col)) return null;
  return { row, col };
}

export default function CellRangeSelectTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startRef = useRef<Pos | null>(null);
  const selectionRef = useRef<{ r0: number; r1: number; c0: number; c1: number } | null>(null);

  const eachCell = useCallback((cb: (el: HTMLElement, row: number, col: number, colspan: number) => void) => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll('td[data-row], th[data-row]').forEach((elRaw) => {
      const el = elRaw as HTMLElement;
      const row = Number(el.dataset.row);
      const col = Number(el.dataset.col);
      const colspan = Number(el.dataset.colspan || '1');
      cb(el, row, col, colspan);
    });
  }, []);

  const clearHighlight = useCallback(() => {
    eachCell((el) => {
      if (el.dataset.rangeSelected) {
        el.style.background = '';
        el.style.color = '';
        delete el.dataset.rangeSelected;
      }
    });
  }, [eachCell]);

  const applyHighlight = useCallback((r0: number, r1: number, c0: number, c1: number) => {
    clearHighlight();
    const rMin = Math.min(r0, r1);
    const rMax = Math.max(r0, r1);
    const cMin = Math.min(c0, c1);
    const cMax = Math.max(c0, c1);
    eachCell((el, row, col, colspan) => {
      if (row >= rMin && row <= rMax && col <= cMax && col + colspan - 1 >= cMin) {
        el.style.background = HL_BG;
        el.style.color = HL_FG;
        el.dataset.rangeSelected = '1';
      }
    });
  }, [clearHighlight, eachCell]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onMouseDown(e: MouseEvent) {
      const pos = cellAt(e.target);
      if (!pos) return;
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
      draggingRef.current = true;
      startRef.current = pos;
      selectionRef.current = { r0: pos.row, r1: pos.row, c0: pos.col, c1: pos.col };
      applyHighlight(pos.row, pos.row, pos.col, pos.col);
    }
    function onMouseOver(e: MouseEvent) {
      if (!draggingRef.current || !startRef.current) return;
      const pos = cellAt(e.target);
      if (!pos) return;
      selectionRef.current = { r0: startRef.current.row, r1: pos.row, c0: startRef.current.col, c1: pos.col };
      applyHighlight(startRef.current.row, pos.row, startRef.current.col, pos.col);
    }
    function onMouseUp() {
      draggingRef.current = false;
    }
    function onCopy(e: ClipboardEvent) {
      const sel = selectionRef.current;
      if (!sel) return;
      const rMin = Math.min(sel.r0, sel.r1);
      const rMax = Math.max(sel.r0, sel.r1);
      const cMin = Math.min(sel.c0, sel.c1);
      const cMax = Math.max(sel.c0, sel.c1);
      const byRow = new Map<number, { col: number; text: string }[]>();
      eachCell((el, row, col, colspan) => {
        if (row < rMin || row > rMax) return;
        if (col > cMax || col + colspan - 1 < cMin) return;
        if (!byRow.has(row)) byRow.set(row, []);
        byRow.get(row)!.push({ col, text: (el.textContent || '').trim() });
      });
      const rows = [...byRow.keys()].sort((a, b) => a - b);
      const text = rows
        .map((r) => byRow.get(r)!.sort((a, b) => a.col - b.col).map((c) => c.text).join('\t'))
        .join('\n');
      if (!text) return;
      e.preventDefault();
      e.clipboardData?.setData('text/plain', text);
    }

    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mouseover', onMouseOver);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('copy', onCopy);
    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mouseover', onMouseOver);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('copy', onCopy);
    };
  }, [applyHighlight, eachCell]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
