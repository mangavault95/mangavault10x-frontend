import { useState, useEffect, useRef } from "react";

export default function MobileDetailOverlay({
  list = [],
  startIndex = 0,
  onClose
}) {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const contentRef = useRef(null);

  const current = list[index];

  useEffect(() => {
    setIndex(startIndex);
  }, [startIndex]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function onTouchStart(e) {
    const touch = e.touches[0];

    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }

  function onTouchEnd(e) {
    const touch = e.changedTouches[0];

    const dx = touch.clientX - touchStartX.current;
    const dy = touch.clientY - touchStartY.current;

    const horizontalIntent =
      Math.abs(dx) > 95 && Math.abs(dx) > Math.abs(dy) * 1.4;

    const verticalIntent = dy > 150 && Math.abs(dx) < 55;

    if (horizontalIntent) {
      if (dx < 0 && index < list.length - 1) {
        setIndex((i) => i + 1);
      } else if (dx > 0 && index > 0) {
        setIndex((i) => i - 1);
      }

      return;
    }

    const scrollTop = contentRef.current?.scrollTop || 0;

    if (verticalIntent && scrollTop <= 4) {
      onClose();
    }
  }

  if (!current) return null;

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

  function getStatus(m) {
    const owned = getOwned(m);
    const total = getTotal(m);

    if (total === null) {
      return "ongoing";
    }

    if (owned >= total) {
      return "completed";
    }

    return "to_complete";
  }

  const owned = getOwned(current);
  const total = getTotal(current);
  const status = getStatus(current);

  const percent =
    total === null
      ? owned > 0
        ? 50
        : 0
      : Math.min(100, (owned / total) * 100);

  let progressClass = "bg-gradient-to-r from-yellow-300 to-yellow-500";
  let statusLabel = "In corso";
  let statusTextClass = "text-yellow-400";

  if (status === "completed") {
    progressClass = "bg-gradient-to-r from-green-400 to-green-600";
    statusLabel = "Completo";
    statusTextClass = "text-green-400";
  }

  if (status === "to_complete") {
    progressClass = "bg-gradient-to-r from-red-400 to-red-600";
    statusLabel = "Da completare";
    statusTextClass = "text-red-400";
  }

  const rating = Number(current?.Valutazione) || 0;

  function stars() {
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i}>{i < rating ? "★" : "☆"}</span>
    ));
  }

  return (
    <div
      className="
        fixed inset-0 z-[5000]
        bg-black/95
        backdrop-blur-md
        flex flex-col
        mobile-app
      "
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* HEADER */}
      <div
        className="
          sticky top-0 z-10
          flex items-center justify-between
          px-4 py-3
          border-b border-white/10
          bg-black/80
          backdrop-blur-xl
        "
      >
        <button
          type="button"
          onClick={onClose}
          className="
            w-10 h-10 rounded-full
            bg-white/10
            text-white
            flex items-center justify-center
            active:scale-95
            transition
          "
          aria-label="Chiudi dettaglio"
        >
          ✕
        </button>

        <div className="text-xs text-zinc-400">
          {index + 1} / {list.length}
        </div>

        <div className="w-10" />
      </div>

      {/* CONTENT */}
      <div
        ref={contentRef}
        className="
          flex-1
          overflow-y-auto
          no-scrollbar
          px-5 py-4
          space-y-4
          text-center
        "
      >
        {/* COVER */}
        <div className="flex justify-center">
          <div
            className="
              w-[155px]
              aspect-[3/4]
              rounded-2xl
              overflow-hidden
              bg-black/30
              border border-white/10
              shadow-[0_18px_38px_rgba(0,0,0,0.36)]
            "
          >
            {current.CoverURL ? (
              <img
                src={current.CoverURL}
                alt={current.Titolo || "Cover manga"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                No cover
              </div>
            )}
          </div>
        </div>

        {/* TITLE */}
        <div>
          <h2 className="text-lg font-bold leading-snug text-white">
            {current.Titolo || "Titolo sconosciuto"}
          </h2>

          <p className="text-sm text-zinc-400 mt-1">
            {current.Autore || "Autore sconosciuto"}
          </p>
        </div>

        {/* RATING */}
        <div className="text-yellow-400 text-lg">
          {stars()}
        </div>

        {/* PROGRESS */}
        <div className="w-full max-w-[270px] mx-auto">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-400">
              {owned} / {total ?? "?"} volumi
            </span>

            <span className={statusTextClass}>
              {statusLabel}
            </span>
          </div>

          <div className="h-[6px] bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${progressClass}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* INFO GRID */}
        <div className="grid grid-cols-2 gap-3 text-left text-sm">
          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
            <div className="text-xs text-zinc-400">
              Volumi totali
            </div>
            <div className="text-white font-semibold mt-1">
              {total ?? "?"}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
            <div className="text-xs text-zinc-400">
              Posseduti
            </div>
            <div className="text-white font-semibold mt-1">
              {owned}
            </div>
          </div>

          {current.Costo ? (
            <div className="bg-white/5 border border-white/10 p-3 rounded-2xl col-span-2">
              <div className="text-xs text-zinc-400">
                Costo
              </div>
              <div className="text-white font-semibold mt-1">
                € {Number(current.Costo).toFixed(2)}
              </div>
            </div>
          ) : null}
        </div>

        {/* GENRE */}
        {current.Genere ? (
          <div className="text-xs text-zinc-400 leading-relaxed">
            {current.Genere}
          </div>
        ) : null}

        {/* PLOT */}
        {current.Trama ? (
          <div className="text-sm text-zinc-300 leading-relaxed text-left bg-white/[0.04] border border-white/10 rounded-2xl p-4">
            {current.Trama}
          </div>
        ) : null}
      </div>
    </div>
  );
}
