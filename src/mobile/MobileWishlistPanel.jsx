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

        console.log("wishlist RAW:", data); // 👈 debug

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
    // ✅ adattiamo formato al detail
    const mapped = {
      ID: m.id,
      Titolo: m.titolo,
      Autore: m.autori,
      CoverURL: m.coverurl,
      Genere: m.generi,
      Trama: m.trama,
      VolumiTotali: m.volumitotali
    };

    window.dispatchEvent(
      new CustomEvent("openMangaDetail", {
        detail: mapped
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
              key={m.id}
              onClick={() => open(m)}
              className="flex gap-3 w-full bg-white/5 p-3 rounded-xl text-left active:scale-95 transition"
            >
              {/* ✅ COVER */}
              <img
                src={m.coverurl}
                className="w-12 h-16 object-cover rounded-md"
              />

              {/* INFO */}
              <div>
                <div className="text-sm font-semibold">
                  {m.titolo}
                </div>

                <div className="text-xs text-zinc-400">
                  {m.autori}
                </div>
              </div>
            </button>
          ))}

        </div>
      )}

    </MobilePanel>
  );
}
