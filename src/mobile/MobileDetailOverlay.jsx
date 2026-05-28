import { useState, useEffect, useRef } from "react";

export default function MobileDetailOverlay({
  list = [],
  startIndex = 0,
  onClose
}) {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const current = list[index];

  useEffect(() => {
    setIndex(startIndex);
  }, [startIndex]);

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0 && index < list.length - 1) {
        setIndex(i => i + 1);
      } else if (dx > 0 && index > 0) {
        setIndex(i => i - 1);
      }
    }

    if (dy > 120) {
      onClose();
    }
  }

  if (!current) return null;

  function getOwned(m) {
    return Number(m?.VolumiPosseduti) || 0;
  }

  function getTotal(m) {
    const raw = m?.VolumiTotali;
    if (!raw) return null;

    const n = Number(String(raw).replace(/\D/g, ""));
    return Number.isNaN(n) ? null : n;
  }

  const owned = getOwned(current);
  const total = getTotal(current);

  const percent =
    total === null
      ? owned > 0 ? 50 : 0
      : Math.min(100, (owned / total) * 100);

  return (
    <div
      className="fixed inset-0 z-[5000] bg-black/95 backdrop-blur-md flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >

      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
        >
          ✕
        </button>

        <div className="text-xs text-zinc-400">
          {index + 1} / {list.length}
        </div>

        <div className="w-10" />
      </div>

      {/* CONTENT */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-5 gap-3">

        {/* ✅ COVER FIX DEFINITIVO */}
        <div className="w-[60%] max-w-[200px] aspect-[3/4]">
          {current.CoverURL ? (
            <img
              src={current.CoverURL}
              className="w-full h-full object-contain rounded-lg"
            />
          ) : null}
        </div>

        {/* TITLE */}
        <div className="text-base font-bold leading-tight">
          {current.Titolo}
        </div>

        {/* AUTHOR */}
        <div className="text-sm text-zinc-400">
          {current.Autore}
        </div>

        {/* PROGRESS */}
        <div className="w-full max-w-[220px] mt-2">

          <div className="h-[5px] bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="text-xs text-zinc-400 mt-1">
            {owned} / {total ?? "?"} volumi
          </div>
        </div>

      </div>
    </div>
  );
}
