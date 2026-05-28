import { useEffect, useState } from "react";
import MobilePanel from "./MobilePanel";

export default function MobileWishlistPanel({ onClose }) {
  const API = import.meta.env.VITE_API_URL;
  const [list, setList] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/wishlist`)
      .then(r => r.json())
      .then((data) => {
        if (Array.isArray(data)) setList(data);
        else if (data.wishlist) setList(data.wishlist);
        else setList([]);
      })
      .catch(() => setList([]));
  }, []);

  function open(m) {
    window.dispatchEvent(
      new CustomEvent("openMangaDetail", { detail: m })
    );
  }

  return (
    <MobilePanel title="Wishlist" onClose={onClose}>

      {list.length === 0 && (
        <div className="text-center text-zinc-400">
          Nessun manga
        </div>
      )}

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

    </MobilePanel>
  );
}
