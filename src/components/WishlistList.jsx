import { useEffect, useState } from "react";
import WishlistModal from "./WishlistModal";
import MangaDetail from "./MangaDetail";

export default function WishlistList({ onClose }) {
  const API_URL = import.meta.env.VITE_API_URL;

  const [items, setItems] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/wishlist/all`);
      const data = await res.json().catch(() => []);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Errore caricamento wishlist:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function removeItem(id) {
    try {
      await fetch(`${API_URL}/api/wishlist/${id}`, {
        method: "DELETE"
      });
      load();
    } catch (err) {
      console.error("Errore delete wishlist:", err);
    }
  }

  async function markAsOwned(id) {
    try {
      await fetch(`${API_URL}/api/wishlist-actions/purchase/${id}`, {
        method: "POST"
      });
      load();
    } catch (err) {
      console.error("Errore acquisto wishlist:", err);
    }
  }

  function openDetail(m) {
    setSelected({
      ID: m.id,
      Titolo: m.titolo || "",
      Autore: m.autori || "",
      Trama: m.trama || "",
      Genere: m.generi || "",
      VolumiTotali: m.volumitotali || 0,
      VolumiPosseduti: 0,
      CoverURL: m.coverurl || "",
      Costo: 0,
      Editore: "",
      Valutazione: 0
    });
  }

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center pointer-events-auto"
      onClick={onClose}
    >
      {/* overlay trasparente: si vede il sito sotto */}
      <div className="absolute inset-0" />

      <div
        className="
          relative w-[1120px] max-w-[95vw] max-h-[84vh]
          rounded-3xl border border-white/10 shadow-2xl
          manga-detail-card backdrop-blur-xl
          overflow-hidden
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-extrabold text-white">Wishlist</h2>
            <p className="text-sm text-zinc-400 mt-1">
              I manga che vuoi recuperare, modificare o segnare come acquistati.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setOpenAdd(true)}
              className="
                px-4 py-2 rounded-xl
                bg-yellow-400 text-black font-semibold
                hover:brightness-110 active:scale-95
                transition-all duration-200
                shadow-[0_0_18px_rgba(234,179,8,0.18)]
                hover:shadow-[0_0_26px_rgba(234,179,8,0.35)]
              "
            >
              + Aggiungi
            </button>

            <button
              onClick={onClose}
              className="
                px-4 py-2 rounded-xl
                bg-white/8 border border-white/10
                text-white hover:bg-white/12
                transition-all duration-200
              "
            >
              Chiudi
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6 overflow-y-auto max-h-[calc(84vh-88px)]">
          {loading ? (
            <div className="text-center text-zinc-400 py-20">
              Caricamento wishlist...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center text-zinc-400 py-20">
              <div className="text-lg font-semibold text-white">Wishlist vuota</div>
              <div className="text-sm mt-2">
                Clicca su <span className="text-yellow-400 font-medium">+ Aggiungi</span> per iniziare.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-5">
              {items.map((m) => (
                <div
                  key={m.id}
                  className="
                    group rounded-2xl overflow-hidden
                    border border-white/10
                    bg-white/[0.04] backdrop-blur-lg
                    hover:border-yellow-400/20
                    hover:shadow-[0_0_28px_rgba(234,179,8,0.08)]
                    transition-all duration-250
                    cursor-pointer
                  "
                  onClick={() => openDetail(m)}
                >
                  {/* COVER */}
                  <div className="relative h-[250px] bg-black/40 overflow-hidden">
                    {m.coverurl ? (
                      <img
                        src={m.coverurl}
                        alt={m.titolo || "cover"}
                        className="
                          w-full h-full object-cover
                          transition-transform duration-300
                          group-hover:scale-[1.03]
                        "
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">
                        Nessuna cover
                      </div>
                    )}

                    <div className="absolute inset-0 pointer-events-none">
                      <div className="cover-shine" />
                    </div>
                  </div>

                  {/* INFO */}
                  <div className="p-3 text-white">
                    <div
                      className="text-sm font-semibold leading-tight line-clamp-2 min-h-[2.6rem]"
                      title={m.titolo || ""}
                    >
                      {m.titolo || "Titolo sconosciuto"}
                    </div>

                    <div
                      className="text-xs text-zinc-400 mt-1 truncate"
                      title={m.autori || ""}
                    >
                      {m.autori || "Autore sconosciuto"}
                    </div>

                    <div className="mt-3 flex justify-between gap-2">
                      {/* MODIFICA */}
                      <button
                        title="Modifica"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditItem(m);
                        }}
                        className="
                          flex items-center justify-center w-9 h-9 rounded-lg
                          bg-white/[0.04] border border-white/[0.08]
                          text-zinc-400

                          transition-all duration-200 ease-out

                          hover:scale-105
                          hover:text-yellow-400
                          hover:border-yellow-400/40
                          hover:bg-yellow-400/10
                          hover:shadow-[0_0_12px_rgba(234,179,8,0.35)]

                          active:scale-95
                          active:shadow-[0_0_20px_rgba(234,179,8,0.6)]
                        "
                      >
                        ✎
                      </button>

                      {/* ELIMINA */}
                      <button
                        title="Elimina"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(m.id);
                        }}
                        className="
                          flex items-center justify-center w-9 h-9 rounded-lg
                          bg-white/[0.04] border border-white/[0.08]
                          text-zinc-400

                          transition-all duration-200 ease-out

                          hover:scale-105
                          hover:text-red-400
                          hover:border-red-400/40
                          hover:bg-red-400/10
                          hover:shadow-[0_0_12px_rgba(248,113,113,0.35)]

                          active:scale-95
                          active:shadow-[0_0_20px_rgba(248,113,113,0.6)]
                        "
                      >
                        ⨯
                      </button>

                      {/* ACQUISTATO */}
                      <button
                        title="Segna come acquistato"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsOwned(m.id);
                        }}
                        className="
                          flex items-center justify-center w-9 h-9 rounded-lg
                          bg-white/[0.04] border border-white/[0.08]
                          text-zinc-400

                          transition-all duration-200 ease-out

                          hover:scale-105
                          hover:text-green-400
                          hover:border-green-400/40
                          hover:bg-green-400/10
                          hover:shadow-[0_0_12px_rgba(74,222,128,0.35)]

                          active:scale-95
                          active:shadow-[0_0_20px_rgba(74,222,128,0.6)]
                        "
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {openAdd && (
        <WishlistModal
          onClose={() => setOpenAdd(false)}
          onSaved={() => {
            load();
            setOpenAdd(false);
          }}
        />
      )}

      {editItem && (
        <WishlistModal
          initialData={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => {
            load();
            setEditItem(null);
          }}
        />
      )}

      {selected && (
        <MangaDetail
          manga={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
