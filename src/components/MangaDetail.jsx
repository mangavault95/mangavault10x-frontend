import { useEffect } from "react";

export default function MangaDetail({ manga, onClose }) {

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  if (!manga) return null;

  const owned = Number(manga.VolumiPosseduti) || 0;
  const total = Number(manga.VolumiTotali) || 0;
  const price = Number(manga.PrezzoVolume) || 0;
  const percent = total ? Math.min((owned / total) * 100, 100) : 0;
  const totalCost = total && price ? (total * price).toFixed(2) : "N/A";
  const rating = Number(manga.Valutazione) || 0;

  return (
    <div
      className="fixed inset-0 z-[999] overflow-y-auto"
      onClick={onClose}
    >

      {/* BACKGROUND COLOR EXTRACTED FROM COVER */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, rgba(20,20,20,0.95), rgba(40,40,40,0.95)), url(${manga.CoverURL})`,
          backgroundSize: "120px",
          backgroundRepeat: "repeat",
          opacity: 0.25
        }}
      />

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/70" />

      {/* CLOSE BUTTON */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 bg-black/40 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-2xl text-white hover:bg-white/20 transition z-[999]"
      >
        ✕
      </button>

      {/* MAIN CARD */}
      <div className="relative max-w-5xl mx-auto mt-20 mb-20 p-10 rounded-3xl shadow-2xl border border-white/10 bg-[#1a1a1a]/90 backdrop-blur-xl">

        <div className="flex gap-10">

          {/* COVER */}
          <img
            src={manga.CoverURL}
            className="w-[260px] h-[380px] object-cover rounded-2xl shadow-2xl border border-white/10"
          />

          {/* RIGHT SIDE */}
          <div className="flex-1">

            {/* TITLE */}
            <h1 className="text-5xl font-black text-white mb-2 drop-shadow-xl">
              {manga.Titolo}
            </h1>
            <p className="text-zinc-400 text-lg mb-6">{manga.Autore}</p>

            {/* RATING STARS */}
            <div className="flex items-center gap-1 mb-6">
              {[1,2,3,4,5].map(i => (
                <span
                  key={i}
                  className={`text-3xl ${
                    i <= rating ? "text-yellow-400" : "text-zinc-600"
                  }`}
                >
                  ★
                </span>
              ))}
            </div>

            {/* DESCRIPTION */}
            <p className="text-zinc-300 leading-relaxed text-[15px] mb-8 whitespace-pre-line">
              {manga.Trama || "Nessuna descrizione disponibile."}
            </p>

            {/* STATS */}
            <div className="grid grid-cols-2 gap-4 mb-8">

              <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                <p className="text-xs text-zinc-400">Volumi posseduti</p>
                <p className="text-3xl font-semibold">{owned}</p>
              </div>

              <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                <p className="text-xs text-zinc-400">Volumi totali</p>
                <p className="text-3xl font-semibold">{total || "?"}</p>
              </div>

              <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                <p className="text-xs text-zinc-400">Costo totale serie</p>
                <p className="text-3xl font-semibold">{totalCost}€</p>
              </div>

              <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                <p className="text-xs text-zinc-400">Completion</p>
                <p className="text-3xl font-semibold">{percent.toFixed(0)}%</p>
              </div>

            </div>

            {/* PROGRESS BAR WITH PERCENTAGE INSIDE */}
            <div className="relative h-4 bg-white/10 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all flex items-center justify-end pr-2 text-black font-bold text-xs"
                style={{ width: `${percent}%` }}
              >
                {percent.toFixed(0)}%
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
