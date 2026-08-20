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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cellAt(target: EventTarget | null, minCol: number): Pos | null {
  if (!(target instanceof Element)) return null;
  const cell = target.closest('td[data-row], th[data-row]') as HTMLElement | null;
  if (!cell) return null;
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  if (Number.isNaN(row) || Number.isNaN(col)) return null;
  if (col < minCol) return null;
  return { row, col };
}

export default function CellRangeSelectTable({
  children,
  className,
  minSelectableCol = 0,
}: {
  children: React.ReactNode;
  className?: string;
  // 사업/세부사업 같은 이름표 칸은 드래그 대상에서 아예 제외하고 싶을 때 그 칸의 data-col 값을
  // 넘긴다 — 드래그가 그 칸을 스치거나 거기서 시작해도 무시돼서, 숫자 칸만 정확히 선택된다.
  minSelectableCol?: number;
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

  // children은 서버 컴포넌트가 새 데이터로 다시 렌더링할 때마다(예: 조회월 변경) 새 값이 되는데,
  // Next.js/React가 같은 위치의 td를 재사용(값만 교체)하는 경우 우리가 DOM에 직접 칠해둔
  // background 색은 React가 모르는 변경이라 지워지지 않고 남는다 — 그래서 다른 화면(월)의
  // 셀에 이전 드래그의 하이라이트가 그대로 붙어있는 것처럼 보이는 문제가 생긴다. children이
  // 바뀔 때마다 하이라이트/선택 상태를 명시적으로 초기화해서 이걸 막는다.
  useEffect(() => {
    clearHighlight();
    selectionRef.current = null;
    startRef.current = null;
    draggingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onMouseDown(e: MouseEvent) {
      const pos = cellAt(e.target, minSelectableCol);
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
      const pos = cellAt(e.target, minSelectableCol);
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
      const sortedRows = rows.map((r) => byRow.get(r)!.sort((a, b) => a.col - b.col));
      const text = sortedRows.map((cells) => cells.map((c) => c.text).join('\t')).join('\n');
      if (!text) return;
      e.preventDefault();
      // 탭/줄바꿈 텍스트만 넘기면 한글이 진짜 표(칸 구분)로 인식하지 못하고 전부 한 칸에
      // 그대로 붙여버린다 — 실제 <table><tr><td> 구조를 같이 넘겨야 한글이 표로 인식해서
      // "원본 서식대로 붙여넣기" 선택지도 뜨고 칸도 제대로 나뉜다.
      const html = `<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">${sortedRows
        .map(
          (cells) =>
            `<tr>${cells
              .map((c) => `<td style="border:1px solid #000;padding:2px 6px;">${escapeHtml(c.text)}</td>`)
              .join('')}</tr>`
        )
        .join('')}</table>`;
      e.clipboardData?.setData('text/plain', text);
      e.clipboardData?.setData('text/html', html);
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
  }, [applyHighlight, eachCell, minSelectableCol]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
