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
      className="fixed inset-0 bg-black/90 z-[999] overflow-y-auto"
      onClick={onClose}
    >

      {/* HERO BACKGROUND */}
      <div
        className="relative h-[380px] w-full"
        style={{
          backgroundImage: `url(${manga.CoverURL})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/80 to-black" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-12 h-12 bg-black/40 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-2xl text-white hover:bg-white/20 transition"
        >
          ✕
        </button>

        {/* Title + Author */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center">
          <h1 className="text-5xl font-black text-white drop-shadow-2xl">
            {manga.Titolo}
          </h1>
          <p className="text-zinc-300 text-lg mt-2">{manga.Autore}</p>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="max-w-5xl mx-auto -mt-24 mb-20 p-10 bg-[#141414] rounded-3xl shadow-2xl border border-white/10 relative z-50">

        <div className="flex gap-10">

          {/* COVER */}
          <img
            src={manga.CoverURL}
            className="w-[260px] h-[380px] object-cover rounded-2xl shadow-xl border border-white/10"
          />

          {/* RIGHT SIDE */}
          <div className="flex-1">

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

              <div className="bg-white/5 p-5 rounded-xl backdrop-blur border border-white/10">
                <p className="text-xs text-zinc-400">Volumi posseduti</p>
                <p className="text-3xl font-semibold">{owned}</p>
              </div>

              <div className="bg-white/5 p-5 rounded-xl backdrop-blur border border-white/10">
                <p className="text-xs text-zinc-400">Volumi totali</p>
                <p className="text-3xl font-semibold">{total || "?"}</p>
              </div>

              <div className="bg-white/5 p-5 rounded-xl backdrop-blur border border-white/10">
                <p className="text-xs text-zinc-400">Costo totale serie</p>
                <p className="text-3xl font-semibold">{totalCost}€</p>
              </div>

              <div className="bg-white/5 p-5 rounded-xl backdrop-blur border border-white/10">
                <p className="text-xs text-zinc-400">Completion</p>
                <p className="text-3xl font-semibold">{percent.toFixed(0)}%</p>
              </div>

            </div>

            {/* PROGRESS BAR */}
            <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
