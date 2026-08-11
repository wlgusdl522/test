'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { btn, btnSecondary, inputBase, label as labelClass, table, td, th, tableWrap } from '@/lib/ui';
import { bulkImportDailyEntriesAction } from '@/app/(portal)/business/daily/actions';

type Item = { id: string; 세부사업명: string; 중분류: string; 소분류: string };
type Orientation = 'itemsAsRows' | 'itemsAsCols' | 'repeatingBlock';
type Entry = { 항목ID: string; 세부사업명: string; 라벨: string; 날짜: string; 건: number; 명: number };

function todayYm(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()).slice(0, 7);
}

// 날짜 헤더 셀 하나를 YYYY-MM-DD로 정규화한다 — 실제 파일마다 "1", "8/1", "2026-08-01",
// "8월 1일"처럼 표기가 다 달라서 자주 쓰는 형태를 최대한 넓게 받아준다.
function parseDateCell(v: unknown, ym: string): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (/^\d{1,2}$/.test(s)) {
    const d = Number(s);
    return d >= 1 && d <= 31 ? `${ym}-${String(d).padStart(2, '0')}` : null;
  }
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${ym}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})월\s*(\d{1,2})일?$/);
  if (m) return `${ym}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return null;
}

function num(v: unknown): number {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function colName(i: number): string {
  let s = '', n = i + 1;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

const PREVIEW_ROWS = 80;
const PREVIEW_COLS = 20;

export default function ExcelImportPanel({ business, items }: { business: string; items: Item[] }) {
  const [grid, setGrid] = useState<unknown[][] | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [ym, setYm] = useState(todayYm());
  const [orientation, setOrientation] = useState<Orientation>('repeatingBlock');

  // itemsAsRows/itemsAsCols 모드: 고정된 한 축이 날짜, 나머지 축이 항목
  const [dateAxisIndex, setDateAxisIndex] = useState('');
  const [fieldMap, setFieldMap] = useState<Record<string, { gc: string; gp: string }>>({});

  // repeatingBlock 모드: 하루치 표 전체가 블록 단위로 아래로 반복되는 구조
  const [blockStartRow, setBlockStartRow] = useState('');
  const [blockHeight, setBlockHeight] = useState('');
  const [dateOffset, setDateOffset] = useState('0');
  const [dateCol, setDateCol] = useState('0');
  const [gcCol, setGcCol] = useState('');
  const [gpCol, setGpCol] = useState('');
  const [rowOffsetMap, setRowOffsetMap] = useState<Record<string, string>>({});

  const [preview, setPreview] = useState<Entry[] | null>(null);
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);

  function loadSheet(wb: XLSX.WorkBook, idx: number) {
    const sheet = wb.Sheets[wb.SheetNames[idx]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
    setGrid(rows);
    setPreview(null);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const wb = XLSX.read(reader.result, { type: 'array', cellDates: true });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      setSheetIndex(0);
      loadSheet(wb, 0);
    };
    reader.readAsArrayBuffer(file);
  }

  function onSheetChange(idx: number) {
    setSheetIndex(idx);
    if (workbook) loadSheet(workbook, idx);
  }

  function setField(itemId: string, field: 'gc' | 'gp', v: string) {
    setFieldMap((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: v } }));
  }

  const previewGrid = useMemo(() => {
    if (!grid) return null;
    return grid.slice(0, PREVIEW_ROWS).map((row) => row.slice(0, PREVIEW_COLS));
  }, [grid]);

  // 날짜 열에서 날짜처럼 보이는 셀이 몇 번째 행마다 나타나는지 찾아서 블록 시작/높이를 자동으로 채운다.
  function autoDetectBlock() {
    if (!grid) return;
    const col = Number(dateCol) || 0;
    const hits: number[] = [];
    grid.forEach((row, i) => { if (parseDateCell(row[col], ym)) hits.push(i); });
    if (hits.length < 2) {
      setStatus('날짜 열에서 반복 패턴을 찾지 못했습니다. 날짜 열 번호를 확인해주세요.');
      return;
    }
    const gaps = hits.slice(1).map((h, i) => h - hits[i]);
    const gap = gaps.sort((a, b) =>
      gaps.filter((g) => g === a).length - gaps.filter((g) => g === b).length
    ).pop()!;
    setBlockStartRow(String(hits[0]));
    setBlockHeight(String(gap));
    setDateOffset('0');
    setStatus(`${hits.length}개 날짜 블록 감지, 블록 높이 ${gap}행. 이제 각 항목의 블록 내 행 번호를 채워주세요.`);
  }

  // 블록 하나(첫 블록)의 라벨 칸(숫자 칸 이전 열들)을 훑어서, 시스템에 저장된 항목명(소분류
  // 우선, 없으면 중분류)과 글자가 똑같은 행을 찾아 자동으로 행 번호를 채운다. 병합 셀 때문에
  // 한 행에서 라벨이 여러 열에 걸쳐 있을 수 있어 가장 오른쪽(가장 구체적인) 비어있지 않은
  // 값을 그 행의 라벨로 본다.
  function autoMatchLabels() {
    if (!grid) return;
    const start = Number(blockStartRow);
    const height = Number(blockHeight);
    if (!Number.isFinite(start) || !Number.isFinite(height) || height <= 0) {
      setStatus('먼저 블록 시작 행/블록 높이를 지정해주세요 (자동 감지 버튼을 먼저 눌러도 됩니다).');
      return;
    }
    const labelColEnd = gcCol !== '' ? Number(gcCol) : 6;
    const norm = (s: string) => s.replace(/[\r\n]/g, ' ').replace(/\s+/g, '').trim();

    const next = { ...rowOffsetMap };
    let matched = 0;
    for (let r = 0; r < height; r++) {
      const row = grid[start + r] ?? [];
      let label = '';
      for (let c = 0; c < labelColEnd; c++) {
        const v = String(row[c] ?? '').trim();
        if (v) label = v;
      }
      if (!label) continue;
      const nLabel = norm(label);
      const found = items.find((it) => norm(it.소분류 || it.중분류) === nLabel);
      if (found && next[found.id] === undefined) {
        next[found.id] = String(r);
        matched++;
      }
    }
    setRowOffsetMap(next);
    setStatus(`라벨이 똑같은 항목 ${matched}개의 행 번호를 자동으로 채웠습니다. 나머지는 이름이 달라서 직접 확인해야 해요.`);
  }

  function computePreview() {
    if (!grid) return;
    const result: Entry[] = [];

    if (orientation === 'repeatingBlock') {
      const start = Number(blockStartRow);
      const height = Number(blockHeight);
      const dOff = Number(dateOffset) || 0;
      const dCol = Number(dateCol) || 0;
      const gc = gcCol === '' ? null : Number(gcCol);
      const gp = gpCol === '' ? null : Number(gpCol);
      if (!Number.isFinite(start) || !Number.isFinite(height) || height <= 0) {
        setStatus('블록 시작 행/블록 높이를 입력해주세요 (자동 감지 버튼을 써도 됩니다).');
        return;
      }
      const blockCount = Math.floor((grid.length - start) / height) + 1;
      const blocks: { base: number; date: string }[] = [];
      for (let b = 0; b < blockCount; b++) {
        const base = start + b * height;
        const date = parseDateCell(grid[base + dOff]?.[dCol], ym);
        if (date) blocks.push({ base, date });
      }
      items.forEach((it) => {
        const offStr = rowOffsetMap[it.id];
        if (offStr === undefined || offStr === '') return;
        const off = Number(offStr);
        blocks.forEach(({ base, date }) => {
          const row = grid[base + off];
          const 건 = gc === null ? 0 : num(row?.[gc]);
          const 명 = gp === null ? 0 : num(row?.[gp]);
          if (건 || 명) result.push({ 항목ID: it.id, 세부사업명: it.세부사업명, 라벨: it.소분류 || it.중분류, 날짜: date, 건, 명 });
        });
      });
      setStatus(
        result.length > 0
          ? `${blocks.length}개 날짜 블록, ${result.length}건 인식됨 — 확인 후 가져오기를 눌러주세요.`
          : `${blocks.length}개 날짜 블록은 찾았지만 인식된 건수가 0건입니다. 열/행 번호나 항목 매핑을 다시 확인해주세요.`
      );
    } else {
      const axisIdx = Number(dateAxisIndex);
      if (!Number.isFinite(axisIdx) || axisIdx < 0) {
        setStatus('날짜가 있는 행/열 번호를 입력해주세요.');
        return;
      }
      const dateOf = (i: number): string | null => {
        const cell = orientation === 'itemsAsRows' ? grid[axisIdx]?.[i] : grid[i]?.[axisIdx];
        return parseDateCell(cell, ym);
      };
      const maxAxis = orientation === 'itemsAsRows' ? Math.max(...grid.map((r) => r.length)) : grid.length;
      const dates: { i: number; date: string }[] = [];
      for (let i = 0; i < maxAxis; i++) {
        const d = dateOf(i);
        if (d) dates.push({ i, date: d });
      }
      items.forEach((it) => {
        const map = fieldMap[it.id];
        if (!map || (!map.gc && !map.gp)) return;
        const gcIdx = map.gc === '' ? null : Number(map.gc);
        const gpIdx = map.gp === '' ? null : Number(map.gp);
        dates.forEach(({ i, date }) => {
          const gcCell = gcIdx === null ? '' : (orientation === 'itemsAsRows' ? grid[gcIdx]?.[i] : grid[i]?.[gcIdx]);
          const gpCell = gpIdx === null ? '' : (orientation === 'itemsAsRows' ? grid[gpIdx]?.[i] : grid[i]?.[gpIdx]);
          const 건 = num(gcCell);
          const 명 = num(gpCell);
          if (건 || 명) result.push({ 항목ID: it.id, 세부사업명: it.세부사업명, 라벨: it.소분류 || it.중분류, 날짜: date, 건, 명 });
        });
      });
      setStatus(
        result.length > 0
          ? `${dates.length}개 날짜, ${result.length}건 인식됨 — 확인 후 가져오기를 눌러주세요.`
          : `${dates.length}개 날짜는 찾았지만 인식된 건수가 0건입니다. 행/열 번호나 항목 매핑을 다시 확인해주세요.`
      );
    }

    result.sort((a, b) => (a.날짜 < b.날짜 ? -1 : a.날짜 > b.날짜 ? 1 : 0));
    setPreview(result);
  }

  async function onImport() {
    if (!preview || preview.length === 0) return;
    setPending(true);
    setStatus('가져오는 중...');
    try {
      const count = await bulkImportDailyEntriesAction(
        business,
        preview.map((p) => ({ 항목ID: p.항목ID, 날짜: p.날짜, 건: p.건, 명: p.명 }))
      );
      setStatus(`${count}건 반영 완료`);
      setPreview(null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : '가져오기 실패');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        각자 다른 형식의 엑셀 파일을 그대로 쓸 수 있도록, 파일에서 날짜와 각 항목의 건/명이 어디에 있는지 직접 지정해서 가져옵니다.
      </p>

      <label className={labelClass}>
        엑셀 파일 선택
        <input type="file" accept=".xlsx,.xls" onChange={onFile} className={inputBase} />
      </label>

      {sheetNames.length > 1 && (
        <label className={labelClass}>
          시트 선택
          <select className={inputBase} value={sheetIndex} onChange={(e) => onSheetChange(Number(e.target.value))}>
            {sheetNames.map((n, i) => <option key={n} value={i}>{n}</option>)}
          </select>
        </label>
      )}

      {previewGrid && (
        <>
          <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            파일 미리보기 (앞 {PREVIEW_ROWS}행 × {PREVIEW_COLS}열, 스크롤 가능) — 왼쪽 행 번호·위쪽 열 문자를 보고 아래 매핑값을 채우세요.
          </div>
          <div className={`${tableWrap} max-h-[280px] overflow-auto`}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={th}></th>
                  {previewGrid[0]?.map((_, ci) => <th key={ci} className={th}>{ci} ({colName(ci)})</th>)}
                </tr>
              </thead>
              <tbody>
                {previewGrid.map((row, ri) => (
                  <tr key={ri}>
                    <td className={`${td} bg-[#f7f5ef] font-mono font-semibold dark:bg-zinc-800`}>{ri}</td>
                    {row.map((cell, ci) => (
                      <td key={ci} className={`${td} whitespace-nowrap`}>
                        {cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className={labelClass}>
            파일 구조
            <select className={inputBase} value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation)}>
              <option value="repeatingBlock">하루치 표 전체가 블록 단위로 아래로 반복됨 (예: 총괄업무일지 원본 양식)</option>
              <option value="itemsAsRows">날짜가 가로로 한 줄에 나열(각 열이 하루) — 항목은 행</option>
              <option value="itemsAsCols">날짜가 세로로 한 줄에 나열(각 행이 하루) — 항목은 열</option>
            </select>
          </label>

          {orientation === 'repeatingBlock' ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className={labelClass}>
                  날짜 없는 칸(일자만 있을 때) 기준 연월
                  <input className={inputBase} value={ym} onChange={(e) => setYm(e.target.value)} placeholder="2026-08" />
                </label>
                <label className={labelClass}>
                  날짜가 있는 열 번호
                  <input className={inputBase} value={dateCol} onChange={(e) => setDateCol(e.target.value)} placeholder="예: 0" />
                </label>
                <label className={labelClass}>
                  블록 시작 행
                  <input className={inputBase} value={blockStartRow} onChange={(e) => setBlockStartRow(e.target.value)} placeholder="예: 3" />
                </label>
                <label className={labelClass}>
                  블록 높이(행 수)
                  <input className={inputBase} value={blockHeight} onChange={(e) => setBlockHeight(e.target.value)} placeholder="예: 39" />
                </label>
                <label className={labelClass}>
                  블록 내 날짜 상대 행
                  <input className={inputBase} value={dateOffset} onChange={(e) => setDateOffset(e.target.value)} placeholder="예: 0" />
                </label>
                <label className={labelClass}>
                  일계 건 열 번호
                  <input className={inputBase} value={gcCol} onChange={(e) => setGcCol(e.target.value)} placeholder="예: 6" />
                </label>
                <label className={labelClass}>
                  일계 명 열 번호
                  <input className={inputBase} value={gpCol} onChange={(e) => setGpCol(e.target.value)} placeholder="예: 7" />
                </label>
                <div className="flex items-end gap-2">
                  <button type="button" onClick={autoDetectBlock} className={btnSecondary}>블록 자동 감지</button>
                  <button type="button" onClick={autoMatchLabels} className={btnSecondary}>라벨로 항목 자동 매칭</button>
                </div>
              </div>

              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                각 항목이 블록 안에서 몇 번째 상대 행에 있는지 (비워두면 건너뜀) — 위 &ldquo;라벨로 항목 자동 매칭&rdquo;을 먼저 눌러보고, 안 채워진 것만 직접 입력하세요.
              </div>
              <div className={`${tableWrap} max-h-[280px] overflow-auto`}>
                <table className={table}>
                  <thead>
                    <tr><th className={th}>세부사업</th><th className={th}>항목</th><th className={th}>블록 내 상대 행</th></tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id}>
                        <td className={td}>{it.세부사업명}</td>
                        <td className={`${td} text-left`}>{it.중분류}{it.소분류 && ` · ${it.소분류}`}</td>
                        <td className={td}>
                          <input
                            className={`${inputBase} w-16 text-center`}
                            value={rowOffsetMap[it.id] ?? ''}
                            onChange={(e) => setRowOffsetMap((prev) => ({ ...prev, [it.id]: e.target.value }))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <label className={labelClass}>
                  날짜 없는 열엔 기준 연월 (YYYY-MM)
                  <input className={inputBase} value={ym} onChange={(e) => setYm(e.target.value)} placeholder="2026-08" />
                </label>
                <label className={labelClass}>
                  날짜가 있는 {orientation === 'itemsAsRows' ? '행' : '열'} 번호
                  <input className={inputBase} value={dateAxisIndex} onChange={(e) => setDateAxisIndex(e.target.value)} placeholder="예: 1" />
                </label>
              </div>

              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                각 항목의 건/명이 있는 {orientation === 'itemsAsRows' ? '행' : '열'} 번호 (비워두면 건너뜀)
              </div>
              <div className={`${tableWrap} max-h-[280px] overflow-auto`}>
                <table className={table}>
                  <thead>
                    <tr>
                      <th className={th}>세부사업</th><th className={th}>항목</th>
                      <th className={th}>건 {orientation === 'itemsAsRows' ? '행' : '열'}</th>
                      <th className={th}>명 {orientation === 'itemsAsRows' ? '행' : '열'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id}>
                        <td className={td}>{it.세부사업명}</td>
                        <td className={`${td} text-left`}>{it.중분류}{it.소분류 && ` · ${it.소분류}`}</td>
                        <td className={td}>
                          <input className={`${inputBase} w-16 text-center`} value={fieldMap[it.id]?.gc ?? ''} onChange={(e) => setField(it.id, 'gc', e.target.value)} />
                        </td>
                        <td className={td}>
                          <input className={`${inputBase} w-16 text-center`} value={fieldMap[it.id]?.gp ?? ''} onChange={(e) => setField(it.id, 'gp', e.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <button type="button" onClick={computePreview} className={btnSecondary}>미리보기 계산</button>
            {preview && preview.length > 0 && (
              <button type="button" onClick={onImport} disabled={pending} className={btn}>
                {pending ? '가져오는 중...' : `${preview.length}건 가져오기`}
              </button>
            )}
            {status && <span className="text-xs text-zinc-500 dark:text-zinc-400">{status}</span>}
          </div>

          {preview && preview.length > 0 && (
            <div className={`${tableWrap} max-h-[240px] overflow-auto`}>
              <table className={table}>
                <thead>
                  <tr><th className={th}>날짜</th><th className={th}>세부사업</th><th className={th}>항목</th><th className={th}>건</th><th className={th}>명</th></tr>
                </thead>
                <tbody>
                  {preview.slice(0, 200).map((p, i) => (
                    <tr key={i}>
                      <td className={td}>{p.날짜}</td><td className={td}>{p.세부사업명}</td><td className={td}>{p.라벨}</td>
                      <td className={td}>{p.건}</td><td className={td}>{p.명}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 200 && <p className="p-2 text-xs text-zinc-400">그 외 {preview.length - 200}건 더 있음 (미리보기는 200건까지만 표시)</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
