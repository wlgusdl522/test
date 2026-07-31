import { tagBase, tagPalette } from '@/lib/ui';

function toneForValue(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return tagPalette[hash % tagPalette.length];
}

export default function Tag({ label }: { label: string }) {
  if (!label) return null;
  return <span className={`${tagBase} ${toneForValue(label)}`}>{label}</span>;
}
