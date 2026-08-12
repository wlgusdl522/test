import { getGmailClient } from '@/lib/sheets/client';

// 서비스계정 도메인 위임으로 GOOGLE_IMPERSONATE_EMAIL 계정을 발신자로 삼아 Gmail API로 보낸다.
// 관리자가 도메인 위임 설정에 gmail.send 스코프를 추가해주기 전까지는 403으로 실패한다 — 호출부에서
// 실패를 삼키고 경고만 보여주도록 설계되어 있다(발행 자체는 막지 않음).
function encodeSubject(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendMail(to: string, subject: string, bodyText: string): Promise<void> {
  const from = process.env.GOOGLE_IMPERSONATE_EMAIL;
  if (!from) throw new Error('GOOGLE_IMPERSONATE_EMAIL이 설정되지 않아 발신자를 알 수 없습니다.');

  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    bodyText,
  ].join('\r\n');

  await getGmailClient().users.messages.send({
    userId: 'me',
    requestBody: { raw: base64UrlEncode(message) },
  });
}

export function buildCertificateEmail(record: Record<string, string>, documentUrl: string): { subject: string; body: string } {
  const kind = record['종류'] || record['구분'];
  const subject = `[서대문노인종합복지관] ${kind} 발급 안내 (제 ${record['문서번호']}호)`;
  const body = [
    `${record['대상자성명']}님, 안녕하세요.`,
    '',
    `요청하신 ${kind}가 발급되어 안내드립니다.`,
    `문서번호: 제 ${record['문서번호']}호`,
    `발급일: ${record['발급일']}`,
    '',
    documentUrl ? `첨부 문서: ${documentUrl}` : '문서는 별도로 전달드리겠습니다.',
    '',
    '서대문노인종합복지관',
  ].join('\n');
  return { subject, body };
}
