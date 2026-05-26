import { useEffect, useMemo, useState } from "react";
import StatsPanel from "./StatsPanel";

export default function Sidebar({ open = true }) {
  const [manga, setManga] = useState([]);
  const [favorites, setFavorites] = useState(
    JSON.parse(localStorage.getItem("mv_favorites") || "[]")
  );
  const [pulseFav, setPulseFav] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((r) => r.json())
      .then((d) => setManga(Array.isArray(d) ? d : []))
      .catch(() => setManga([]));
  }, []);

  useEffect(() => {
    const handler = () => {
      setPulseFav(true);
      setTimeout(() => setPulseFav(false), 900);
    };
    window.addEventListener("favoriteAdded", handler);
    return () => window.removeEventListener("favoriteAdded", handler);
  }, []);

  const stats = useMemo(() => {
    let total = 0, completed = 0, ongoing = 0, spent = 0;
    manga.forEach(m => {
      const owned = Number(m.VolumiPosseduti) || 0;
      const tot = Number(m.VolumiTotali) || 0;
      const cost = Number(m.Costo) || 0;
      total += owned;
      spent += owned * cost;
      if (tot && owned >= tot) completed++;
      else ongoing++;
    });
    return { total, completed, ongoing, spent };
  }, [manga]);

  const upcomingCount = useMemo(() => {
    const now = Date.now();
    return manga.filter(m => {
      const d = m.DataUscita || m.ProssimaUscita || null;
      if (!d) return false;
      const t = Date.parse(d);
      return !isNaN(t) && t > now;
    }).length;
  }, [manga]);

  const favoritesList = useMemo(() => {
    return manga.filter(m => favorites.includes(m.ID) && (Number(m.Rating) || 0) >= 5);
  }, [manga, favorites]);

  const toggleFavorite = (id) => {
    const updated = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem("mv_favorites", JSON.stringify(updated));

    setManga(prev => prev.map(m => m.ID === id ? { ...m, Rating: 5 } : m));

    window.dispatchEvent(new CustomEvent("favoritesUpdated", { detail: { favorites: updated } }));
    window.dispatchEvent(new Event("favoriteAdded"));
  };

  const navigate = (page) => {
    window.dispatchEvent(new CustomEvent("navigate", { detail: { page } }));

    if (page === "favorites") window.dispatchEvent(new Event("openFavoritesModal"));
    if (page === "history") window.dispatchEvent(new Event("openHistoryModal"));

    // 🔥 FIX: Wishlist NON apre più il modal
    // if (page === "wishlist") window.dispatchEvent(new Event("openWishlistModal"));
  };

  const latest = useMemo(() => {
    return [...manga].sort((a,b) => new Date(b.DataAggiunta) - new Date(a.DataAggiunta)).slice(0,3);
  }, [manga]);

  const onLogoToggle = () => window.dispatchEvent(new Event("toggleSidebar"));

  return (
    <div className={`
      h-full flex flex-col p-4 gap-4
      bg-gradient-to-b from-[#070707] via-[#0f0f10] to-[#070707]
      transition-all duration-300
      ${open ? "w-full" : "w-28 items-center"}
    `}>

      <div className={`flex items-center gap-3 ${open ? "" : "flex-col"}`}>
        <div
          onClick={onLogoToggle}
          title={open ? "Chiudi sidebar" : "Apri sidebar"}
          className="w-9 h-9 rounded-md cursor-pointer bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-[0_0_14px_rgba(250,204,21,0.45)] flex items-center justify-center"
        />
        {open && <div className="text-lg font-black tracking-tight text-white select-none">MangaVault <span className="text-yellow-400">10X</span></div>}
      </div>

      <nav className={`flex flex-col gap-2 ${open ? "" : "items-center"}`}>
        <button
          onClick={() => navigate("favorites")}
          title="Preferiti"
          className={`flex items-center gap-3 w-full ${open ? "px-3 py-2 rounded-lg bg-white/4 hover:bg-white/6" : "p-2 rounded-md"}`}
        >
          <span className={`text-2xl ${pulseFav ? "scale-110 animate-pulse" : ""}`}>⭐</span>
          {open && <div className="flex-1 text-sm text-white flex justify-between items-center"><span>Preferiti</span><span className="text-zinc-400 text-xs">{favoritesList.length}</span></div>}
        </button>

        <button
          onClick={() => navigate("history")}
          title="Ultime letture"
          className={`flex items-center gap-3 w-full ${open ? "px-3 py-2 rounded-lg bg-white/4 hover:bg-white/6" : "p-2 rounded-md"}`}
        >
          <span className="text-2xl">🕒</span>
          {open && <span className="text-sm text-white">Ultime letture</span>}
        </button>

        <button
          onClick={() => navigate("wishlist")}
          title="Wishlist"
          className={`flex items-center gap-3 w-full ${open ? "px-3 py-2 rounded-lg bg-white/4 hover:bg-white/6" : "p-2 rounded-md"}`}
        >
          <span className="text-2xl">📅</span>
          {open && <span className="text-sm text-white">Wishlist</span>}
        </button>
      </nav>

      {open && <div className="my-2" />}

      {open && (() => {
        const selected = JSON.parse(localStorage.getItem("mv_selected_manga"));
        const currentVol = localStorage.getItem("mv_current_vol") || "";
        if (!selected) return null;
        return (
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#121212] to-[#0f0f0f] shadow-sm">
            <div className="flex gap-3">
              <img src={selected.CoverURL || "https://placehold.co/80x120"} className="w-14 h-20 object-cover rounded-lg" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-zinc-400">Stai leggendo</p>
                <p className="text-sm font-semibold truncate text-white">{selected.Titolo}</p>
                <p className="text-xs text-zinc-500 mt-1">Vol {currentVol} / {selected.VolumiTotali || "?"}</p>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button onClick={() => window.dispatchEvent(new CustomEvent("openMangaDetail", { detail: selected }))} className="flex-1 py-2 rounded-md bg-white/5 text-sm text-white">Vai al dettaglio</button>
              <button onClick={() => window.dispatchEvent(new CustomEvent("quickUpdateVolume", { detail: selected }))} className="py-2 px-3 rounded-md bg-yellow-500/20 text-yellow-300 text-sm">Aggiorna</button>
            </div>
          </div>
        );
      })()}

      {open && (
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-400 mb-3">Ultimi aggiunti</p>
          <div className="space-y-2">
            {latest.map(m => (
              <div key={m.ID} onClick={() => window.dispatchEvent(new CustomEvent("openMangaDetail", { detail: m }))} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer bg-gradient-to-r from-[#0f0f0f] to-[#121212] hover:scale-[1.01] transition-transform">
                <img src={m.CoverURL || "https://placehold.co/60x90"} className="w-10 h-14 rounded-md object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm truncate text-white">{m.Titolo}</span>
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(m.ID); }} className="text-yellow-400 ml-2" title={favorites.includes(m.ID) ? "Rimuovi preferito" : "Aggiungi ai preferiti"}>
                      {favorites.includes(m.ID) ? "★" : "☆"}
                    </button>
                  </div>
                  <div className="text-xs text-zinc-500">{m.Autore}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {open && <div className="mt-auto"><StatsPanel /></div>}
    </div>
  );
}
