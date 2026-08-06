'use client';

import { useRef, useState } from 'react';

export default function SignaturePad({ name, hasExisting }: { name: string; hasExisting?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const drawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }

  function end() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (hiddenRef.current && canvasRef.current) {
      hiddenRef.current.value = canvasRef.current.toDataURL('image/png');
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    if (hiddenRef.current) hiddenRef.current.value = '';
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={280}
        height={110}
        // 캔버스는 width/height 속성이 실제 그림을 그리는 해상도(버퍼)다. 부모가 grid/flex로
        // 늘려버리면 화면에 보이는 크기(CSS)와 버퍼 크기가 달라져서, 포인터 좌표(pos())가
        // 버퍼 기준으로 계산되는 것과 어긋나 서명이 늘어나 보인다 — style로 못 늘어나게 고정한다.
        style={{ width: 280, height: 110 }}
        className="touch-none self-start rounded-md border border-zinc-300 bg-white dark:border-zinc-700"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <input type="hidden" name={name} ref={hiddenRef} defaultValue="" />
      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <button type="button" onClick={clear} className="hover:underline">
          지우기
        </button>
        {!hasDrawn && hasExisting && <span>이미 서명이 등록되어 있습니다. 다시 그리면 교체됩니다.</span>}
      </div>
    </div>
  );
}
