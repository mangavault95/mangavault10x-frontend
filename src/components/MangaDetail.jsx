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
          relative
        "
        onClick={(e) => e.stopPropagation()}
      >

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="
            absolute top-4 right-4
            w-10 h-10 rounded-full
            bg-white/10 hover:bg-white/20
            transition
          "
        >
          ✕
        </button>

        <div className="flex gap-8 p-8">

          {/* COVER */}
          <img
            src={
              manga.CoverURL &&
              manga.CoverURL.startsWith("http")
                ? manga.CoverURL
                : "https://placehold.co/300x450?text=MangaVault"
            }
            className="w-[250px] h-[360px] object-cover rounded-xl"
          />

          {/* INFO */}
          <div className="flex-1">

            <h1 className="text-3xl font-black mb-4 text-white">
              {manga.Titolo}
            </h1>

            <p className="text-zinc-400 mb-4 text-sm leading-relaxed">
              {manga.Trama || "Nessuna descrizione disponibile."}
            </p>

            {/* PROGRESS */}
            <div className="mb-4">
              <div className="text-sm text-zinc-400 mb-1">
                {owned}/{total || "?"}
              </div>

              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 transition-all duration-500"
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
