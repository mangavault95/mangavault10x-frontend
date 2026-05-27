import { useEffect, useState } from "react";
import WishlistModal from "./WishlistModal";
import MangaDetail from "./MangaDetail";

export default function WishlistList({ onClose }) {
  const [items, setItems] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selected, setSelected] = useState(null);

  async function load() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/wishlist/all`);
      const data = await res.json();
      setItems(data || []);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ✅ ELIMINA
  async function removeItem(id) {
    await fetch(`${import.meta.env.VITE_API_URL}/api/wishlist/${id}`, {
      method: "DELETE"
    });
    load();
  }

  // ✅ ACQUISTATO → INSERT IN MANGA
  async function markAsOwned(item) {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/manga/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titolo: item.titolo,
          autore: item.autori,
          coverurl: item.coverurl,
          trama: item.trama,
          genere: item.generi,
          volumitotali: item.volumitotali,
          volumiposseduti: 0
        })
      });

      // elimina dalla wishlist
      await removeItem(item.id);

    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] pointer-events-none">

      <div className="relative w-full h-full flex items-center justify-center pointer-events-auto">

        <div className="w-[1100px] max-h-[85vh] rounded-3xl border border-white/10 shadow-2xl manga-detail-card flex flex-col">

          {/* HEADER */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">Wishlist</h2>

            <div className="flex gap-2">
              <button
                onClick={() => setOpenAdd(true)}
                className="px-4 py-2 bg-yellow-400 text-black rounded-lg"
              >
                + Aggiungi
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/10 rounded-lg"
              >
                Chiudi
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="p-6 overflow-y-auto flex-1">

            {items.length === 0 ? (
              <div className="text-center text-zinc-400 mt-20">
                <p>Wishlist vuota</p>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-4">

                {items.map((m) => (
                  <div
                    key={m.id}
                    className="relative group bg-[#1a1a1a]/70 rounded-xl overflow-hidden border border-white/5 cursor-pointer"
                    onClick={() =>
                      setSelected({
                        ...m,
                        Titolo: m.titolo,
                        Autore: m.autori,
                        Trama: m.trama,
                        CoverURL: m.coverurl,
                        Genere: m.generi,
                        VolumiTotali: m.volumitotali,
                        VolumiPosseduti: 0
                      })
                    }
                  >

                    {/* COVER */}
                    <div className="h-[220px] bg-black overflow-hidden">
                      <img src={m.coverurl} className="w-full h-full object-cover" />
                    </div>

                    {/* INFO */}
                    <div className="p-2">
                      <p className="text-sm font-semibold truncate">
                        {m.titolo}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">
                        {m.autori}
                      </p>
                    </div>

                    {/* ACTIONS */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col justify-center items-center gap-2 transition">

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditItem(m);
                        }}
                        className="px-3 py-1 bg-blue-600 rounded text-sm"
                      >
                        Modifica
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(m.id);
                        }}
                        className="px-3 py-1 bg-red-600 rounded text-sm"
                      >
                        Elimina
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsOwned(m);
                        }}
                        className="px-3 py-1 bg-green-500 rounded text-sm"
                      >
                        Acquistato ✅
                      </button>

                    </div>

                  </div>
                ))}

              </div>
            )}

          </div>
        </div>
      </div>

      {/* ADD */}
      {openAdd && (
        <WishlistModal
          onClose={() => setOpenAdd(false)}
          onSaved={() => {
            load();
            setOpenAdd(false);
          }}
        />
      )}

      {/* EDIT */}
      {editItem && (
        <WishlistModal
          onClose={() => setEditItem(null)}
          onSaved={() => {
            load();
            setEditItem(null);
          }}
          initialData={editItem}
        />
      )}

      {/* DETAIL */}
      {selected && (
        <MangaDetail
          manga={selected}
          onClose={() => setSelected(null)}
        />
      )}

    </div>
  );
}
