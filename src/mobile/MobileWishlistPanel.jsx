import { useEffect, useState } from "react";
import MobilePanel from "./MobilePanel";

export default function MobileWishlistPanel({ onClose }) {
  const API = import.meta.env.VITE_API_URL;
  const [list, setList] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/wishlist`)
      .then(r => r.json())
      .then(setList);
  }, []);

  return (
    <MobilePanel title="Wishlist" onClose={onClose}>
      <div className="space-y-3">
        {list.map((m) => (
          <div
            key={m.ID}
            className="flex gap-3 bg-white/5 p-3 rounded-xl"
          >
            <img src={m.CoverURL} className="w-12 h-16 object-cover" />
            <div>
              <div className="text-sm font-semibold">{m.Titolo}</div>
              <div className="text-xs text-zinc-400">{m.Autore}</div>
            </div>
          </div>
        ))}
      </div>
    </MobilePanel>
  );
}
