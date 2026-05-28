import { useState, useEffect } from "react";
import MobilePanel from "./MobilePanel";

export default function MobileWishlistPanel({ onClose }) {
  const API = import.meta.env.VITE_API_URL;
  const [list, setList] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/wishlist`)
      .then(r => r.json())
      .then(data => {
        // ✅ FIX: se arriva struttura diversa
        if (Array.isArray(data)) {
          setList(data);
        } else if (data.wishlist) {
          setList(data.wishlist);
        } else {
          setList([]);
        }
      })
      .catch(() => setList([]));
  }, []);

  return (
    <MobilePanel title="Wishlist" onClose={onClose}>

      {list.length === 0 && (
        <div className="text-center text-zinc-400">
          Nessun manga in wishlist
        </div>
      )}

      <div className="space-y-3">
        {list.map((m) => (
          <div
            key={m.ID}
            className="flex gap-3 bg-white/5 p-3 rounded-xl"
          >
            <img
              src={m.CoverURL}
              className="w-12 h-16 object-cover"
            />
            <div>
              <div className="text-sm font-semibold">
                {m.Titolo}
              </div>
              <div className="text-xs text-zinc-400">
                {m.Autore}
              </div>
            </div>
          </div>
        ))}
      </div>

    </MobilePanel>
  );
}
