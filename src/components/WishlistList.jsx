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
    <div className="fixed inset-0 z-[999] pointer-events-none">

      <div className="flex items-center justify-center h-full pointer-events-auto">

        <div className="w-[1000px] bg-[#121212] rounded-2xl p-6">

          <div className="flex justify-between mb-4">
            <h2>Wishlist</h2>
            <button onClick={() => setOpenAdd(true)}>+</button>
          </div>

          <div className="grid grid-cols-4 gap-4">

            {items.map(m => (
              <div
                key={m.id}
                className="bg-[#1a1a1a] rounded"
                onClick={() => setSelected({
                  ...m,
                  Titolo: m.titolo,
                  Autore: m.autori
                })}
              >

                {m.coverurl}

                <div className="p-2">
                  <p>{m.titolo}</p>

                  <div className="flex justify-around mt-2">

                    <button onClick={(e) => { e.stopPropagation(); setEditItem(m); }}>✏️</button>
                    <button onClick={(e) => { e.stopPropagation(); removeItem(m.id); }}>🗑️</button>
                    <button onClick={(e) => { e.stopPropagation(); markAsOwned(m.id); }}>✅</button>

                  </div>

                </div>
              </div>
            ))}

          </div>

        </div>
      </div>

      {openAdd && <WishlistModal onClose={() => setOpenAdd(false)} onSaved={load} />}
      {editItem && <WishlistModal initialData={editItem} onClose={() => setEditItem(null)} onSaved={load} />}
      {selected && <MangaDetail manga={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
