import { useEffect, useState } from "react";

export default function TopHero({ manga }) {
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);

  const latest = (manga || []).slice(0, 3);

  // ✅ AUTO SLIDE + FADE
  useEffect(() => {
    if (!latest.length) return;

    const interval = setInterval(() => {
      setFade(false);

      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % latest.length);
        setFade(true);
      }, 250); // tempo fade-out

    }, 5000);

    return () => clearInterval(interval);
  }, [latest.length]);

  if (!latest.length) return null;

  const currentManga = latest[current];

  return (
    <div className="relative w-full h-[340px] rounded-2xl overflow-hidden border border-white/10 shadow-xl">

      {/* ✅ BACKGROUND GRADIENT ESTETICO */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-[#101018] to-black" />

      {/* ✅ GLASS OVERLAY */}
      <div className="absolute inset-0 backdrop-blur-[2px] bg-black/20" />

      {/* ✅ CONTENUTO CON FADE */}
      <div
        className={`relative z-10 h-full flex items-center px-10 transition-all duration-300 ${
          fade ? "opacity-100" : "opacity-0"
        }`}
      >

        {/* ✅ COVER */}
        <img
          src={currentManga?.CoverURL || "https://placehold.co/300x450"}
          className="w-40 h-[260px] object-cover rounded-xl shadow-lg"
          alt="cover"
        />

        {/* ✅ TESTI */}
        <div className="ml-8 max-w-xl">

          <h2 className="text-3xl font-bold text-white mb-3">
            {currentManga?.Titolo}
          </h2>

          <p className="text-sm text-zinc-400 mb-5 line-clamp-4">
            {currentManga?.Trama || "Nessuna descrizione disponibile"}
          </p>

          <button
            onClick={() =>
              (window.location.href = `/manga/${currentManga.ID}`)
            }
            className="bg-green-600 hover:bg-green-700 transition px-5 py-2 rounded-lg"
          >
            Dettagli
          </button>
        </div>
      </div>

      {/* ✅ DOTS CLICCABILI */}
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

      {/* ✅ LIGHT GLOW BORDER (premium feel) */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 pointer-events-none" />

    </div>
  );
}
