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

  /* ---------------- SWIPE ---------------- */
  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;

    // swipe orizzontale
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0 && index < list.length - 1) {
        setIndex(i => i + 1);
      } else if (dx > 0 && index > 0) {
        setIndex(i => i - 1);
      }
    }

    // swipe down
    if (dy > 120) {
      onClose();
    }
  }

  if (!current) return null;

  /* ---------------- DATI ---------------- */
  const owned = Number(current?.VolumiPosseduti) || 0;

  let total = null;
  if (current?.VolumiTotali) {
    const n = Number(String(current.VolumiTotali).replace(/\D/g, ""));
    if (!Number.isNaN(n)) total = n;
  }

  const percent =
    total === null
      ? owned > 0 ? 50 : 0
      : Math.min(100, (owned / total) * 100);

  const rating = Number(current?.Valutazione) || 0;

  function renderStars() {
    return [...Array(5)].map((_, i) => (
      <span key={i}>
        {i < rating ? "★" : "☆"}
      </span>
    ));
  }

  return (
    <div
      className="fixed inset-0 z-[5000] bg-black flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >

      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
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

      {/* ✅ CONTENUTO SCROLLABILE */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* COVER */}
        <div className="flex justify-center">
          <div className="w-[160px] aspect-[3/4]">
            {current.CoverURL && (
              <img
                src={current.CoverURL}
                className="w-full h-full object-contain rounded-lg"
              />
            )}
          </div>
        </div>

        {/* TITLE */}
        <h2 className="text-lg font-bold text-center">
          {current.Titolo}
        </h2>

        {/* AUTHOR */}
        <p className="text-sm text-center text-zinc-400">
          {current.Autore}
        </p>

        {/* ⭐ RATING */}
        <div className="text-center text-yellow-400 text-lg">
          {renderStars()}
        </div>

        {/* PROGRESS */}
        <div className="mt-2">
          <div className="h-[5px] bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="text-xs text-zinc-400 text-center mt-1">
            {owned} / {total ?? "?"} volumi
          </div>
        </div>

        {/* INFO GRID */}
        <div className="grid grid-cols-2 gap-3 text-sm">

          <div className="bg-white/5 p-3 rounded-lg">
            <div className="text-xs text-zinc-400">Volumi</div>
            <div>{total ?? "?"}</div>
          </div>

          <div className="bg-white/5 p-3 rounded-lg">
            <div className="text-xs text-zinc-400">Posseduti</div>
            <div>{owned}</div>
          </div>

          {current?.CostoTotale && (
            <div className="bg-white/5 p-3 rounded-lg col-span-2 text-center">
              <div className="text-xs text-zinc-400">Costo totale</div>
              <div>€ {current.CostoTotale}</div>
            </div>
          )}
        </div>

        {/* GENERE */}
        {current?.Genere && (
          <div className="text-center text-xs text-zinc-400">
            {current.Genere}
          </div>
        )}

        {/* TRAMA */}
        {current?.Trama && (
          <div className="text-sm text-zinc-300 leading-relaxed">
            {current.Trama}
          </div>
        )}
      </div>
    </div>
  );
}
