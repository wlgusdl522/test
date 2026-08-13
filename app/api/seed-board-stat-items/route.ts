import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { addModuleItem, getModuleItems, type BoardStatModule } from '@/lib/mutate/boardStat';

// 일회성 시딩 라우트 — 실행 후 삭제할 것.
// 이사회 자료 참고자료(수입지출현황/자원봉사자현황/후원현황)에 나온 기본 항목들로
// "틀"을 미리 채워둔다. 이름이 이미 있으면 건너뛰어서 여러 번 실행해도 안전(idempotent).

const DEFAULTS: Record<BoardStatModule, string[]> = {
  회계: ['인건비', '업무추진비', '운영비', '재산조성비', '사업비', '잡지출 등'],
  자원봉사자: ['기능회복사업', '지역복지활성화사업', '영양지원사업', '데이케어센터', '요양센터', '노인자살예방센터', '노인자원봉사', '기타'],
  후원: ['후원금', '후원물품'],
};

export async function GET() {
  const email = await requireViewerEmail();
  if (!(await isAdminEmail(email))) {
    return NextResponse.json({ error: '관리자만 실행할 수 있습니다.' }, { status: 403 });
  }

  try {
    const result: Record<string, string[]> = {};
    for (const [모듈, names] of Object.entries(DEFAULTS) as [BoardStatModule, string[]][]) {
      const existing = await getModuleItems(모듈);
      const existingNames = new Set(existing.map((i) => i.항목명));
      const added: string[] = [];
      for (const name of names) {
        if (!existingNames.has(name)) {
          await addModuleItem(모듈, name);
          added.push(name);
        }
      }
      result[모듈] = added;
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error('[seed-board-stat-items]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
