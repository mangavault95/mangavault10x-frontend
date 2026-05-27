import { useEffect, useMemo, useState } from "react";

export default function TopHero({ manga = [], onSelect }) {
  const latest = useMemo(() => {
    return [...manga]
      .sort((a, b) => {
        const da = new Date(a?.DataAggiunta || a?.created_at || 0).getTime();
        const db = new Date(b?.DataAggiunta || b?.created_at || 0).getTime();

        if (Number.isNaN(da) || Number.isNaN(db)) {
          return Number(b?.ID || 0) - Number(a?.ID || 0);
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
    <section
      className="relative overflow-hidden rounded-[32px] border border-white/10 shadow-2xl"
      style={{
        background:
          "linear-gradient(180deg, rgba(16,20,40,0.62), rgba(24,18,40,0.52))",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)"
      }}
    >
      {/* ambient lights */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(99,102,241,0.16), transparent 30%), radial-gradient(circle at bottom right, rgba(168,85,247,0.12), transparent 34%)"
        }}
      />

      {/* layout principale */}
      <div className="relative z-10 px-8 py-7 flex items-stretch gap-8 min-h-[290px]">
        {/* LEFT CONTENT */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/15 border border-yellow-400/20 text-yellow-300 text-xs font-semibold mb-4">
              Ultimi aggiunti
            </div>

            <div
              className={
                "transition-opacity duration-300 " +
                (fade ? "opacity-100" : "opacity-0")
              }
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
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <button
              type="button"
              onClick={() => onSelect?.(currentManga)}
              className="px-5 py-2.5 rounded-xl bg-yellow-400 text-black font-semibold hover:brightness-110 active:scale-95 transition-all duration-200 shadow-[0_0_20px_rgba(234,179,8,0.25)] hover:shadow-[0_0_28px_rgba(234,179,8,0.38)]"
            >
              Dettagli
            </button>

            <div className="text-xs text-zinc-500">
              {current + 1} / {latest.length}
            </div>

            <div className="ml-2 flex gap-2">
              {latest.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-label={`Vai al manga ${i + 1}`}
                  className={
                    "h-2 rounded-full transition-all duration-200 " +
                    (i === current
                      ? "w-8 bg-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.4)]"
                      : "w-2 bg-white/20 hover:bg-white/40")
                  }
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT BIG VISUAL */}
        <div className="hidden lg:flex w-[420px] items-center justify-center">
          <div className="relative w-[220px] h-[300px] rounded-[28px] overflow-hidden bg-black/20 border border-white/10 shadow-2xl">
            {currentManga?.CoverURL ? (
              <>
                {/* soft ambient blur solo dietro la cover */}
                <img
                  src={currentManga.CoverURL}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-35"
                />

                <div className="absolute inset-0 bg-black/10" />

                <img
                  src={currentManga.CoverURL}
                  alt={currentManga?.Titolo || "Cover manga"}
                  className="relative z-10 w-full h-full object-contain"
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
                No cover
              </div>
            )}

            <div className="absolute inset-0 pointer-events-none">
              <div className="cover-shine" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
