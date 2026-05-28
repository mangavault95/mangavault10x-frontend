import { useEffect, useState } from "react";
import MobilePanel from "./MobilePanel";

export default function MobileWishlistPanel({ onClose }) {
  const API = import.meta.env.VITE_API_URL;

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function loadWishlist() {
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/wishlist/all`);
      const data = await res.json();

      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Errore caricamento wishlist mobile:", err);
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWishlist();
  }, []);

  function mapToManga(item) {
    return {
      ID: item.id,
      Titolo: item.titolo || "Senza titolo",
      Autore: item.autori || "Autore sconosciuto",
      CoverURL: item.coverurl || "",
      Trama: item.trama || "",
      Genere: item.generi || "",
      VolumiTotali: item.volumitotali ?? null,
      DoveComprare: item.dovecomprare || "",
      Valutazione: 0,
      VolumiPosseduti: 0,
      Costo: 0,
      Editore: ""
    };
  }

  function openDetail(item) {
    window.dispatchEvent(
      new CustomEvent("openMangaDetail", {
        detail: mapToManga(item)
      })
    );
  }

  async function removeItem(id) {
    if (!id) return;

    setBusyId(id);

    try {
      await fetch(`${API}/api/wishlist/${id}`, {
        method: "DELETE"
      });

      await loadWishlist();
    } catch (err) {
      console.error("Errore rimozione wishlist:", err);
    } finally {
      setBusyId(null);
    }
  }

  async function purchaseItem(id) {
    if (!id) return;

    setBusyId(id);

    try {
      await fetch(`${API}/api/wishlist-actions/purchase/${id}`, {
        method: "POST"
      });

      await loadWishlist();
      window.dispatchEvent(new Event("favoritesUpdated"));
      window.dispatchEvent(new Event("currentReadingUpdated"));
    } catch (err) {
      console.error("Errore spostamento wishlist in collezione:", err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <MobilePanel title="Wishlist" onClose={onClose}>
      {loading && (
        <div className="text-center text-zinc-400 py-10">
          Caricamento wishlist...
        </div>
      )}

      {!loading && list.length === 0 && (
        <div className="text-center text-zinc-400 py-10">
          Nessun manga in wishlist
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="space-y-3">
          {list.map((item) => {
            const manga = mapToManga(item);
            const disabled = busyId === item.id;

            return (
              <div
                key={item.id}
                className="
                  bg-white/[0.05]
                  border border-white/10
                  rounded-2xl
                  p-3
                "
              >
                <button
                  type="button"
                  onClick={() => openDetail(item)}
                  className="
                    w-full flex gap-3 text-left
                    active:scale-[0.98]
                    transition-all duration-200
                  "
                >
                  <div className="w-14 h-20 shrink-0 rounded-xl overflow-hidden bg-black/25 border border-white/10">
                    {manga.CoverURL ? (
                      <img
                        src={manga.CoverURL}
                        alt={manga.Titolo || "Cover manga"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                        No img
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white line-clamp-2">
                      {manga.Titolo}
                    </div>

                    <div className="text-xs text-zinc-400 truncate mt-1">
                      {manga.Autore}
                    </div>

                    {manga.Genere && (
                      <div className="text-[10px] text-zinc-500 truncate mt-1">
                        {manga.Genere}
                      </div>
                    )}

                    <div className="mt-2 text-[10px] text-zinc-500">
                      Volumi: {manga.VolumiTotali || "?"}
                    </div>
                  </div>
                </button>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => purchaseItem(item.id)}
                    className="
                      px-3 py-2 rounded-xl
                      bg-yellow-400 text-black
                      text-xs font-semibold
                      disabled:opacity-50
                      active:scale-[0.98]
                      transition
                    "
                  >
                    {disabled ? "..." : "Aggiungi"}
                  </button>

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeItem(item.id)}
                    className="
                      px-3 py-2 rounded-xl
                      bg-white/[0.06]
                      border border-white/10
                      text-xs text-zinc-300
                      disabled:opacity-50
                      active:scale-[0.98]
                      transition
                    "
                  >
                    Rimuovi
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MobilePanel>
  );
}
