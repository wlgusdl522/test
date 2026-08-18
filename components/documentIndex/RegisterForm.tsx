'use client';

import { useState } from 'react';
import { btn, input } from '@/lib/ui';
import { addDocumentIndexEntryAction } from '@/app/(portal)/document-index/actions';

type Kind = '일반문서' | '스탬프결재';

export default function RegisterForm({
  팀명,
  연도,
  prefix,
  nextSeq,
}: {
  팀명: string;
  연도: string;
  prefix: string;
  nextSeq: number;
}) {
  const [구분, set구분] = useState<Kind>('일반문서');

  return (
    <form action={addDocumentIndexEntryAction} className="flex flex-col gap-3">
      <input type="hidden" name="팀명" value={팀명} />
      <input type="hidden" name="연도" value={연도} />

      <div className="flex flex-wrap items-center gap-3">
        <select
          name="구분"
          value={구분}
          onChange={(e) => set구분(e.target.value as Kind)}
          className={`${input} w-auto`}
        >
          <option value="일반문서">일반문서</option>
          <option value="스탬프결재">스탬프결재</option>
        </select>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {구분 === '스탬프결재'
            ? '문서번호 없음(스탬프 결재)'
            : prefix
              ? `다음 문서번호: ${prefix}-${nextSeq}호`
              : '⚠ 이 팀의 문서번호 접두사가 아직 설정되지 않았습니다 — 설정 > 색인목록 접두사에서 먼저 등록해주세요.'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <input name="제목" placeholder="제목" required className={`${input} md:col-span-2`} />
        <input name="월일" placeholder="월/일 (예: 1/5)" className={input} />
        <input name="수신" placeholder="수신" className={input} />
        <input name="발신" placeholder="발신" className={input} />
      </div>

      <div>
        <button type="submit" className={btn}>등록</button>
      </div>
    </form>
  );
}
