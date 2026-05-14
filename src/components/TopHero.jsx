import { useEffect, useState } from "react";

export default function TopHero({ manga }) {
  const [current, setCurrent] = useState(0);

  const latest = (manga || []).slice(0, 3);

  useEffect(() => {
    if (latest.length === 0) return;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % latest.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [latest.length]);

  if (!latest.length) return null;

  const currentManga = latest[current];

  return (
    <div className="relative w-full h-[360px] rounded-2xl overflow-hidden">

      {/* ✅ GRADIENT BACKGROUND (come prima) */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-zinc-900 to-transparent" />

      {/* ✅ CONTENT */}
      <div className="relative z-10 h-full flex items-center px-10">

        {/* ✅ IMMAGINE SINGOLA */}
        <img
          src={
            currentManga.CoverURL && currentManga.CoverURL !== "NULL"
              ? currentManga.CoverURL
              : "https://placehold.co/300x450"
          }
          className="w-48 h-[300px] object-cover rounded-xl shadow-lg"
          alt="cover"
        />

        {/* ✅ TESTI */}
        <div className="ml-8 max-w-xl">
          <h2 className="text-3xl font-bold text-white mb-3">
            {currentManga.Titolo}
          </h2>

          <p className="text-sm text-zinc-300 mb-4 line-clamp-4">
            {currentManga.Trama || "Nessuna descrizione disponibile"}
          </p>

          <button
            onClick={() =>
              (window.location.href = `/manga/${currentManga.ID}`)
            }
            className="bg-green-600 px-5 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Dettagli
          </button>
        </div>
      </div>

      {/* ✅ INDICATORI (DOTS) */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {latest.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-3 h-3 rounded-full transition-all ${
              i === current
                ? "bg-white scale-125"
                : "bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>

    </div>
  );
}
