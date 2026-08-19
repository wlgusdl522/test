import { NextResponse } from 'next/server';
import { htmlToHwpx } from '@ssabrojs/hwpxjs';
import { hasPageAccess } from '@/lib/mutate/permissions';
import { getFullBoardReportData } from '@/lib/mutate/boardFullReport';
import { renderFullReportHtml } from '@/components/business/full/renderFullReportHtml';

export const runtime = 'nodejs';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

// 이사회자료 "전체보기"와 같은 데이터(getFullBoardReportData)를 hwpx로 변환한다. 화면/인쇄
// 쪽(FullReportBody.tsx)과는 별도의 문자열 HTML 빌더(renderFullReportHtml)를 쓰는데, Next.js가
// 라우트 핸들러에서 react-dom/server 직접 import를 막기 때문이다(빌드 에러) — 자세한 이유는
// renderFullReportHtml.ts 상단 주석 참고. hwpxjs는 실험적인 소규모 라이브러리라(표 서식 등
// 일부 미보존) 결과물을 한글에서 열어보고 필요하면 직접 다듬어야 할 수 있다.
export async function GET(request: Request) {
  if (!(await hasPageAccess('business-full'))) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const ym = searchParams.get('ym') || todayKst().slice(0, 7);

  try {
    const data = await getFullBoardReportData(ym);
    const bodyHtml = renderFullReportHtml(data);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>${bodyHtml}</body></html>`;
    const bytes = await htmlToHwpx(html, { title: `이사회자료_${ym}`, creator: '서대문노인종합복지관' });

    const filename = `이사회자료_${ym}.hwpx`;
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="board-report.hwpx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
