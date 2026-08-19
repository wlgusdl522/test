import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { getNavLayout, setNavLayoutAction } from '@/lib/prefs-actions';
import { btn, btnSecondary, card, h1, h2, input, label, pageFluid } from '@/lib/ui';
import { saveMyJandiWebhookAction, saveMyStampAction } from '../actions';
import MyPageTabs from '@/components/mypage/MyPageTabs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function MyPageSettings() {
  const [me, navLayout] = await Promise.all([getViewerStaffRecord(), getNavLayout()]);

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>마이페이지</h1>
      <MyPageTabs />

      <h2 className={`${h2} mt-0`}>내 정보</h2>
      <div className={`${card} grid grid-cols-1 gap-2 text-sm sm:grid-cols-2`}>
        <div><span className="text-zinc-500">이메일</span> {me?.['이메일(아이디)'] ?? ''}</div>
        <div><span className="text-zinc-500">성명</span> {me?.성명 ?? ''}</div>
        <div><span className="text-zinc-500">소속팀</span> {me?.소속팀 ?? ''}</div>
        <div><span className="text-zinc-500">직급/직책</span> {me?.['직급/직책'] ?? ''}</div>
        <div><span className="text-zinc-500">담당사업</span> {me?.담당사업 ?? ''}</div>
        <div><span className="text-zinc-500">내선번호</span> {me?.내선번호 ?? ''}</div>
        <div><span className="text-zinc-500">휴대폰번호</span> {me?.휴대폰번호 ?? ''}</div>
        <div><span className="text-zinc-500">입사일</span> {me?.입사일 ?? ''}</div>
      </div>

      <h2 className={h2}>내 도장 / 알림 설정 (웹훅)</h2>
      <div className={`${card} grid grid-cols-1 gap-4 sm:grid-cols-2`}>
        <form action={saveMyStampAction} encType="multipart/form-data" className="flex flex-col gap-2">
          <label className={label}>
            내 도장 이미지 {me?.도장 && <a href={me.도장} target="_blank" rel="noreferrer" className="text-brand hover:underline">(현재 도장 보기)</a>}
            <input type="file" name="stamp" accept="image/*" className={input} />
          </label>
          <p className="text-xs text-zinc-400">결재라인이 없는 게시판(물품검수조서 등) 인쇄물에 이름 대신 이 도장 이미지가 찍힙니다.</p>
          <div><button type="submit" className={btn}>도장 등록</button></div>
        </form>
        <form action={saveMyJandiWebhookAction} className="flex flex-col gap-2">
          <label className={label}>
            내 잔디(JANDI) 개인 웹훅 URL
            <input name="webhookUrl" defaultValue={me?.잔디웹훅 ?? ''} placeholder="https://wh.jandi.com/..." className={input} />
          </label>
          <p className="text-xs text-zinc-400">잔디에서 &quot;나와의 채팅&quot; 토픽에 인커밍 웹훅을 연결해 등록해두면, 결재요청/승인/반려 알림이 나에게만 옵니다. 비워두면 공용 웹훅으로 대신 갑니다.</p>
          <div><button type="submit" className={btn}>저장</button></div>
        </form>
      </div>

      <h2 className={h2}>배치 바꾸기 (화면 레이아웃)</h2>
      <div className={`${card} flex flex-wrap items-center gap-3`}>
        <form action={setNavLayoutAction}>
          <input type="hidden" name="layout" value="top" />
          <button type="submit" className={navLayout === 'top' ? btn : btnSecondary}>상단 배치</button>
        </form>
        <form action={setNavLayoutAction}>
          <input type="hidden" name="layout" value="left" />
          <button type="submit" className={navLayout === 'left' ? btn : btnSecondary}>좌측 배치</button>
        </form>
        <p className="text-xs text-zinc-400">메뉴를 화면 상단 또는 좌측 중 원하는 위치에 배치할 수 있어요.</p>
      </div>
    </main>
  );
}
