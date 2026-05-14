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
    <div className="relative w-full h-[360px] rounded-2xl overflow-hidden border border-zinc-800 shadow-xl">

      {/* ✅ BACKGROUND LEGGERO (non troppo zoom) */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage: `url(${currentManga?.CoverURL})`,
        }}
      />

      {/* ✅ GRADIENT PIÙ SOFT */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />

      {/* ✅ CONTENT */}
      <div className="relative z-10 h-full flex items-center px-10">

        {/* ✅ COVER (finalmente una sola principale) */}
        <img
          src={currentManga?.CoverURL || "https://placehold.co/300x450"}
          className="w-44 h-[280px] object-cover rounded-xl shadow-lg"
        />

        {/* ✅ TESTO */}
        <div className="ml-8 max-w-xl">
          <h2 className="text-3xl font-bold text-white mb-3">
            {currentManga?.Titolo}
          </h2>

          <p className="text-sm text-zinc-300 mb-5 line-clamp-4">
            {currentManga?.Trama}
          </p>

          <button
            onClick={() =>
              (window.location.href = `/manga/${currentManga.ID}`)
            }
            className="bg-green-600 hover:bg-green-700 transition px-5 py-2 rounded-lg"
          >
            ▶ Dettagli
          </button>
        </div>
      </div>

      {/* ✅ FRECCE */}
      <button
        onClick={() =>
          setCurrent((prev) => (prev - 1 + latest.length) % latest.length)
        }
        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 px-3 py-2 rounded-md text-white"
      >
        ‹
      </button>

      <button
        onClick={() =>
          setCurrent((prev) => (prev + 1) % latest.length)
        }
        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 px-3 py-2 rounded-md text-white"
      >
        ›
      </button>

      {/* ✅ DOTS */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {latest.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`transition-all rounded-full ${
              i === current
                ? "w-4 h-4 bg-white"
                : "w-3 h-3 bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
