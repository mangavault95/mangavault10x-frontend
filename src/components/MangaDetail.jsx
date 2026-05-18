import { useEffect } from "react";

export default function MangaDetail({ manga, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  if (!manga) return null;

  const owned = Number(manga.VolumiPosseduti) || 0;
  const total = Number(manga.VolumiTotali);

  let percent = 0;
  let status = "IN CORSO";

  if (total) {
    percent = Math.min((owned / total) * 100, 100);

    if (percent >= 100) {
      status = "COMPLETATO";
    } else {
      status = "DA COMPLETARE";
    }
  }

  function getColor() {
    if (status === "COMPLETATO") return "bg-green-500";
    if (status === "DA COMPLETARE") return "bg-orange-500";
    return "bg-red-500";
  }

  return (
    <div
      className="
        fixed inset-0 z-[99999]
        bg-black/80
        backdrop-blur-xl
        overflow-y-auto
        animate-[fadeIn_.25s_ease]
      "
      onClick={onClose}
    >
      {/* MODAL WRAPPER (IMPORTANTE: ALTO, NON CENTRATO) */}
      <div
        className="
          relative
          w-full
          max-w-6xl
          mx-auto
          mt-16
          mb-16
          bg-[#0b0b0f]
          rounded-2xl
          border border-zinc-800
          shadow-2xl
          overflow-hidden
        "
        onClick={(e) => e.stopPropagation()}
      >

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="
            fixed top-6 right-6 z-[100000]
            bg-white/10 hover:bg-white/20
            backdrop-blur-md
            w-12 h-12
            rounded-full
            text-2xl
            transition
          "
        >
          ✕
        </button>

        {/* HERO */}
        <div className="relative w-full h-[70vh] overflow-hidden">

          {/* BACKGROUND */}
          <img
            src={manga.CoverURL}
            alt={manga.Titolo}
            className="
              absolute inset-0
              w-full h-full
              object-cover
              scale-110
              blur-sm
              opacity-30
            "
          />

          {/* OVERLAY */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0f] via-[#0b0b0f]/70 to-black/30" />

          {/* CONTENT */}
          <div className="relative z-10 h-full flex items-end px-16 pb-16">

            <div className="flex gap-10 items-end">

              {/* COVER */}
              <div className="rounded-3xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] shrink-0">
                <img
                  src={manga.CoverURL}
                  alt={manga.Titolo}
                  className="w-[320px] h-[460px] object-cover"
                />
              </div>

              {/* INFO */}
              <div className="max-w-3xl">

                <p className="text-yellow-500 tracking-[0.3em] text-sm mb-3">
                  MANGAVAULT COLLECTION
                </p>

                <h1 className="text-6xl font-black leading-none mb-6">
                  {manga.Titolo}
                </h1>

                <div className="flex gap-3 mb-5 flex-wrap">

                  <span className="bg-white/10 px-4 py-2 rounded-full text-sm">
                    {manga.Autore || "Autore sconosciuto"}
                  </span>

                  <span className="bg-white/10 px-4 py-2 rounded-full text-sm">
                    {manga.Genere || "Nessun genere"}
                  </span>

                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${getColor()}`}>
                    {status}
                  </span>

                </div>

                {/* RATING */}
                <div className="flex items-center gap-3 mb-6">

                  <div className="text-yellow-400 text-3xl">★</div>

                  <div>
                    <div className="text-2xl font-bold">
                      {manga.Valutazione || "N/A"}
                    </div>
                    <div className="text-zinc-400 text-sm">
                      Valutazione personale
                    </div>
                  </div>

                </div>

                {/* PROGRESS */}
                <div className="mb-6">

                  <div className="flex justify-between mb-2 text-sm text-zinc-300">
                    <span>Progressione collezione</span>
                    <span>
                      {total ? `${owned}/${total}` : "In corso"}
                    </span>
                  </div>

                  <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getColor()} transition-all duration-700`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                </div>

                {/* TRAMA */}
                <p className="text-zinc-300 leading-relaxed text-lg max-w-2xl">
                  {manga.Trama || "Nessuna descrizione disponibile."}
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* EXTRA */}
        <div className="px-16 py-12">

          <h2 className="text-3xl font-bold mb-8">
            Informazioni
          </h2>

          <div className="grid grid-cols-4 gap-6">

            <div className="bg-zinc-900 rounded-2xl p-6">
              <p className="text-zinc-400 text-sm mb-2">Volumi posseduti</p>
              <p className="text-3xl font-bold">{owned}</p>
            </div>

            <div className="bg-zinc-900 rounded-2xl p-6">
              <p className="text-zinc-400 text-sm mb-2">Volumi totali</p>
              <p className="text-3xl font-bold">{total || "?"}</p>
            </div>

            <div className="bg-zinc-900 rounded-2xl p-6">
              <p className="text-zinc-400 text-sm mb-2">Stato</p>
              <p className="text-2xl font-bold">{status}</p>
            </div>

            <div className="bg-zinc-900 rounded-2xl p-6">
              <p className="text-zinc-400 text-sm mb-2">Completion</p>
              <p className="text-3xl font-bold">{percent.toFixed(0)}%</p>
            </div>

          </div>

        </div>

      </div>

      {/* ANIMATIONS */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}
      </style>

    </div>
  );
}
