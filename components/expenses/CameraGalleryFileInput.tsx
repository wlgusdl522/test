'use client';

import { useRef, useState } from 'react';

const captureBtn =
  'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-medium transition-colors';
const captureBtnPrimary = `${captureBtn} border-brand bg-brand-tint text-brand-dark`;
const captureBtnSecondary = `${captureBtn} border-[#dadce0] bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800`;

function CameraIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8a2 2 0 0 1 2-2h1.5l1-2h7l1 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="12.5" r="3.4" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

// 슬롯 1개당 실제 제출되는 파일 input(name={name})은 숨겨두고, "촬영"/"갤러리" 두 버튼이
// 각자의 숨김 input(capture 속성 유무만 다름)을 열어서 고른 파일을 DataTransfer로 옮겨 담는다 —
// 서버 액션 쪽에서는 여전히 formData.get(name) 하나만 읽으면 된다.
export default function CameraGalleryFileInput({ name, existingUrl }: { name: string; existingUrl?: string }) {
  const namedInputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');

  function applyFile(file: File | undefined) {
    if (!file || !namedInputRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    namedInputRef.current.files = dt.files;
    setFileName(file.name);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input ref={namedInputRef} type="file" name={name} accept="image/*" className="hidden" />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => applyFile(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => applyFile(e.target.files?.[0])}
      />
      <div className="flex gap-2">
        <button type="button" onClick={() => cameraRef.current?.click()} className={captureBtnPrimary}>
          <CameraIcon /> 촬영
        </button>
        <button type="button" onClick={() => galleryRef.current?.click()} className={captureBtnSecondary}>
          <GalleryIcon /> 갤러리
        </button>
      </div>
      {fileName ? (
        <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">선택됨: {fileName}</span>
      ) : existingUrl ? (
        <a href={existingUrl} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline">
          기존 사진 보기
        </a>
      ) : null}
    </div>
  );
}
