'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, input, label } from '@/lib/ui';
import { saveMeetingMetaAction } from '@/app/(portal)/weekly-plan/meeting/actions';

type ContentLine = { name: string; label: string };

const cellStyle = { padding: '8px 10px', border: '1px solid #d7dbe0', verticalAlign: 'top' as const };
const labelCellStyle = { ...cellStyle, color: '#666', width: 90, fontWeight: 600 };
const sectionHeaderStyle = { background: '#eef1f5', fontWeight: 600, textAlign: 'center' as const, padding: '6px 8px', border: '1px solid #d7dbe0' };

function SignatureBox() {
  const positions = ['팀장', '부장', '관장'];
  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <tbody>
        <tr>
          {positions.map((p) => (
            <td key={p} style={{ ...cellStyle, textAlign: 'center', width: 60, color: '#666', fontWeight: 600 }}>{p}</td>
          ))}
        </tr>
        <tr>
          {positions.map((p) => (
            <td key={p} style={{ ...cellStyle, height: 50 }} />
          ))}
        </tr>
      </tbody>
    </table>
  );
}

export default function MeetingComposer({
  team,
  date,
  writerName,
  attendeeCount,
  contentLines,
  initialTime,
  initialPlace,
  initialNotice,
  initialLeave,
  initialSupervision,
}: {
  team: string;
  date: string;
  writerName: string;
  attendeeCount: number;
  contentLines: ContentLine[];
  initialTime: string;
  initialPlace: string;
  initialNotice: string;
  initialLeave: string;
  initialSupervision: string;
}) {
  const router = useRouter();
  const [time, setTime] = useState(initialTime);
  const [place, setPlace] = useState(initialPlace);
  const [notice, setNotice] = useState(initialNotice);
  const [leave, setLeave] = useState(initialLeave);
  const [supervision, setSupervision] = useState(initialSupervision);
  const [statusText, setStatusText] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setStatusText('저장 중...');
    startTransition(async () => {
      try {
        await saveMeetingMetaAction({ team, date, time, place, notice, leave, supervision });
        setStatusText('저장 완료');
        router.refresh();
      } catch (err) {
        setStatusText(err instanceof Error ? err.message : '저장 실패');
      }
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="flex flex-col gap-3">
        <label className={label}>
          회의시간
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={input} />
        </label>
        <label className={label}>
          회의장소
          <input value={place} onChange={(e) => setPlace(e.target.value)} className={input} />
        </label>
        <label className={label}>
          공지사항
          <textarea value={notice} onChange={(e) => setNotice(e.target.value)} className={input} rows={4} />
        </label>
        <label className={label}>
          휴가 및 일정
          <textarea value={leave} onChange={(e) => setLeave(e.target.value)} className={input} rows={3} />
        </label>
        <label className={label}>
          슈퍼비전
          <textarea value={supervision} onChange={(e) => setSupervision(e.target.value)} className={input} rows={3} />
        </label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleSave} disabled={isPending} className={btn}>
            {isPending ? '저장 중...' : '저장'}
          </button>
          {statusText && <span className="text-xs text-zinc-500 dark:text-zinc-400">{statusText}</span>}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-200">인쇄 미리보기</h3>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, color: '#666' }}>{team}</div>
              <h2 style={{ margin: '2px 0 0', fontSize: 20 }}>회의록</h2>
            </div>
            <SignatureBox />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              <tr><td colSpan={2} style={sectionHeaderStyle}>기 본 사 항</td></tr>
              <tr>
                <td style={labelCellStyle}>시간</td>
                <td style={cellStyle}>{time || '-'}</td>
              </tr>
              <tr>
                <td style={labelCellStyle}>장소</td>
                <td style={cellStyle}>{place || '-'}</td>
              </tr>
              <tr>
                <td style={labelCellStyle}>작성자</td>
                <td style={cellStyle}>{writerName || '-'}</td>
              </tr>
              <tr>
                <td style={labelCellStyle}>참석자</td>
                <td style={cellStyle}>총 {attendeeCount}명</td>
              </tr>
              <tr><td colSpan={2} style={sectionHeaderStyle}>회 의 내 용</td></tr>
              <tr>
                <td style={labelCellStyle}>내용</td>
                <td style={cellStyle}>
                  {contentLines.length === 0 ? (
                    <span style={{ color: '#999' }}>-</span>
                  ) : (
                    contentLines.map((line, i) => (
                      <div key={i} style={{ padding: '2px 0' }}>{i + 1}. {line.name}: {line.label}</div>
                    ))
                  )}
                </td>
              </tr>
              <tr>
                <td style={labelCellStyle}>공지사항</td>
                <td style={cellStyle}>{notice ? notice.split('\n').map((l, i) => <div key={i}>{l}</div>) : <span style={{ color: '#999' }}>-</span>}</td>
              </tr>
              <tr>
                <td style={labelCellStyle}>휴가 및 일정</td>
                <td style={cellStyle}>{leave ? leave.split('\n').map((l, i) => <div key={i}>{l}</div>) : <span style={{ color: '#999' }}>-</span>}</td>
              </tr>
              <tr>
                <td style={labelCellStyle}>슈퍼비전</td>
                <td style={cellStyle}>{supervision ? supervision.split('\n').map((l, i) => <div key={i}>{l}</div>) : <span style={{ color: '#999' }}>-</span>}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
