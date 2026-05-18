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
      className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex justify-center overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="
          w-full max-w-5xl mt-10 mb-10
          bg-[#111111]
          border border-white/10
          rounded-2xl
          shadow-[0_0_40px_rgba(0,0,0,0.8)]
          p-8
        "
        onClick={e => e.stopPropagation()}
      >

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full"
        >
          ✕
        </button>

        <div className="flex gap-8">

          <img
            src={manga.CoverURL || "https://placehold.co/300x450"}
            className="w-[250px] h-[360px] object-cover rounded-xl"
          />

          <div className="flex-1">

            <h1 className="text-3xl font-black mb-2">
              {manga.Titolo}
            </h1>

            <p className="text-zinc-400 mb-4">
              {manga.Autore}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">

              <div className="bg-zinc-900 p-3 rounded-xl">
                <p className="text-xs text-zinc-400">Volumi posseduti</p>
                <p className="text-xl">{owned}</p>
              </div>

              <div className="bg-zinc-900 p-3 rounded-xl">
                <p className="text-xs text-zinc-400">Volumi totali</p>
                <p className="text-xl">{total || "?"}</p>
              </div>

              <div className="bg-zinc-900 p-3 rounded-xl">
                <p className="text-xs text-zinc-400">Valutazione</p>
                <p className="text-xl">
                  {manga.Valutazione || "N/A"}
                </p>
              </div>

              <div className="bg-zinc-900 p-3 rounded-xl">
                <p className="text-xs text-zinc-400">Completion</p>
                <p className="text-xl">{percent.toFixed(0)}%</p>
              </div>

            </div>

            <div className="h-2 bg-zinc-800 rounded mb-4">
              <div
                className="h-full bg-yellow-400 animate-pulse"
                style={{ width: `${percent}%` }}
              />
            </div>

            <p className="text-zinc-300">
              {manga.Trama || "Nessuna descrizione"}
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
