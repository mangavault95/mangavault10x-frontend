import { useEffect, useState } from "react";
import MobilePanel from "./MobilePanel";

export default function MobileWishlistPanel({ onClose }) {
  const API = import.meta.env.VITE_API_URL;

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // ✅ 1. wishlist ids
        const wRes = await fetch(`${API}/api/wishlist_custom`);
        const wishlist = await wRes.json();

        // ✅ 2. tutti i manga
        const mRes = await fetch(`${API}/api/manga`);
        const manga = await mRes.json();

        if (!Array.isArray(wishlist) || !Array.isArray(manga)) {
          setList([]);
          return;
        }

        // ✅ 3. merge (COME DESKTOP)
        const merged = wishlist
          .map((w) => {
            const found = manga.find(
              (m) => m.ID === w.manga_id
            );

            return found || null;
          })
          .filter(Boolean);

        setList(merged);

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
          {list.map((m) => (
            <button
              key={m.ID}
              onClick={() => open(m)}
              className="flex gap-3 w-full bg-white/5 p-3 rounded-xl text-left active:scale-95 transition"
            >
              <img
                src={m.CoverURL}
                className="w-12 h-16 object-cover rounded-md"
              />

              <div>
                <div className="text-sm font-semibold">
                  {m.Titolo}
                </div>

                <div className="text-xs text-zinc-400">
                  {m.Autore}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

    </MobilePanel>
  );
}
