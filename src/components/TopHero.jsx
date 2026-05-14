import { useEffect, useState } from "react";

export default function TopHero({ manga }) {
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);

  const latest = (manga || []).slice(0, 3);

  useEffect(() => {
    if (!latest.length) return;

    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % latest.length);
        setFade(true);
      }, 250);
    }, 5000);

    return () => clearInterval(interval);
  }, [latest.length]);

  if (!latest.length) return null;

  const currentManga = latest[current];

  return (
    <div className="relative w-full h-[340px] rounded-2xl overflow-hidden border border-white/10 shadow-xl">

      {/* ✅ GRADIENT PIÙ CHIARO */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-[#1a1a22] to-black" />

      {/* ✅ GLASS */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/20" />

      {/* ✅ CONTENUTO */}
      <div
        className={`relative z-10 h-full flex items-center px-10 transition-opacity duration-300 ${
          fade ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* COVER */}
        <img
          src={currentManga?.CoverURL || "https://placehold.co/300x450"}
          className="w-44 h-[280px] object-cover rounded-xl shadow-lg"
        />

        {/* TESTI */}
        <div className="ml-8 max-w-xl">

          <h2 className="text-3xl font-bold text-white mb-3">
            {currentManga?.Titolo}
          </h2>

          <p className="text-sm text-zinc-400 mb-6 line-clamp-4">
            {currentManga?.Trama}
          </p>

          {/* ✅ BOTTONE PREMIUM SENAPE */}
          <button
            onClick={() =>
              (window.location.href = `/manga/${currentManga.ID}`)
            }
            className="
              px-6 py-2 rounded-xl
              bg-gradient-to-r from-yellow-500 to-yellow-600
              text-black font-semibold
              shadow-lg
              hover:scale-105 hover:brightness-110
              transition-all duration-200
            "
          >
            ✦ Dettagli
          </button>

        </div>
      </div>

      {/* ✅ DOTS */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {latest.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setFade(false);
              setTimeout(() => {
                setCurrent(i);
                setFade(true);
              }, 200);
            }}
            className={`transition-all rounded-full ${
              i === current
                ? "w-4 h-4 bg-white"
                : "w-3 h-3 bg-white/30 hover:bg-white/60"
            }`}
          />
        ))}
      </div>

      {/* ✅ BORDER GLOW */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10" />

    </div>
  );
}
