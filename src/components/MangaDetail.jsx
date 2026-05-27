import { useEffect, useState, useRef } from "react";

export default function MangaDetail({ manga, onClose, onSave }) {

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  if (!manga) return null;

  const [rating, setRating] = useState(Number(manga.Valutazione) || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [toast, setToast] = useState({ show: false, text: "", tone: "success" });
  const debounceRef = useRef(null);

  const [local, setLocal] = useState({
    Titolo: manga.Titolo || "",
    Autore: manga.Autore || "",
    Trama: manga.Trama || "",
    Genere: manga.Genere || "",
    VolumiPosseduti: Number(manga.VolumiPosseduti) || 0,
    VolumiTotali: manga.VolumiTotali ? Number(manga.VolumiTotali) : null,
    CoverURL: manga.CoverURL || "",
    Costo: manga.Costo ? Number(manga.Costo) : 0,
    Editore: manga.Editore || ""
  });

  // ✅ FIX CLICK (non passa sotto)
  return (
    <div
      className="fixed inset-0 z-[999] overflow-y-auto pointer-events-auto"
      onClick={onClose}
    >
      {/* ✅ background IDENTICO al tuo */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, rgba(10,10,10,0.96), rgba(30,30,30,0.96)), url(${local.CoverURL})`,
          backgroundSize: "120px",
          backgroundRepeat: "repeat",
          opacity: 0.14
        }}
      />

      {/* ✅ overlay leggero */}
      <div className="absolute inset-0 bg-black/60" />

      {/* ✅ bottone close */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 bg-black/40 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-2xl text-white hover:bg-white/20 transition z-[1000]"
      >
        ✕
      </button>

      {/* ✅ PANEL ORIGINALE */}
      <div
        className="relative max-w-6xl mx-auto mt-16 mb-16 p-8 rounded-3xl shadow-2xl border border-white/10 manga-detail-card"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="flex gap-8">

          {/* COVER */}
          <div className="w-[260px]">
            <div className="rounded-xl overflow-hidden shadow-2xl">
              <img
                src={local.CoverURL}
                className="w-full h-[380px] object-contain"
              />
            </div>
          </div>

          {/* CONTENUTO */}
          <div className="flex-1 bg-white/8 backdrop-blur-md rounded-xl p-6 text-white">

            <div className="flex justify-between">
              <div>
                <h1 className="text-3xl font-extrabold">{local.Titolo}</h1>
                <div className="text-zinc-300">{local.Autore}</div>
              </div>

              <div className="flex gap-2">
                <button className="px-3 py-1 bg-white/8 rounded">
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

            {/* TAG */}
            <div className="mt-3 flex gap-2 flex-wrap">
              {local.Genere.split(",").map((g, i) => (
                <span key={i} className="text-xs bg-white/8 px-2 py-1 rounded">
                  {g.trim()}
                </span>
              ))}
            </div>

            {/* DESCRIZIONE */}
            <div className="mt-4 text-sm text-zinc-300 max-h-40 overflow-auto">
              {local.Trama}
            </div>

            {/* STATS */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-zinc-400">Volumi posseduti</p>
                <p className="text-xl">{local.VolumiPosseduti}</p>
              </div>

              <div>
                <p className="text-xs text-zinc-400">Volumi totali</p>
                <p className="text-xl">{local.VolumiTotali || "?"}</p>
              </div>

              <div>
                <p className="text-xs text-zinc-400">Costo</p>
                <p className="text-xl">€ {local.Costo || 0}</p>
              </div>
            </div>

            {/* STELLE ✅ RIPRISTINATE */}
            <div className="mt-4 flex items-center gap-1">
              {[1,2,3,4,5].map(i => {
                const active = hoverRating ? i <= hoverRating : i <= rating;
                return (
                  <span
                    key={i}
                    onMouseEnter={() => setHoverRating(i)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(i)}
                    className={`text-2xl cursor-pointer ${
                      active ? "text-yellow-400" : "text-zinc-600"
                    }`}
                  >
                    ★
                  </span>
                );
              })}
            </div>

            {/* PROGRESS */}
            <div className="mt-4">
              <div className="w-full bg-white/10 h-3 rounded">
                <div
                  className="bg-green-500 h-full"
                  style={{ width: "60%" }}
                />
              </div>
            </div>

            {/* BOTTONI */}
            <div className="mt-4 flex gap-3">
              <button className="px-4 py-2 bg-blue-600 rounded">
                Segna come completato
              </button>
              <button className="px-4 py-2 bg-white/10 rounded">
                Salva modifiche
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
