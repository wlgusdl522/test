import { NAV_SECTION_ICON_PATH } from '@/lib/nav';

export default function SectionIcon({ label, className = 'h-4 w-4' }: { label: string; className?: string }) {
  const d = NAV_SECTION_ICON_PATH[label];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={`shrink-0 ${className}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}
