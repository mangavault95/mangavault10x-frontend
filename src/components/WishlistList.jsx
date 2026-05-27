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

  const bgCover = items[0]?.coverurl;

  return (
    <div className="fixed inset-0 z-[999]">

      {/* ✅ SFONDO COME MANGADETAIL */}
      <div
        className="absolute inset-0"
        style={{
          background: bgCover
            ? `linear-gradient(135deg, rgba(15,20,40,0.9), rgba(30,20,50,0.9)), url(${bgCover})`
            : `linear-gradient(135deg, #0f172a, #1e1b4b)`,
          backgroundSize: "cover",
          opacity: 0.25
        }}
      />

      <div className="absolute inset-0 backdrop-blur-md" />

      {/* ✅ PANEL */}
      <div
        className="relative h-full flex items-center justify-center"
        onClick={onClose}
      >
        <div
          className="w-[1100px] max-h-[85vh] rounded-3xl manga-detail-card border border-white/10 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >

          {/* HEADER */}
          <div className="flex justify-between px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-bold text-white">Wishlist</h2>

            <div className="flex gap-2">
              <button
                onClick={() => setOpenAdd(true)}
                className="px-4 py-2 bg-yellow-400 text-black rounded-lg font-semibold hover:scale-105 transition"
              >
                + Aggiungi
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20"
              >
                Chiudi
              </button>
            </div>
          </div>

          {/* GRID */}
          <div className="p-6 overflow-y-auto flex-1">

            {items.length === 0 ? (
              <div className="text-center text-zinc-400 mt-20">
                Wishlist vuota
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-4">

                {items.map(m => (
                  <div
                    key={m.id}
                    className="bg-[#1a1a1a]/60 backdrop-blur rounded-xl overflow-hidden border border-white/5 hover:scale-[1.03] transition cursor-pointer"
                    onClick={() =>
                      setSelected({
                        ...m,
                        Titolo: m.titolo,
                        Autore: m.autori,
                        CoverURL: m.coverurl,
                        Trama: m.trama,
                        Genere: m.generi,
                        VolumiTotali: m.volumitotali,
                        VolumiPosseduti: 0
                      })
                    }
                  >

                    {/* COVER */}
                    <div className="h-[220px] bg-black overflow-hidden">
                      {m.coverurl && (
                        <img
                          src={m.coverurl}
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>

                    {/* INFO */}
                    <div className="p-3">
                      <p className="text-sm font-semibold text-white truncate">
                        {m.titolo}
                      </p>

                      {/* ✅ BOTTONI PULITI */}
                      <div className="flex justify-between mt-2 text-xs text-zinc-400">

                        <button
                          title="Modifica"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditItem(m);
                          }}
                          className="hover:text-yellow-400"
                        >
                          ✏️
                        </button>

                        <button
                          title="Elimina"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(m.id);
                          }}
                          className="hover:text-red-400"
                        >
                          🗑️
                        </button>

                        <button
                          title="Acquistato"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsOwned(m.id);
                          }}
                          className="hover:text-green-400"
                        >
                          ✅
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

      {openAdd && <WishlistModal onClose={() => setOpenAdd(false)} onSaved={load} />}
      {editItem && <WishlistModal initialData={editItem} onClose={() => setEditItem(null)} onSaved={load} />}
      {selected && <MangaDetail manga={selected} onClose={() => setSelected(null)} />}

    </div>
  );
}
