import { useEffect, useState, useRef } from "react";

export default function MangaDetail({ manga, onClose }) {

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  if (!manga) return null;

  const [rating, setRating] = useState(Number(manga.Valutazione) || 0);
  const [hoverRating, setHoverRating] = useState(0);

  const owned = Number(manga.VolumiPosseduti) || 0;
  const total = Number(manga.VolumiTotali) || 0;

  const percent = total
    ? Math.min((owned / total) * 100, 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      onClick={onClose}
    >

      {/* ✅ SFONDO COME PRIMA */}
      <div
        className="absolute inset-0"
        style={{
          background: manga.CoverURL
            ? `linear-gradient(135deg, rgba(20,25,50,0.9), rgba(40,20,60,0.9)), url(${manga.CoverURL})`
            : `linear-gradient(135deg, #0f172a, #1e1b4b)`,
          backgroundSize: "150px",
          opacity: 0.25
        }}
      />

      <div className="absolute inset-0 backdrop-blur-md" />

      {/* ✅ PANEL GRANDE */}
      <div
        className="relative w-[1200px] max-w-[95vw] rounded-3xl border border-white/10 shadow-2xl manga-detail-card"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="flex gap-10 p-8">

          {/* ✅ LEFT COVER */}
          <div className="w-[300px] flex flex-col">

            <div className="rounded-2xl overflow-hidden bg-black">
              {manga.CoverURL && (
                <img
                  src={manga.CoverURL}
                  className="w-full h-[420px] object-cover"
                />
              )}
            </div>

            <div className="mt-4 text-white">
              <p className="font-semibold">{manga.Titolo}</p>
              <p className="text-sm text-zinc-400">{manga.Autore}</p>
            </div>

          </div>

          {/* ✅ RIGHT CONTENT */}
          <div className="flex-1 text-white">

            {/* HEADER */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold">
                  {manga.Titolo}
                </h1>
                <p className="text-zinc-400 mt-1">
                  {manga.Autore}
                </p>
              </div>

              <button
                onClick={onClose}
                className="px-3 py-1 bg-red-500 rounded text-sm"
              >
                Chiudi
              </button>
            </div>

            {/* TAG */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {String(manga.Genere || "")
                .split(",")
                .filter(Boolean)
                .map((g, i) => (
                  <span
                    key={i}
                    className="text-xs bg-white/10 px-2 py-1 rounded"
                  >
                    {g.trim()}
                  </span>
                ))}
            </div>

            {/* TRAMA */}
            <p className="text-sm text-zinc-300 mb-6 max-h-[140px] overflow-auto">
              {manga.Trama}
            </p>

            {/* STATS */}
            <div className="grid grid-cols-3 gap-6 mb-6">

              <div>
                <p className="text-xs text-zinc-400">Volumi posseduti</p>
                <p className="text-xl font-semibold">{owned}</p>
              </div>

              <div>
                <p className="text-xs text-zinc-400">Volumi totali</p>
                <p className="text-xl font-semibold">{total || "?"}</p>
              </div>

              <div>
                <p className="text-xs text-zinc-400">Completamento</p>
                <p className="text-xl font-semibold">{Math.round(percent)}%</p>
              </div>

            </div>

            {/* PROGRESS BAR */}
            <div className="w-full h-3 bg-white/10 rounded overflow-hidden mb-6">
              <div
                className="h-full bg-green-500"
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* RATING */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(i => (
                <span
                  key={i}
                  onMouseEnter={() => setHoverRating(i)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(i)}
                  className={`text-2xl cursor-pointer ${
                    (hoverRating || rating) >= i
                      ? "text-yellow-400"
                      : "text-zinc-600"
                  }`}
                >
                  ★
                </span>
              ))}

              <span className="text-sm text-zinc-400 ml-2">
                {rating}/5
              </span>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
