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

  /* ✅ SWIPE */
  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;

    /* swipe orizzontale (cambio manga) */
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0 && index < list.length - 1) {
        setIndex((i) => i + 1);
      } else if (dx > 0 && index > 0) {
        setIndex((i) => i - 1);
      }
    }

    /* swipe down (chiudi) */
    if (dy > 120) {
      onClose();
    }
  }

  if (!current) return null;

  /* ✅ LOGICA PROGRESS */
  function getOwned(m) {
    return Number(m?.VolumiPosseduti) || 0;
  }

  function getTotal(m) {
    const raw = m?.VolumiTotali;

    if (raw === null || raw === undefined || raw === "") return null;

    const cleaned = String(raw).replace(/[^0-9]/g, "");
    if (!cleaned) return null;

    const n = Number(cleaned);
    return Number.isNaN(n) ? null : n;
  }

  const owned = getOwned(current);
  const total = getTotal(current);

  const percent =
    total === null
      ? owned > 0
        ? 50
        : 0
      : Math.min(100, (owned / total) * 100);

  return (
    <div
      className="fixed inset-0 z-[4000] bg-black/95 backdrop-blur-md flex flex-col"
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
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-8 text-center">

        {/* ✅ COVER CORRETTA */}
        <div className="w-[65%] max-w-[220px] aspect-[3/4] mb-5 flex items-center justify-center">
          {current.CoverURL ? (
            <img
              src={current.CoverURL}
              className="w-full h-full object-contain rounded-lg bg-black/20"
            />
          ) : (
            <div className="text-xs text-zinc-500">
              Nessuna cover
            </div>
          )}
        </div>

        {/* ✅ TITOLO */}
        <h2 className="text-lg font-bold leading-snug">
          {current.Titolo}
        </h2>

        {/* ✅ AUTORE */}
        <p className="text-sm text-zinc-400 mt-1">
          {current.Autore}
        </p>

        {/* ✅ PROGRESS */}
        <div className="w-full max-w-[240px] mt-4">
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
