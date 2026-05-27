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

  // 🔥 PRENDE UNA COVER PER LO SFONDO
  const bgCover = items[0]?.coverurl;

return (
  <div className="fixed inset-0 z-[999] pointer-events-none">


      {/* ✅ BACKGROUND stile MangaDetail */}
      <div
        className="absolute inset-0"
        style={{
          background: bgCover
            ? `linear-gradient(135deg, rgba(10,10,10,0.95), rgba(20,20,20,0.95)), url(${bgCover})`
            : `linear-gradient(135deg, rgba(10,10,10,0.95), rgba(30,30,30,0.95))`,
          backgroundSize: "120px",
          backgroundRepeat: "repeat",
          opacity: 0.18
        }}
      />


      {/* ✅ PANEL */}
<div className="relative w-full h-full flex items-center justify-center pointer-events-auto">

        <div
          className="w-[1100px] max-h-[85vh] rounded-3xl shadow-2xl border border-white/10 flex flex-col manga-detail-card"
          onClick={(e) => e.stopPropagation()}
        >

          {/* HEADER */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">

            <h2 className="text-xl font-bold text-white">Wishlist</h2>

            <div className="flex gap-2">

              <button
                onClick={() => setOpenAdd(true)}
                className="px-4 py-2 bg-yellow-400 text-black rounded-lg font-semibold hover:scale-105 transition"
              >
                + Aggiungi
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
              >
                Chiudi
              </button>

            </div>
          </div>

          {/* CONTENT */}
          <div className="p-6 overflow-y-auto flex-1">

            {items.length === 0 ? (
              <div className="text-center text-zinc-400 mt-20">
                <p className="text-lg font-semibold">Wishlist vuota</p>
                <p className="text-sm opacity-60">
                  Aggiungi il tuo primo manga ✨
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-4">

                {items.map((m) => (
                  <div
                    key={m.id}
                    className="bg-[#1a1a1a]/70 backdrop-blur-sm rounded-xl overflow-hidden border border-white/5 hover:scale-[1.04] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition"
                  >
                    {/* COVER */}
                    <div className="h-[220px] overflow-hidden bg-black">
                      <img
                        src={m.coverurl || "https://placehold.co/200x300"}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* INFO */}
                    <div className="p-3">
                      <p className="text-sm font-semibold text-white truncate">
                        {m.titolo}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">
                        {m.autori || "Autore sconosciuto"}
                      </p>
                    </div>

                  </div>
                ))}

              </div>
            )}
          </div>

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
