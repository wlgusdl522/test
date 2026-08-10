import { Fragment } from 'react';
import { buildWorklogItems, getBusinessSettings, getViewerWorklogBusinessNames, type WorklogItem } from '@/lib/mutate/businessPlan';
import { type DailyEntry, dayValue, getDailyEntries, getMemo, getWrittenDates, rangeSum } from '@/lib/mutate/worklogEntry';
import ApprovalBox from '@/components/print/ApprovalBox';
import PrintButton from '@/components/print/PrintButton';
import { btn, card, inputBase } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const nf = (n: number) => (n || 0).toLocaleString('ko-KR');
const fpct = (v: number | null) => (v === null ? '–' : v >= 100 ? v.toFixed(0) : v.toFixed(1));
const pct = (v: number, g: number) => (g > 0 ? (v / g) * 100 : null);

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function midSpan(rows: { 세부사업명: string; 중분류: string }[], i: number): number {
  const same = (a: { 세부사업명: string; 중분류: string }, b: { 세부사업명: string; 중분류: string }) =>
    a.세부사업명 === b.세부사업명 && a.중분류 === b.중분류;
  if (i > 0 && same(rows[i - 1], rows[i])) return 0;
  let n = 1;
  while (rows[i + n] && same(rows[i + n], rows[i])) n++;
  return n;
}

export default async function BusinessWorklogPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; from?: string; to?: string; only?: string }>;
}) {
  const { business: businessParam, from, to, only } = await searchParams;
  const businesses = await getViewerWorklogBusinessNames();
  const business = businessParam || businesses[0] || '';
  const today = todayKst();
  const rangeFrom = from || today;
  const rangeTo = to || today;
  const onlyWritten = only === undefined ? true : only === '1';

  if (!business || !businesses.includes(business)) {
    return <div className="p-6"><p className="text-sm text-zinc-500">공유받은 사업이 없습니다. 세부사업계획 화면에서 사업 담당자에게 공유를 요청해주세요.</p></div>;
  }

  const [settings, items, entries, writtenDates] = await Promise.all([
    getBusinessSettings(business),
    buildWorklogItems(business),
    getDailyEntries(business),
    getWrittenDates(business),
  ]);

  const days: string[] = [];
  const cur = new Date(`${rangeFrom}T00:00`);
  const end = new Date(`${rangeTo}T00:00`);
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10);
    if (!onlyWritten || writtenDates.has(key)) days.push(key);
    cur.setDate(cur.getDate() + 1);
  }
  const memos = await Promise.all(days.map((d) => getMemo(business, d)));

  return (
    <div className="p-6">
      <div className={`${card} print:hidden flex flex-wrap items-center gap-4`}>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="business" value={business} />
          <input type="date" name="from" defaultValue={rangeFrom} className={`${inputBase} w-auto`} />
          <span className="text-zinc-400">~</span>
          <input type="date" name="to" defaultValue={rangeTo} className={`${inputBase} w-auto`} />
          <label className="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" name="only" value="1" defaultChecked={onlyWritten} /> 작성된 일자만
          </label>
          <button type="submit" className={btn}>미리보기 새로고침</button>
        </form>
        <PrintButton />
      </div>

      {days.length === 0 && (
        <div className={card}><p className="text-sm text-zinc-500">해당 기간에 작성된 일지가 없습니다. 기간을 넓히거나 &ldquo;작성된 일자만&rdquo;을 꺼보세요.</p></div>
      )}

      {days.map((date, idx) => (
        <WorklogSheet
          key={date}
          business={business}
          businessNumber={settings.정렬순서}
          date={date}
          items={items}
          entries={entries}
          memo={memos[idx]}
          approvalLine={settings.결재라인}
          isLast={idx === days.length - 1}
        />
      ))}
    </div>
  );
}

const lbl = { border: '1px solid #000', background: '#f2f2f2', fontWeight: 700, textAlign: 'center' as const, padding: '3px 4px', fontSize: 10.5 };
const cell = { border: '1px solid #000', padding: '3px 4px', textAlign: 'center' as const, fontSize: 10.5 };

