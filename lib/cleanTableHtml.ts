// 한글(HWP)에 표를 붙여넣을 때, 화면의 인라인 스타일(글자체·색상·크기)을 그대로 넘기면 문서
// 서식과 안 맞아 깨져 보인다. 그래서 표 구조(행/열, colspan/rowspan)는 그대로 살리고,
// 굵게/정렬/테두리처럼 문서 서식과 충돌하지 않는 최소한의 서식만 남긴 새 엘리먼트로 다시
// 만든다. table/thead/tbody/tr/th/td 등 구조 태그가 아닌 나머지는 span으로 낮춰서 실제
// 별도 표 여러 개를 한 번에 복사해도 한글에서 각각 독립된 표로 들어가게 한다.
const STRUCTURAL_TAGS = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col']);

// getComputedStyle을 쓰는 이유: 이 함수가 복사하는 표들 중 일부는 인라인 style이 아니라
// Tailwind 클래스(className)로 테두리·배경을 준다 — el.style만 읽으면 그런 표는 서식이 전부
// 빈 값으로 나온다. computed style은 클래스든 인라인이든 최종 렌더링 결과를 그대로 읽어온다.
function safeStyleAttr(el: Element): string {
  if (typeof window === 'undefined' || el.nodeType !== Node.ELEMENT_NODE) return '';
  const style = window.getComputedStyle(el);
  const parts: string[] = [];
  if (Number(style.fontWeight) >= 700 || style.fontWeight === 'bold') parts.push('font-weight:bold');
  if (style.textAlign === 'right' || style.textAlign === 'center') parts.push(`text-align:${style.textAlign}`);
  if (style.borderTopWidth !== '0px' && style.borderTopStyle !== 'none') {
    parts.push(`border:${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`);
  }
  if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
    parts.push(`background:${style.backgroundColor}`);
  }
  return parts.join(';');
}

export function cleanCloneNode(node: Node): Node | null {
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
  const style = safeStyleAttr(el);
  if (style) clone.setAttribute('style', style);

  Array.from(el.childNodes).forEach((child) => {
    const c = cleanCloneNode(child);
    if (c) clone.appendChild(c);
  });
  return clone;
}

// 원래 화면에서 flex로 나란히(좌우) 배치했던 표들은 정리 과정에서 감싸던 div가 span으로
// 낮춰지면서 표 두 개가 사이 구분 없이 바로 붙는다 — 한글은 표 사이에 문단 구분이 없으면
// 하나의 표로 합쳐버리므로, 표가 연속으로 붙어있으면 그 사이에 문단(빈 줄)을 끼워 넣는다.
export function insertTableSeparators(root: Element): void {
  function walk(el: Element) {
    const children = Array.from(el.children);
    for (let i = 0; i < children.length - 1; i++) {
      if (children[i].tagName === 'TABLE' && children[i + 1].tagName === 'TABLE') {
        const sep = document.createElement('p');
        sep.textContent = ' ';
        el.insertBefore(sep, children[i + 1]);
      }
    }
    children.forEach(walk);
  }
  walk(root);
}

export function cleanHtmlFromNodes(nodes: ArrayLike<Node>): string {
  const wrapper = document.createElement('div');
  Array.from(nodes).forEach((n) => {
    const c = cleanCloneNode(n);
    if (c) wrapper.appendChild(c);
  });
  insertTableSeparators(wrapper);
  return wrapper.innerHTML;
}

// 드래그로 표 여러 셀에 걸쳐 선택했을 때 range.cloneContents()만 믿고 그대로 잘라내면, 드래그가
// 셀 중간 지점에서 끝난 경우 브라우저가 그 지점 이후의 표 구조(뒤 이어지는 행/셀 경계)를 정확히
// 복원해주지 못해 내용이 한 칸에 뭉쳐 버리는 경우가 있다. 그래서 텍스트 잘라내기 대신, 선택 범위가
// "닿은" 행/셀을 표에서 직접 찾아(range.intersectsNode) 그 셀을 통째로(잘리지 않게) 복사한다 —
// 드래그가 셀 중간에서 끝나도 그 셀 전체가, 건너뛴 셀은 빠진 채로 들어간다.
function cloneCellWhole(cell: Element): Element {
  const tag = cell.tagName.toLowerCase() === 'th' ? 'th' : 'td';
  const clone = document.createElement(tag);
  const colspan = cell.getAttribute('colspan');
  const rowspan = cell.getAttribute('rowspan');
  if (colspan) clone.setAttribute('colspan', colspan);
  if (rowspan) clone.setAttribute('rowspan', rowspan);
  const style = safeStyleAttr(cell);
  if (style) clone.setAttribute('style', style);
  Array.from(cell.childNodes).forEach((child) => {
    const c = cleanCloneNode(child);
    if (c) clone.appendChild(c);
  });
  return clone;
}

function buildTableFromRange(table: HTMLTableElement, range: Range): Element | null {
  const outTable = document.createElement('table');
  outTable.setAttribute('border', '1');
  outTable.setAttribute('cellspacing', '0');
  outTable.setAttribute('cellpadding', '4');
  let rowCount = 0;
  Array.from(table.rows).forEach((row) => {
    if (!range.intersectsNode(row)) return;
    const outRow = document.createElement('tr');
    let cellCount = 0;
    Array.from(row.cells).forEach((cell) => {
      if (!range.intersectsNode(cell)) return;
      outRow.appendChild(cloneCellWhole(cell));
      cellCount += 1;
    });
    if (cellCount > 0) {
      outTable.appendChild(outRow);
      rowCount += 1;
    }
  });
  return rowCount > 0 ? outTable : null;
}

export function cleanHtmlFromSelection(range: Range, container: Element): string {
  const wrapper = document.createElement('div');
  const tables = Array.from(container.querySelectorAll('table'));
  const touched = tables.filter((t) => range.intersectsNode(t));

  if (touched.length === 0) {
    // 표가 아닌 일반 텍스트 선택은 기존 방식(잘라낸 그대로) 그대로 둔다.
    const frag = range.cloneContents();
    Array.from(frag.childNodes).forEach((n) => {
      const c = cleanCloneNode(n);
      if (c) wrapper.appendChild(c);
    });
  } else {
    touched.forEach((table) => {
      const built = buildTableFromRange(table, range);
      if (built) wrapper.appendChild(built);
    });
  }

  insertTableSeparators(wrapper);
  return wrapper.innerHTML;
}
