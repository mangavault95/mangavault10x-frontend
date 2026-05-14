import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function TopHero({ manga }) {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  // ✅ solo ultimi 3 manga
  const latest = (manga || []).slice(0, 3);

  // ✅ autoplay slider
  useEffect(() => {
    if (latest.length === 0) return;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % latest.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [latest]);

  if (latest.length === 0) return null;

  const currentManga = latest[current];

  return (
    <div className="relative w-full h-[360px] overflow-hidden rounded-2xl">

      {/* ✅ BACKGROUND */}
      <img
        src={
          currentManga?.CoverURL && currentManga.CoverURL !== "NULL"
            ? currentManga.CoverURL
            : "https://placehold.co/1200x400"
        }
        className="absolute w-full h-full object-cover"
        alt="background"
      />

      {/* ✅ overlay scuro */}
      <div className="absolute inset-0 bg-black/60" />

      {/* ✅ CONTENT */}
      <div className="relative z-10 h-full flex items-center px-10">

        {/* ✅ COVER */}
        <img
          src={
            currentManga?.CoverURL && currentManga.CoverURL !== "NULL"
              ? currentManga.CoverURL
              : "https://placehold.co/300x450"
          }
          className="w-44 h-[260px] object-cover rounded-xl shadow-lg"
          alt="cover"
        />

        {/* ✅ TESTO */}
        <div className="ml-8 max-w-xl">
          <h2 className="text-3xl font-bold text-white mb-3">
            {currentManga?.Titolo}
          </h2>

          <p className="text-sm text-zinc-300 mb-4 line-clamp-4">
            {currentManga?.Trama || "Nessuna descrizione disponibile"}
          </p>

          <button
            onClick={() => navigate(`/manga/${currentManga.ID}`)}
            className="bg-green-600 px-5 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Dettagli
          </button>
        </div>
      </div>
    </div>
  );
}
