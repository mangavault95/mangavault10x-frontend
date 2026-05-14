import { useEffect, useState } from "react";

export default function TopHero() {
  const [heroList, setHeroList] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((res) => res.json())
      .then((data) => {
        setHeroList(data || []);
      })
      .catch(console.error);
  }, []);

  // AUTO ROTATION HERO
  useEffect(() => {
    if (heroList.length <= 1) return;

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % heroList.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [heroList]);

  const manga = heroList[index];

  if (!manga) return null;

  return (
    <div className="relative h-[360px] rounded-2xl overflow-hidden bg-black">

      {/* 🔥 BACKGROUND BLUR (NO PIXELATION EFFECT) */}
      <div
        className="absolute inset-0 scale-110"
        style={{
          backgroundImage: `url(${manga.CoverURL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(40px) brightness(0.4)",
          transform: "scale(1.2)"
        }}
      />
className="relative z-10"
      {/* DARK OVERLAY CINEMATIC */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />

      {/* CONTENT */}
      <div className="relative z-10 h-full flex items-center px-8 gap-8">

        {/* POSTER (CLEAN, NO STRETCH) */}
        <div className="flex-shrink-0">
          <img
            src={manga.CoverURL}
            alt={manga.Titolo}
            className="
              w-[180px]
              h-[260px]
              object-cover
              rounded-xl

              shadow-[0_30px_80px_rgba(0,0,0,0.8)]
              border border-zinc-700
            "
          />
        </div>

        {/* TEXT */}
        <div className="max-w-xl">

          <p className="text-yellow-500 text-xs tracking-widest mb-2">
            IN EVIDENZA
          </p>

          <h1 className="text-4xl font-bold mb-3 leading-tight">
            {manga.Titolo}
          </h1>

          <p className="text-zinc-300 text-sm line-clamp-3 mb-5">
            {manga.Trama || manga.synopsis || "Nessuna descrizione disponibile"}
          </p>

          <div className="flex gap-3">

            <button className="bg-yellow-600 hover:bg-yellow-500 px-5 py-2 rounded-lg font-semibold transition-all active:scale-95">
              Dettagli
            </button>

            <button className="bg-zinc-800 hover:bg-zinc-700 px-5 py-2 rounded-lg transition-all active:scale-95">
              Vai alla scheda
            </button>

          </div>

        </div>

      </div>

      {/* DOTS (indicatori slide) */}
      {heroList.length > 1 && (
        <div className="absolute bottom-4 right-6 flex gap-2">
          {heroList.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-6 bg-yellow-500"
                  : "w-2 bg-zinc-600"
              }`}
            />
          ))}
        </div>
      )}

    </div>
  );
}
