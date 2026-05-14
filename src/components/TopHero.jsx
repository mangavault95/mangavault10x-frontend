import { useEffect, useState } from "react";

export default function TopHero({ manga }) {
  const [current, setCurrent] = useState(0);

  const latest = (manga || []).slice(0, 3);

  useEffect(() => {
    if (!latest.length) return;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % latest.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [latest.length]);

  if (!latest.length) return null;

  const currentManga = latest[current];

  return (
    <div className="relative w-full h-[380px] rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">

      {/* ✅ BACKGROUND IMAGE */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-105 transition-all duration-700"
        style={{
          backgroundImage: `url(${currentManga?.CoverURL})`,
        }}
      />

      {/* ✅ DARK GRADIENT OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />

      {/* ✅ GLOW BORDER EFFECT */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10" />

      {/* ✅ CONTENT */}
      <div className="relative z-10 h-full flex items-center px-10">

        {/* ✅ TEXT */}
        <div className="max-w-xl">

          <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
            {currentManga?.Titolo}
          </h2>

          <p className="text-sm text-zinc-300 mb-6 line-clamp-4">
            {currentManga?.Trama || "Nessuna descrizione disponibile"}
          </p>

          <div className="flex gap-4">
            <button
              onClick={() =>
                (window.location.href = `/manga/${currentManga.ID}`)
              }
              className="bg-green-600 hover:bg-green-700 transition px-6 py-3 rounded-xl font-semibold shadow-lg"
            >
              ▶ Dettagli
            </button>
          </div>
        </div>
      </div>

      {/* ✅ FRECCE */}
      <button
        onClick={() =>
          setCurrent((prev) => (prev - 1 + latest.length) % latest.length)
        }
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 px-3 py-2 rounded-lg text-white"
      >
        ‹
      </button>

      <button
        onClick={() =>
          setCurrent((prev) => (prev + 1) % latest.length)
        }
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 px-3 py-2 rounded-lg text-white"
      >
        ›
      </button>

      {/* ✅ DOTS */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
        {latest.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`transition-all rounded-full ${
              i === current
                ? "w-4 h-4 bg-white"
                : "w-3 h-3 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