function WorklogSheet({
  business, businessNumber, date, items, entries, memo, approvalLine, isLast,
}: {
  business: string; businessNumber: number; date: string; items: WorklogItem[]; entries: DailyEntry[];
  memo: { 활동내용: string; 특이사항: string } | null;
  approvalLine: string[]; isLast: boolean;
}) {
  const D = new Date(`${date}T00:00:00`);
  const monthFrom = `${date.slice(0, 7)}-01`;
  const yearFrom = `${date.slice(0, 4)}-01-01`;
  const allIds = items.map((i) => i.id);

  const rows = items.map((i) => ({
    ...i,
    day: dayValue(entries, i.id, date),
    mtd: rangeSum(entries, [i.id], monthFrom, date),
    ytd: rangeSum(entries, [i.id], yearFrom, date),
  }));
  const groups = new Map<string, typeof rows>();
  rows.forEach((r) => {
    if (!groups.has(r.세부사업명)) groups.set(r.세부사업명, []);
    groups.get(r.세부사업명)!.push(r);
  });
  const totalDay = rangeSum(entries, allIds, date, date);
  const totalMtd = rangeSum(entries, allIds, monthFrom, date);
  const totalYtd = rangeSum(entries, allIds, yearFrom, date);

  return (
    <div
      className="bg-white p-6 dark:bg-zinc-900 print:p-0"
      style={{ width: '190mm', margin: '0 auto 18px', color: '#000', ...(isLast ? {} : { pageBreakAfter: 'always' }) }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 4, paddingTop: 6 }}>{businessNumber}. {business}　총괄업무일지</div>
        <ApprovalBox data={{ visibleLine: approvalLine, delegatedLastCell: false }} />
      </div>
      <div style={{ fontSize: 12, marginBottom: 6 }}>{D.getFullYear()}년 {D.getMonth() + 1}월 {D.getDate()}일 ({DOW[D.getDay()]})</div>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '11mm' }} /><col style={{ width: '34mm' }} /><col style={{ width: '31mm' }} />
          <col style={{ width: '13mm' }} /><col style={{ width: '13mm' }} />
          <col style={{ width: '13mm' }} /><col style={{ width: '13mm' }} />
          <col style={{ width: '13mm' }} /><col style={{ width: '13mm' }} />
          <col style={{ width: '13mm' }} /><col style={{ width: '13mm' }} />
          <col style={{ width: '13mm' }} /><col style={{ width: '13mm' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={lbl} rowSpan={2}>세부사업</th>
            <th style={lbl} colSpan={2}>구　분</th>
            <th style={lbl} rowSpan={2}>건</th><th style={lbl} rowSpan={2}>명</th>
            <th style={lbl} colSpan={2}>일계</th><th style={lbl} colSpan={2}>월계</th><th style={lbl} colSpan={2}>누계</th>
            <th style={lbl} colSpan={2}>달성율(%)</th>
          </tr>
          <tr>
            <th style={lbl}>중분류</th><th style={lbl}>소분류</th>
            <th style={lbl}>건</th><th style={lbl}>명</th><th style={lbl}>건</th><th style={lbl}>명</th>
            <th style={lbl}>건</th><th style={lbl}>명</th><th style={lbl}>건</th><th style={lbl}>명</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const span = i > 0 && rows[i - 1].세부사업명 === r.세부사업명 ? 0 : rows.filter((x) => x.세부사업명 === r.세부사업명).length;
            const mspan = midSpan(rows, i);
            const isLastOfGroup = i === rows.length - 1 || rows[i + 1].세부사업명 !== r.세부사업명;
            const groupRows = groups.get(r.세부사업명) ?? [];
            const sum = (key: 'day' | 'mtd' | 'ytd', idx: 0 | 1) => groupRows.reduce((a, x) => a + x[key][idx], 0);
            const goalP = groupRows.reduce((a, x) => a + x.목표명, 0);
            const goalC = groupRows.reduce((a, x) => a + x.목표건, 0);
            return (
              <Fragment key={r.id}>
                <tr>
                  {span > 0 && <td style={{ ...lbl, writingMode: 'vertical-rl', textOrientation: 'upright', fontSize: 10 }} rowSpan={span}>{r.세부사업명}</td>}
                  {mspan > 0 && <td style={{ ...cell, textAlign: 'left' }} rowSpan={mspan}>{r.중분류}</td>}
                  <td style={{ ...cell, textAlign: 'left' }}>{r.소분류 || '–'}</td>
                  <td style={cell}>{nf(r.목표건)}</td><td style={cell}>{nf(r.목표명)}</td>
                  <td style={cell}>{nf(r.day[0])}</td><td style={cell}>{nf(r.day[1])}</td>
                  <td style={cell}>{nf(r.mtd[0])}</td><td style={cell}>{nf(r.mtd[1])}</td>
                  <td style={{ ...cell, fontWeight: 700 }}>{nf(r.ytd[0])}</td><td style={{ ...cell, fontWeight: 700 }}>{nf(r.ytd[1])}</td>
                  <td style={cell}>{fpct(pct(r.ytd[0], r.목표건))}</td><td style={cell}>{fpct(pct(r.ytd[1], r.목표명))}</td>
                </tr>
                {isLastOfGroup && (
                  <tr style={{ background: '#f7f7f7', fontWeight: 700 }}>
                    <td style={cell} colSpan={3}>소　계 · {r.세부사업명}</td>
                    <td style={cell}>{nf(goalC)}</td><td style={cell}>{nf(goalP)}</td>
                    <td style={cell}>{nf(sum('day', 0))}</td><td style={cell}>{nf(sum('day', 1))}</td>
                    <td style={cell}>{nf(sum('mtd', 0))}</td><td style={cell}>{nf(sum('mtd', 1))}</td>
                    <td style={cell}>{nf(sum('ytd', 0))}</td><td style={cell}>{nf(sum('ytd', 1))}</td>
                    <td style={cell}>{fpct(pct(sum('ytd', 0), goalC))}</td><td style={cell}>{fpct(pct(sum('ytd', 1), goalP))}</td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          <tr style={{ background: '#dedede', fontWeight: 700 }}>
            <td style={cell} colSpan={5}>총　계</td>
            <td style={cell}>{nf(totalDay[0])}</td><td style={cell}>{nf(totalDay[1])}</td>
            <td style={cell}>{nf(totalMtd[0])}</td><td style={cell}>{nf(totalMtd[1])}</td>
            <td style={cell}>{nf(totalYtd[0])}</td><td style={cell}>{nf(totalYtd[1])}</td>
            <td style={cell} colSpan={2} />
          </tr>
          <tr>
            <td style={{ ...lbl, width: '16mm' }} colSpan={3}>활동내용</td>
            <td style={{ ...cell, textAlign: 'left', whiteSpace: 'pre-wrap', lineHeight: 1.5 }} colSpan={10}>{memo?.활동내용 || ' '}</td>
          </tr>
          <tr>
            <td style={{ ...lbl, width: '16mm' }} colSpan={3}>특이사항</td>
            <td style={{ ...cell, textAlign: 'left', whiteSpace: 'pre-wrap', lineHeight: 1.5 }} colSpan={10}>{memo?.특이사항 || ' '}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: 6, marginTop: 8 }}>서대문노인종합복지관</div>
    </div>
  );
}
