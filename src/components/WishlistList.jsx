import { useEffect, useState } from "react";
import WishlistModal from "./WishlistModal";

/**
 * WishlistList.jsx
 * - mostra la griglia degli elementi in wishlist
 * - apre il modal solo con il pulsante "+"
 * - aggiorna la lista dopo salvataggio
 * - usa onGlobalToast se passato, altrimenti mostra toast interno
 */

export default function WishlistList({ onGlobalToast }) {
  const [items, setItems] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [localToast, setLocalToast] = useState({ show: false, text: "", tone: "success" });

  useEffect(() => {
    try {
      const localItems = JSON.parse(localStorage.getItem("mv_wishlist_custom") || "[]");
      setItems(Array.isArray(localItems) ? localItems : []);
    } catch {
      setItems([]);
    }
  }, []);

  const pushItem = (item) => {
    const normalized = {
      id: item.id || item.ID || item.titolo?.replace(/\s+/g, "_").toLowerCase() || `c_${Date.now()}`,
      titolo: item.titolo || item.Titolo || "",
      autori: item.autori || item.Autore || "",
      coverurl: item.coverurl || item.CoverURL || "",
      trama: item.trama || item.Trama || "",
      generi: item.generi || item.Genere || "",
      volumitotali: item.volumitotali ?? item.VolumiTotali ?? null,
      created_at: item.created_at || new Date().toISOString()
    };
    const next = [normalized, ...items];
    setItems(next);
    try { localStorage.setItem("mv_wishlist_custom", JSON.stringify(next)); } catch {}
  };

  const handleSaved = (item) => {
    pushItem(item);
    if (typeof onGlobalToast === "function") {
      onGlobalToast({ show: true, text: "Salvataggio riuscito", tone: "success" });
    } else {
      setLocalToast({ show: true, text: "Salvataggio riuscito", tone: "success" });
      setTimeout(() => setLocalToast({ show: false, text: "", tone: "success" }), 2500);
    }
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
          <span className="text-lg leading-none">+</span>
          <span className="hidden sm:inline">Aggiungi</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.length === 0 ? (
          <div className="col-span-full rounded-xl p-6 bg-gradient-to-b from-[#0f0f10] to-[#0b0b0c] border border-white/6 text-zinc-400">
            Wishlist vuota
          </div>
        ) : items.map(it => (
          <div
            key={it.id}
            className="relative rounded-xl overflow-hidden bg-gradient-to-b from-[#0f0f10] to-[#0b0b0c] border border-white/6 shadow-md hover:scale-[1.01] transition-transform"
          >
            <div className="relative">
              <img
                src={it.coverurl || "https://placehold.co/300x450"}
                alt={it.titolo || "Copertina"}
                className="w-full h-56 object-cover"
              />
              {/* subtle left offset bar */}
              <div className="absolute left-0 top-0 h-full w-3 bg-gradient-to-b from-black/0 to-white/6 transform -translate-x-1 pointer-events-none" />
            </div>

            <div className="p-3">
              <div className="text-sm font-semibold text-white truncate" title={it.titolo}>{it.titolo}</div>
              <div className="text-xs text-zinc-400 truncate" title={it.autori}>{it.autori || ""}</div>
            </div>
          </div>
        ))}
      </div>

      {openAdd && (
        <WishlistModal
          onClose={() => setOpenAdd(false)}
          onSaved={(item) => {
            handleSaved(item);
            setOpenAdd(false);
          }}
        />
      )}

      {/* fallback toast interno */}
      {localToast.show && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-xl text-lg font-semibold z-50 ${localToast.tone === "success" ? "bg-green-500 text-white" : "bg-red-600 text-white"}`}>
          {localToast.text}
        </div>
      )}
    </div>
  );
}
