import { useEffect, useState } from "react";
import WishlistModal from "./WishlistModal";

export default function WishlistList({ onClose }) {
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
    <div className="w-full h-full flex items-center justify-center">

      <div className="w-[1000px] max-h-[85vh] bg-[#121212] rounded-2xl border border-white/10 shadow-2xl flex flex-col">

        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-bold">Wishlist</h2>

          <div className="flex gap-2">
            <button
              onClick={() => setOpenAdd(true)}
              className="px-4 py-2 bg-yellow-400 text-black rounded-lg font-semibold"
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
            <div className="text-center text-zinc-500 mt-20">
              <p className="text-lg">Wishlist vuota</p>
              <p className="text-sm opacity-60">
                Clicca "+ aggiungi" per iniziare
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {items.map(m => (
                <div
                  key={m.id}
                  className="bg-[#181818] rounded-xl overflow-hidden hover:scale-[1.03] transition cursor-pointer"
                >
                  <img
                    src={m.coverurl || "https://placehold.co/300x450"}
                    className="w-full h-[200px] object-cover"
                  />

                  <div className="p-2">
                    <p className="text-sm font-semibold truncate">
                      {m.titolo}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {m.autori}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ✅ MODAL ADD */}
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
