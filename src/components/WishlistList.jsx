import { useEffect, useState } from "react";
import WishlistModal from "./WishlistModal";
import Toast from "./Toast";

export default function WishlistList() {
  const [items, setItems] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [toast, setToast] = useState({ show: false, text: "", tone: "success" });

  useEffect(() => {
    const localItems = JSON.parse(localStorage.getItem("mv_wishlist_custom") || "[]");
    setItems(localItems);
  }, []);

  // refresh dopo salvataggio
  const handleSaved = (item) => {
    setItems(prev => [item, ...prev]);
    setToast({ show: true, text: "Salvataggio riuscito", tone: "success" });
    setTimeout(() => setToast({ show: false, text: "", tone: "success" }), 2500);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-white">Wishlist</h2>
        <button
          onClick={() => setOpenAdd(true)}
          className="flex items-center gap-2 px-3 py-2 rounded bg-yellow-400 text-black font-semibold hover:brightness-95"
          aria-label="Aggiungi manga"
        >
          <span className="text-lg">+</span> Aggiungi
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.length === 0 ? (
          <div className="col-span-full text-zinc-400">Wishlist vuota</div>
        ) : items.map(it => (
          <div key={it.id || it.ID} className="relative rounded-xl overflow-hidden bg-gradient-to-b from-[#0f0f10] to-[#0b0b0c] border border-white/6 shadow-md">
            <div className="relative">
              <img src={it.coverurl || it.CoverURL || "https://placehold.co/300x450"} alt={it.titolo || it.Titolo} className="w-full h-56 object-cover" />
              {/* small offset bar on the left like MangaDetail */}
              <div className="absolute left-0 top-0 h-full w-3 bg-gradient-to-b from-black/0 to-white/6 transform -translate-x-1" />
            </div>

            <div className="p-3">
              <div className="text-sm font-semibold text-white truncate" title={it.titolo || it.Titolo}>{it.titolo || it.Titolo}</div>
              <div className="text-xs text-zinc-400 truncate" title={it.autori || it.Autore}>{it.autori || it.Autore || ""}</div>
            </div>
          </div>
        ))}
      </div>

      {openAdd && <WishlistModal onClose={() => setOpenAdd(false)} onSaved={handleSaved} />}

      <Toast {...toast} />
    </div>
  );
}
