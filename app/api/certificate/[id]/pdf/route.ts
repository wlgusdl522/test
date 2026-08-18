import { NextResponse } from 'next/server';
import { requireViewerEmail, canViewCertificateLog } from '@/lib/auth-helpers';
import { getCertificateById } from '@/lib/supabase/certificate';
import { downloadCertificatePdf } from '@/lib/drive/certificateFolder';

// 발급된 증명서/상장 PDF는 개인정보가 담겨있어 Drive에서 "anyone" 공개 링크를 만들 수 없다
// (그 폴더가 속한 공유 드라이브 정책 때문에 애초에 만들 수도 없다 - lib/drive/certificateFolder.ts 참고).
// 그래서 문서URL은 Drive 파일ID를 담고 있는 값일 뿐이고, 실제 열람은 이 라우트가 서비스계정으로
// 대신 읽어와 로그인 + 권한 확인을 통과한 사용자에게만 스트리밍한다.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let viewerEmail: string;
  try {
    viewerEmail = await requireViewerEmail();
  } catch {
    return NextResponse.redirect(new URL('/login', _req.url));
  }

  const record = await getCertificateById(id);
  if (!record || !record['문서URL']) {
    return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 });
  }

  const isSelfOrRegistrant =
    viewerEmail === (record['대상자이메일'] || '').toLowerCase() ||
    viewerEmail === (record['등록자이메일'] || '').toLowerCase();
  if (!isSelfOrRegistrant && !(await canViewCertificateLog())) {
    return NextResponse.json({ error: '열람 권한이 없습니다.' }, { status: 403 });
  }

  const fileId = /[-\w]{25,}/.exec(record['문서URL'])?.[0];
  if (!fileId) {
    return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 });
  }

  const buffer = await downloadCertificatePdf(fileId);
  const filename = `${record['종류'] || record['구분']}_${record['대상자성명'] || ''}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
