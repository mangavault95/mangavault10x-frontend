import { useEffect, useState } from "react";
import WishlistModal from "./WishlistModal";
import MangaDetail from "./MangaDetail";

export default function WishlistList({ onClose }) {
  const [items, setItems] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selected, setSelected] = useState(null);

  async function load() {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/wishlist/all`);
    const data = await res.json();
    setItems(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function removeItem(id) {
    await fetch(`${import.meta.env.VITE_API_URL}/api/wishlist/${id}`, {
      method: "DELETE"
    });
    load();
  }

  async function markAsOwned(id) {
    await fetch(
      `${import.meta.env.VITE_API_URL}/api/wishlist-actions/purchase/${id}`,
      { method: "POST" }
    );
    load();
  }

  return (
    <div className="fixed inset-0 z-[999]">

      {/* ✅ niente sfondo scuro */}
      
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      {/* ✅ PANEL glass coerente */}
      <div className="flex items-center justify-center h-full">

        <div
          className="w-[1100px] max-h-[80vh] rounded-3xl border border-white/10 shadow-2xl manga-detail-card backdrop-blur-lg"
          onClick={(e) => e.stopPropagation()}
        >

          {/* HEADER */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 text-white">

            <h2 className="text-lg font-semibold">
              Wishlist
            </h2>

            <div className="flex gap-2">

              <button
                onClick={() => setOpenAdd(true)}
                className="px-4 py-2 rounded-lg bg-yellow-400 text-black font-semibold hover:brightness-110 transition"
              >
                + Aggiungi
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
              >
                Chiudi
              </button>

            </div>
          </div>

          {/* GRID */}
          <div className="p-6 overflow-y-auto">

            {items.length === 0 ? (
              <div className="text-center text-zinc-400 mt-20">
                Wishlist vuota
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-5">

                {items.map(m => (

                  <div
                    key={m.id}
                    className="group bg-[#151515]/70 backdrop-blur-md rounded-xl border border-white/5 overflow-hidden hover:scale-[1.03] transition"
                    onClick={() =>
                      setSelected({
                        ID: m.id,
                        Titolo: m.titolo,
                        Autore: m.autori,
                        Trama: m.trama || "",
                        Genere: m.generi || "",
                        VolumiTotali: m.volumitotali || 0,
                        VolumiPosseduti: 0,
                        CoverURL: m.coverurl || "",
                        Costo: 0
                      })
                    }
                  >

                    {/* ✅ COVER (NO bande nere) */}
                    <div className="h-[230px] overflow-hidden bg-black">
                      <img
                        src={m.coverurl}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* ✅ INFO */}
                    <div className="p-3 text-white">

                      <p className="text-sm font-semibold leading-tight truncate">
                        {m.titolo}
                      </p>

                      <p className="text-xs text-zinc-400 truncate">
                        {m.autori || "Autore sconosciuto"}
                      </p>

                      {/* ✅ BOTTONI ELEGANTI */}
                      <div className="flex justify-between mt-3 text-sm">

                        <button
                          title="Modifica"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditItem(m);
                          }}
                          className="text-zinc-400 hover:text-yellow-400 transition"
                        >
                          ✏️
                        </button>

                        <button
                          title="Elimina"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(m.id);
                          }}
                          className="text-zinc-400 hover:text-red-400 transition"
                        >
                          🗑️
                        </button>

                        <button
                          title="Acquistato"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsOwned(m.id);
                          }}
                          className="text-zinc-400 hover:text-green-400 transition"
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
      </div>

      {openAdd && (
        <WishlistModal onClose={() => setOpenAdd(false)} onSaved={load} />
      )}

      {editItem && (
        <WishlistModal
          initialData={editItem}
          onClose={() => setEditItem(null)}
          onSaved={load}
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
