import { useEffect, useMemo, useState } from "react";

export default function TopHero({ manga = [], onSelect }) {
  const latest = useMemo(() => {
    return [...(manga || [])]
      .sort((a, b) => {
        const da = new Date(a.DataAggiunta || a.created_at || a.ID || 0).getTime();
        const db = new Date(b.DataAggiunta || b.created_at || b.ID || 0).getTime();

        if (Number.isNaN(da) || Number.isNaN(db)) {
          return Number(b.ID || 0) - Number(a.ID || 0);
        }

        return db - da;
      })
      .slice(0, 5);
  }, [manga]);

  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (!latest.length) return;

    const interval = setInterval(() => {
      setFade(false);

      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % latest.length);
        setFade(true);
      }, 240);
    }, 5200);

    return () => clearInterval(interval);
  }, [latest.length]);

  useEffect(() => {
    if (current >= latest.length) {
      setCurrent(0);
    }
  }, [latest.length, current]);

  if (!latest.length) return null;

  const currentManga = latest[current];

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 shadow-2xl manga-detail-card">
      {/* BACKGROUND AMBIENTALE */}
      <div
        className="absolute inset-0"
        style={{
          background: currentManga?.CoverURL
            ? `linear-gradient(135deg, rgba(10,10,10,0.90), rgba(24,18,40,0.84)), url(${currentManga.CoverURL})`
            : "linear-gradient(135deg, rgba(10,10,10,0.90), rgba(24,18,40,0.84))",
          backgroundSize: "150px",
          backgroundRepeat: "repeat",
          opacity: 0.26
        }}
      />

      <div className="absolute inset-0 bg-black/35" />

      <div className="relative z-10 px-8 py-7 flex items-center gap-8">
        {/* TESTI */}
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/15 border border-yellow-400/20 text-yellow-300 text-xs font-semibold mb-4">
            Ultimi aggiunti
          </div>

          <div
            className={`transition-opacity duration-300 ${
              fade ? "opacity-100" : "opacity-0"
            }`}
          >
            <h1 className="text-4xl font-black text-white leading-tight truncate">
              {currentManga?.Titolo || "Titolo sconosciuto"}
            </h1>

            <p className="text-sm text-zinc-400 mt-1 truncate">
              {currentManga?.Autore || "Autore sconosciuto"}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {String(currentManga?.Genere || "")
                .split(",")
                .filter(Boolean)
                .slice(0, 5)
                .map((g, i) => (
                  <span
                    key={`${g}-${i}`}
                    className="px-2 py-1 rounded-full bg-white/8 border border-white/10 text-xs text-zinc-300"
                  >
                    {g.trim()}
                  </span>
                ))}
            </div>

            <p
              className="mt-4 max-w-2xl text-sm text-zinc-300 leading-relaxed overflow-hidden"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical"
              }}
            >
              {currentManga?.Trama || "Nessuna descrizione disponibile."}
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => onSelect?.(currentManga)}
                className="px-5 py-2.5 rounded-xl bg-yellow-400 text-black font-semibold hover:brightness-110 active:scale-95 transition-all duration-200 shadow-[0_0_20px_rgba(234,179,8,0.25)] hover:shadow-[0_0_28px_rgba(234,179,8,0.38)]"
              >
                Dettagli
              </button>

              <div className="text-xs text-zinc-500">
                {current + 1} / {latest.length}
              </div>
            </div>
          </div>
        </div>

        {/* COVER PRINCIPALE + MINIATURE */}
        <div className="hidden lg:flex items-center gap-4">
          <div class150px] h-[220px] rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl">
            {currentManga?.CoverURL ? (
              <img
                src={currentManga.CoverURL}
                alt={currentManga?.Titolo || "Cover manga"}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
                No cover
              </div>
            )}

            <div className="absolute inset-0 pointer-events-none">
              <div className="cover-shine" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {latest.slice(0, 3).map((m, i) => (
              <button
                key={m.ID || `${m.Titolo}-${i}`}
                onClick={() => setCurrent(i)}
                className={`w-14 h-20 rounded-xl overflow-hidden border transition-all ${
                  i === current
                    ? "border-yellow-400 shadow-[0_0_16px_rgba(234,179,8,0.35)]"
                    : "border-white/10 opacity-60 hover:opacity-100"
                }`}
                title={m.Titolo || "Manga"}
              >
                {m.CoverURL ? (
                  <img
                    src={m.CoverURL}
                    alt={m.Titolo || "Cover manga"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-black/40" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* DOTS */}
      <div className="relative z-10 px-8 pb-5 flex gap-2">
        {latest.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all duration-200 ${
              i === current
                ? "w-8 bg-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.4)]"
                : "w-2 bg-white/20 hover:bg-white/40"
            }`}
            aria-label={`Vai al manga ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
