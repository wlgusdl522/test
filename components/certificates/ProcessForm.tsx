'use client';

import { useState } from 'react';
import { btn, btnDanger, input, inputBase, label } from '@/lib/ui';

type Source = '자체양식' | '희망이음업로드';

export default function ProcessForm({
  r,
  action,
}: {
  r: Record<string, string>;
  action: (formData: FormData) => void;
}) {
  const isCareer = r.종류 === '경력증명서';
  const [source, setSource] = useState<Source>('자체양식');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-800/50 sm:grid-cols-2">
        <div><span className="text-zinc-400">신청유형</span> {r.신청유형}</div>
        <div><span className="text-zinc-400">신청일</span> {r.신청일}</div>
        <div><span className="text-zinc-400">성명</span> {r.대상자성명}</div>
        <div><span className="text-zinc-400">수령방법</span> {r.수령방법 || '-'}</div>
        <div className="sm:col-span-2"><span className="text-zinc-400">이메일</span> {r.대상자이메일 || '-'}</div>
        {r.비고 && <div className="sm:col-span-2"><span className="text-zinc-400">비고</span> {r.비고}</div>}
      </div>

      <div className="flex gap-1 rounded-full bg-zinc-100 p-1 text-sm dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setSource('자체양식')}
          className={`flex-1 rounded-full px-3 py-1.5 font-medium transition-colors ${
            source === '자체양식' ? 'bg-white text-brand shadow-sm dark:bg-zinc-800' : 'text-zinc-500'
          }`}
        >
          직접 작성
        </button>
        <button
          type="button"
          onClick={() => setSource('희망이음업로드')}
          className={`flex-1 rounded-full px-3 py-1.5 font-medium transition-colors ${
            source === '희망이음업로드' ? 'bg-white text-brand shadow-sm dark:bg-zinc-800' : 'text-zinc-500'
          }`}
        >
          희망이음 출력 업로드
        </button>
      </div>

      {source === '희망이음업로드' ? (
        <form action={action} encType="multipart/form-data" className="space-y-3">
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="action" value="승인" />
          <input type="hidden" name="출처" value="희망이음업로드" />
          <p className={label}>희망이음에서 출력한 PDF를 그대로 업로드합니다. 이후 결재(총무과장→부장→관장)는 동일하게 진행됩니다.</p>
          <input type="file" name="희망이음파일" accept="application/pdf" required className={input} />
          <button type="submit" className={`${btn} w-full`}>업로드 후 승인</button>
        </form>
      ) : (
        <form action={action} className="space-y-3">
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="action" value="승인" />
          <input type="hidden" name="출처" value="자체양식" />
          <p className={label}>인사기록을 확인하여 아래 정보를 채운 뒤 승인해주세요.</p>
          <div className="flex gap-2">
            <label className={`${label} flex-1`}>
              생년월일
              <input type="date" name="생년월일" required className={input} />
            </label>
            <label className={`${label} w-24 shrink-0`}>
              성별
              <select name="성별" defaultValue="남" className={input}>
                <option value="남">남</option>
                <option value="여">여</option>
              </select>
            </label>
          </div>
          <label className={label}>
            주소
            <input name="대상자주소" className={input} />
          </label>
          <label className={label}>
            소속
            <input name="대상자소속" defaultValue={r.대상자소속} required className={input} />
          </label>
          <label className={label}>
            직위
            <input name="대상자직위" defaultValue={r.대상자직위} required className={input} />
          </label>
          <label className={label}>
            기간
            <input name="근무기간" defaultValue={r.근무기간} placeholder="예: 2020년 03월 01일 ~ 현재" required className={input} />
          </label>
          <label className={label}>
            담당업무
            <input name="담당업무" className={input} />
          </label>
          {isCareer && (
            <label className={label}>
              퇴직사유
              <input name="퇴직사유" className={input} />
            </label>
          )}
          <label className={label}>
            용도
            <input name="용도" required placeholder="예: 기관제출용" className={input} />
          </label>
          <button type="submit" className={`${btn} w-full`}>정보 저장 후 승인</button>
        </form>
      )}

      <form action={action} className="flex items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <input type="hidden" name="id" value={r.id} />
        <input type="hidden" name="action" value="반려" />
        <input name="comment" placeholder="반려 사유" className={`${inputBase} flex-1`} />
        <button type="submit" className={btnDanger}>반려</button>
      </form>
    </div>
  );
}
