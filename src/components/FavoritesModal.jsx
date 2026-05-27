import { useEffect, useState } from "react";
import MangaDetail from "./MangaDetail";

export default function FavoritesModal({ onClose }) {
  const API_URL = import.meta.env.VITE_API_URL;

  const [mangaList, setMangaList] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/manga`)
      .then((r) => r.json())
      .then((d) => setMangaList(Array.isArray(d) ? d : []))
      .catch(() => setMangaList([]));
  }, [API_URL]);

  const favManga = mangaList.filter(
    (m) => Number(m.Valutazione) >= 5
  );

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center pointer-events-auto"
      onClick={onClose}
    >
      <div className="absolute inset-0" />

      <div
        className="relative w-[1100px] max-w-[95vw] max-h-[84vh] rounded-3xl border border-white/10 shadow-2xl manga-detail-card overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-extrabold text-white">Preferiti</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Tutti i manga che hanno ricevuto 5 stelle.
            </p>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/8 border border-white/10 text-white hover:bg-white/12 transition-all duration-200"
          >
            Chiudi
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(84vh-88px)] custom-scrollbar">
          {favManga.length === 0 ? (
            <div className="text-center text-zinc-400 py-20">
              <div className="text-lg font-semibold text-white">
                Nessun preferito
              </div>
              <div className="text-sm mt-2">
                Un manga entrerà qui quando lo valuti con 5 stelle.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-5">
              {favManga.map((m) => (
                <div
                  key={m.ID}
                  className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04] backdrop-blur-lg hover:border-yellow-400/20 hover:shadow-[0_0_28px_rgba(234,179,8,0.08)] transition-all duration-300 cursor-pointer"
                  onClick={() => setSelected(m)}
                >
                  <div className="relative h-[250px] overflow-hidden bg-black/30">
                    {m.CoverURL ? (
                      <>
                        <img
                          src={m.CoverURL}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 w-full h-full object-cover scale-110 blur-md opacity-40"
                        />
                        <div className="absolute inset-0 bg-black/15" />
                        <img
                          src={m.CoverURL}
                          alt={m.Titolo || "cover"}
                          className="relative z-10 w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm bg-black/20">
                        Nessuna cover
                      </div>
                    )}

                    <div className="absolute inset-0 pointer-events-none">
                      <div className="cover-shine" />
                    </div>
                  </div>

                  <div className="p-3 text-white">
                    <div
                      className="text-sm font-semibold leading-tight min-h-[2.6rem]"
                      title={m.Titolo || ""}
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}
                    >
                      {m.Titolo || "Titolo sconosciuto"}
                    </div>

                    <div
                      className="text-xs text-zinc-400 mt-1 truncate"
                      title={m.Autore || ""}
                    >
                      {m.Autore || "Autore sconosciuto"}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="inline-flex px-2 py-1 rounded-full bg-yellow-400/15 text-yellow-300 border border-yellow-400/20 text-[11px]">
                        5 stelle
                      </span>

                      <span className="text-xs text-zinc-400">
                        ⭐ {m.Valutazione ?? "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <MangaDetail
          manga={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
