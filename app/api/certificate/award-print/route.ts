import { PDFDocument } from 'pdf-lib';
import { NextResponse } from 'next/server';
import { requireViewerEmail } from '@/lib/auth-helpers';
import { getAllCertificates } from '@/lib/supabase/certificate';
import { downloadCertificatePdf } from '@/lib/drive/certificateFolder';

// "선택한 상장 인쇄" - 예전엔 Supabase 데이터를 그때그때 다시 HTML로 그려서(/print/award) 인쇄했는데,
// 그러면 실제 발급된 PDF(직인·QR 위치가 issueCertificate 시점 기준)와 인쇄 결과가 어긋날 수 있다.
// 이제는 Drive에 저장된 진짜 발급 PDF들을 그대로 받아와 한 장으로 합쳐서 인쇄한다.
export async function GET(req: Request) {
  try {
    await requireViewerEmail();
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const { searchParams } = new URL(req.url);
  const ids = searchParams.getAll('id');
  const all = await getAllCertificates();
  const records = ids.length > 0
    ? ids.map((id) => all.find((r) => r.id === id)).filter((r): r is Record<string, string> => !!r)
    : all.filter((r) => r.구분 === '상장' && r.결재상태 === '승인');

  const targets = records.filter((r) => r.구분 === '상장' && r.문서URL);
  if (targets.length === 0) {
    return NextResponse.json({ error: '인쇄할 상장을 찾을 수 없습니다.' }, { status: 404 });
  }

  const merged = await PDFDocument.create();
  for (const record of targets) {
    const fileId = /[-\w]{25,}/.exec(record['문서URL'])?.[0];
    if (!fileId) continue;
    const buffer = await downloadCertificatePdf(fileId);
    const source = await PDFDocument.load(buffer);
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }

  const mergedBytes = await merged.save();
  return new NextResponse(new Uint8Array(mergedBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="상장_인쇄.pdf"',
    },
  });
}
