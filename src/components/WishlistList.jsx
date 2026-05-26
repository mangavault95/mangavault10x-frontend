import { useEffect, useState } from "react";
import WishlistModal from "./WishlistModal";

export default function WishlistList() {
  const [items, setItems] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);

  async function load() {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/wishlist/all`
      );
      const data = await res.json();
      setItems(data || []);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl text-white">Wishlist</h2>

        <button
          onClick={() => setOpenAdd(true)}
          className="bg-yellow-400 px-3 py-2 rounded"
        >
          + Aggiungi
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-zinc-400">Nessun elemento</p>
      )}

      <div className="grid grid-cols-3 gap-4">
        {items.map((m) => (
          <div
            key={m.id}
            className="bg-[#1a1a1a] p-3 rounded text-white"
          >
            <img
              src={m.coverurl}
              className="h-40 object-cover mb-2"
            />
            <h3>{m.titolo}</h3>
            <p className="text-xs text-zinc-400">
              {m.autori}
            </p>
          </div>
        ))}
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
    </div>
  );
}
