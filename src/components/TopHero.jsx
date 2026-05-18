import { useEffect, useState } from "react";

export default function TopHero({ manga, onSelect }) {
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

      {/* BACKGROUND */}
      <img
        src={currentManga?.CoverURL || "https://placehold.co/1200x400"}
        className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm scale-110"
      />

      {/* GRADIENT */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />

      {/* CONTENUTO */}
      <div
        className={`relative z-10 h-full flex items-center px-10 transition-opacity duration-300 ${
          fade ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* COVER */}
        <img
          src={currentManga?.CoverURL || "https://placehold.co/300x450"}
          className="w-40 h-[260px] object-cover rounded-xl shadow-lg"
        />

        {/* TESTI */}
        <div className="ml-8 max-w-xl">

          <h2 className="text-3xl font-bold text-white mb-3">
            {currentManga?.Titolo}
          </h2>

          <p className="text-sm text-zinc-400 mb-6 line-clamp-3">
            {(currentManga?.Trama || "").slice(0, 160)}...
          </p>

          {/* BOTTONE */}
          <button
            onClick={() => onSelect(currentManga)}
            className="
              px-6 py-2 rounded-xl
              bg-yellow-500 text-black font-semibold
              shadow-lg
              hover:bg-yellow-400 hover:scale-105
              transition-all duration-200
            "
          >
            ✦ Dettagli
          </button>
        </div>
      </div>

      {/* DOTS */}
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
                ? "w-4 h-4 bg-yellow-400"
                : "w-3 h-3 bg-white/30 hover:bg-white/60"
            }`}
          />
        ))}
      </div>

      {/* BORDER */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10" />
    </div>
  );
}
