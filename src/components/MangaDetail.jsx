import { useEffect, useState, useRef } from "react";

export default function MangaDetail({ manga, onClose, onSave }) {

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  if (!manga) return null;

  // ✅ QUI devono stare tutti gli hook (NON sopra JSX)
  const [rating, setRating] = useState(Number(manga.Valutazione) || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const debounceRef = useRef(null);

  const owned = Number(manga.VolumiPosseduti) || 0;
  const total = Number(manga.VolumiTotali) || 0;

  const percent = total
    ? Math.min((owned / total) * 100, 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-[999] overflow-y-auto pointer-events-auto"
      onClick={onClose}
    >

      {/* ✅ IDENTICO AL TUO */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, rgba(10,10,10,0.96), rgba(30,30,30,0.96)), url(${manga.CoverURL})`,
          backgroundSize: "120px",
          backgroundRepeat: "repeat",
          opacity: 0.14
        }}
      />

      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* ✅ X */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 bg-black/40 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-2xl text-white hover:bg-white/20 transition z-[1000]"
      >
        ✕
      </button>

      {/* ✅ PANEL (QUESTO È IL TUO, NON LO TOCCO) */}
      <div
        className="relative max-w-6xl mx-auto mt-16 mb-16 p-8 rounded-3xl shadow-2xl border border-white/10 manga-detail-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-8">

          {/* LEFT */}
          <div className="w-[260px]">
            <img
              src={manga.CoverURL}
              className="w-full h-[380px] object-contain rounded-xl"
            />

            <div className="mt-3 text-white">
              <div className="font-semibold">{manga.Titolo}</div>
              <div className="text-sm text-zinc-400">{manga.Autore}</div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex-1 bg-white/8 backdrop-blur-md rounded-xl p-6 text-white">

            <div className="flex justify-between">
              <div>
                <h1 className="text-3xl font-extrabold">{manga.Titolo}</h1>
                <div className="text-zinc-300">{manga.Autore}</div>
              </div>

              <div className="flex gap-2">
                <button className="px-3 py-1 bg-white/10 rounded">
                  Modifica
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-1 bg-red-600 rounded"
                >
                  Chiudi
                </button>
              </div>
            </div>

            {/* STELLE ✅ */}
            <div className="mt-4 flex">
              {[1,2,3,4,5].map(i => {
                const active = hoverRating ? i <= hoverRating : i <= rating;

                return (
                  <span
                    key={i}
                    onMouseEnter={() => setHoverRating(i)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(i)}
                    className={`text-2xl cursor-pointer ${
                      active ? "text-yellow-400" : "text-zinc-500"
                    }`}
                  >
                    ★
                  </span>
                );
              })}
            </div>

            {/* PROGRESS */}
            <div className="mt-4">
              <div className="w-full h-3 bg-white/10 rounded">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
