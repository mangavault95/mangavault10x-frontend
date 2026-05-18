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
    <div className="
      relative w-full h-[340px]
      rounded-2xl overflow-hidden
      bg-[#141414]
      border border-white/10
      shadow-[0_0_40px_rgba(0,0,0,0.6)]
      hover:shadow-[0_0_60px_rgba(250,204,21,0.2)]
      transition
    ">

      {/* BG */}
      <img
        src={currentManga?.CoverURL || "https://placehold.co/1200x400"}
        className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm scale-110"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />

      <div className={`relative z-10 h-full flex items-center px-10 transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`}>

        <img
          src={currentManga?.CoverURL || "https://placehold.co/300x450"}
          className="w-40 h-[260px] object-cover rounded-xl shadow-lg"
        />

        <div className="ml-8 max-w-xl">

          <h2 className="text-3xl font-bold text-white mb-2">
            {currentManga?.Titolo}
          </h2>

          <p className="text-sm text-zinc-400 mb-5 line-clamp-3">
            {(currentManga?.Trama || "").slice(0, 150)}...
          </p>

          <button
            onClick={() => onSelect(currentManga)}
            className="
              px-6 py-2 rounded-xl
              bg-yellow-400 text-black font-semibold
              hover:bg-yellow-300
              hover:scale-105
              hover:shadow-[0_0_12px_rgba(250,204,21,0.5)]
              transition
            "
          >
            ✦ Dettagli
          </button>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {latest.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full ${
              i === current
                ? "w-4 h-4 bg-yellow-400"
                : "w-3 h-3 bg-white/30"
            }`}
          />
        ))}
      </div>

    </div>
  );
}
