'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { btn, btnSecondary, inputBase, label as labelClass, table, td, th, tableWrap } from '@/lib/ui';
import { bulkImportDailyEntriesAction } from '@/app/(portal)/business/daily/actions';

type Item = { id: string; 세부사업명: string; 중분류: string; 소분류: string };
type Orientation = 'itemsAsRows' | 'itemsAsCols';

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

const PREVIEW_ROWS = 60;
const PREVIEW_COLS = 40;

export default function ExcelImportPanel({ business, items }: { business: string; items: Item[] }) {
  const [grid, setGrid] = useState<unknown[][] | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [ym, setYm] = useState(todayYm());
  const [orientation, setOrientation] = useState<Orientation>('itemsAsRows');
  const [dateAxisIndex, setDateAxisIndex] = useState('');
  const [fieldMap, setFieldMap] = useState<Record<string, { gc: string; gp: string }>>({});
  const [preview, setPreview] = useState<{ 항목ID: string; 세부사업명: string; 라벨: string; 날짜: string; 건: number; 명: number }[] | null>(null);
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

  function computePreview() {
    if (!grid) return;
    const axisIdx = Number(dateAxisIndex);
    if (!Number.isFinite(axisIdx) || axisIdx < 0) {
      setStatus('날짜가 있는 행/열 번호를 입력해주세요.');
      return;
    }
    // dateAxis: itemsAsRows면 dateAxisIndex는 "행 번호"(가로로 날짜가 나열), itemsAsCols면 "열 번호"
    const dateOf = (i: number): string | null => {
      const cell = orientation === 'itemsAsRows' ? grid[axisIdx]?.[i] : grid[i]?.[axisIdx];
      return parseDateCell(cell, ym);
    };
    const maxAxis = orientation === 'itemsAsRows'
      ? Math.max(...grid.map((r) => r.length))
      : grid.length;

    const dates: { i: number; date: string }[] = [];
    for (let i = 0; i < maxAxis; i++) {
      const d = dateOf(i);
      if (d) dates.push({ i, date: d });
    }

    const result: { 항목ID: string; 세부사업명: string; 라벨: string; 날짜: string; 건: number; 명: number }[] = [];
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
    result.sort((a, b) => (a.날짜 < b.날짜 ? -1 : a.날짜 > b.날짜 ? 1 : 0));
    setPreview(result);
    setStatus(`${dates.length}개 날짜, ${result.length}건 인식됨 — 확인 후 가져오기를 눌러주세요.`);
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
        각자 다른 형식의 엑셀 파일을 그대로 쓸 수 있도록, 파일에서 어느 행/열이 날짜인지·어느 행/열이 각 항목의 건/명인지 직접 지정해서 가져옵니다.
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
            파일 미리보기 (앞 {PREVIEW_ROWS}행 × {PREVIEW_COLS}열) — 아래 표에서 행 번호(왼쪽)·열 문자(위)를 보고 매핑값을 채우세요.
          </div>
          <div className={`${tableWrap} max-h-[280px] overflow-auto`}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={th}></th>
                  {previewGrid[0]?.map((_, ci) => <th key={ci} className={th}>{colName(ci)}</th>)}
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className={labelClass}>
              날짜 없는 열엔 기준 연월 (YYYY-MM)
              <input className={inputBase} value={ym} onChange={(e) => setYm(e.target.value)} placeholder="2026-08" />
            </label>
            <label className={labelClass}>
              날짜 방향
              <select className={inputBase} value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation)}>
                <option value="itemsAsRows">날짜가 가로로(각 열이 하루) — 항목은 행</option>
                <option value="itemsAsCols">날짜가 세로로(각 행이 하루) — 항목은 열</option>
              </select>
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
