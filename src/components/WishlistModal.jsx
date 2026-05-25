import { useEffect, useState } from "react";

export default function WishlistModal({ onClose }) {
  const [wishlist, setWishlist] = useState([]);
  const [mangaList, setMangaList] = useState([]);

  useEffect(() => {
    const w = JSON.parse(localStorage.getItem("mv_wishlist") || "[]");
    setWishlist(w);
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then(r => r.json())
      .then(d => setMangaList(Array.isArray(d) ? d : []))
      .catch(() => setMangaList([]));
  }, []);

  const wishManga = mangaList.filter(m => wishlist.includes(m.ID));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-96 bg-[#0f0f10] p-4 rounded-xl border border-white/10">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Wishlist</h3>
          <button onClick={onClose} className="text-sm text-zinc-400">Chiudi</button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {wishManga.length === 0 && <div className="text-zinc-500">Wishlist vuota</div>}
          {wishManga.map(m => (
            <div key={m.ID} className="flex items-center gap-3 p-2 rounded-md bg-white/5">
              <img src={m.CoverURL || "https://placehold.co/60x90"} className="w-10 h-14 rounded-md object-cover" />
              <div className="flex-1">
                <div className="text-sm font-semibold">{m.Titolo}</div>
                <div className="text-xs text-zinc-500">{m.Autore}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
