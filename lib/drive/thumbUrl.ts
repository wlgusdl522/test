export function driveThumbUrl(url: string, size = 120): string {
  const match = /\/file\/d\/([^/]+)/.exec(url || '');
  const fileId = match?.[1];
  if (!fileId) return '';
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}
