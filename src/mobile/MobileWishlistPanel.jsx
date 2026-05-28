import { useEffect, useState } from "react";
import MobilePanel from "./MobilePanel";

export default function MobileWishlistPanel({ onClose }) {
  const API = import.meta.env.VITE_API_URL;

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/api/wishlist_custom`);
        const data = await res.json();

        if (Array.isArray(data)) {
          setList(data);
        } else {
          setList([]);
        }
      } catch (err) {
        console.error("Errore wishlist:", err);
        setList([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function open(m) {
    window.dispatchEvent(
      new CustomEvent("openMangaDetail", {
        detail: m
      })
    );
  }

  return (
    <MobilePanel title="Wishlist" onClose={onClose}>

      {/* LOADING */}
      {loading && (
        <div className="text-center text-zinc-400">
          Caricamento...
        </div>
      )}

      {/* EMPTY */}
      {!loading && list.length === 0 && (
        <div className="text-center text-zinc-400">
          Nessun manga in wishlist
        </div>
      )}

      {/* LIST */}
      {!loading && list.length > 0 && (
        <div className="space-y-3">
          {list.map((m, i) => (
            <button
              key={`${m.ID || m.id || i}`}
              onClick={() => open(m)}
              className="flex gap-3 w-full bg-white/5 p-3 rounded-xl text-left active:scale-95 transition"
            >
              {/* ✅ COVER FIXATA */}
              {m.CoverURL ? (
                <img
                  src={m.CoverURL}
                  className="w-12 h-16 object-cover rounded-md"
                />
              ) : (
                <div className="w-12 h-16 bg-black/30 rounded-md flex items-center justify-center text-[10px] text-zinc-500">
                  No img
                </div>
              )}

              {/* INFO */}
              <div>
                <div className="text-sm font-semibold">
                  {m.Titolo || "Senza titolo"}
                </div>

                <div className="text-xs text-zinc-400">
                  {m.Autore || "Autore sconosciuto"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

    </MobilePanel>
  );
}
