import { useEffect } from "react";

export default function MangaDetail({ manga, onClose }) {

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  if (!manga) return null;

  const owned = Number(manga.VolumiPosseduti) || 0;
  const total = Number(manga.VolumiTotali) || 0;
  const percent = total ? Math.min((owned / total) * 100, 100) : 0;

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex justify-center overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl mt-10 mb-10 rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >

        {/* HERO BACKGROUND */}
        <div
          className="absolute inset-0 opacity-30 blur-xl"
          style={{
            backgroundImage: `url(${manga.CoverURL})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        />

        {/* DARK OVERLAY */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/90 to-black" />

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 bg-white/10 backdrop-blur rounded-full flex items-center justify-center text-xl z-50"
        >
          ✕
        </button>

        {/* CONTENT */}
        <div className="relative z-50 p-10 flex gap-10">

          {/* COVER */}
          <img
            src={manga.CoverURL}
            className="w-[260px] h-[380px] object-cover rounded-xl shadow-xl"
          />

          {/* TEXT AREA */}
          <div className="flex-1">

            <h1 className="text-4xl font-black mb-1 tracking-tight">
              {manga.Titolo}
            </h1>

            <p className="text-zinc-400 text-lg mb-6">
              {manga.Autore}
            </p>

            {/* STATS */}
            <div className="grid grid-cols-2 gap-4 mb-6">

              <div className="bg-white/5 p-4 rounded-xl backdrop-blur">
                <p className="text-xs text-zinc-400">Volumi posseduti</p>
                <p className="text-2xl font-semibold">{owned}</p>
              </div>

              <div className="bg-white/5 p-4 rounded-xl backdrop-blur">
                <p className="text-xs text-zinc-400">Volumi totali</p>
                <p className="text-2xl font-semibold">{total || "?"}</p>
              </div>

              <div className="bg-white/5 p-4 rounded-xl backdrop-blur">
                <p className="text-xs text-zinc-400">Valutazione</p>
                <p className="text-2xl font-semibold">{manga.Valutazione || "N/A"}</p>
              </div>

              <div className="bg-white/5 p-4 rounded-xl backdrop-blur">
                <p className="text-xs text-zinc-400">Completion</p>
                <p className="text-2xl font-semibold">{percent.toFixed(0)}%</p>
              </div>

            </div>

            {/* PROGRESS BAR */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-yellow-400 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* DESCRIPTION */}
            <p className="text-zinc-300 leading-relaxed text-sm">
              {manga.Trama || "Nessuna descrizione disponibile."}
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
