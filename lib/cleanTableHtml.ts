// 한글(HWP)에 표를 붙여넣을 때, 화면의 인라인 스타일(글자체·색상·크기)을 그대로 넘기면 문서
// 서식과 안 맞아 깨져 보인다. 그래서 표 구조(행/열, colspan/rowspan)는 그대로 살리고,
// 굵게/정렬/테두리처럼 문서 서식과 충돌하지 않는 최소한의 서식만 남긴 새 엘리먼트로 다시
// 만든다. table/thead/tbody/tr/th/td 등 구조 태그가 아닌 나머지는 span으로 낮춰서 실제
// 별도 표 여러 개를 한 번에 복사해도 한글에서 각각 독립된 표로 들어가게 한다.
const STRUCTURAL_TAGS = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col']);

function safeStyleAttr(el: Element): string {
  const style = (el as HTMLElement).style;
  if (!style) return '';
  const parts: string[] = [];
  if (style.fontWeight === '700' || style.fontWeight === 'bold') parts.push('font-weight:bold');
  if (style.textAlign === 'right' || style.textAlign === 'center') parts.push(`text-align:${style.textAlign}`);
  if (style.border) parts.push(`border:${style.border}`);
  if (style.borderCollapse) parts.push(`border-collapse:${style.borderCollapse}`);
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

export function cleanHtmlFromNodes(nodes: ArrayLike<Node>): string {
  const wrapper = document.createElement('div');
  Array.from(nodes).forEach((n) => {
    const c = cleanCloneNode(n);
    if (c) wrapper.appendChild(c);
  });
  return wrapper.innerHTML;
}
