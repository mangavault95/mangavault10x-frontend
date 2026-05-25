import { useEffect, useMemo, useState } from "react";
import StatsPanel from "./StatsPanel";

export default function Sidebar({ open = true }) {
  const [manga, setManga] = useState([]);
  const [favorites, setFavorites] = useState(
    JSON.parse(localStorage.getItem("mv_favorites") || "[]")
  );

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((r) => r.json())
      .then((d) => setManga(Array.isArray(d) ? d : []))
      .catch(() => setManga([]));
  }, []);

  // stats utili
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
    // dispatch per aggiornare altre parti dell'app
    window.dispatchEvent(new CustomEvent("favoritesUpdated", { detail: { favorites: updated } }));
  };

  const navigate = (page) => {
    window.dispatchEvent(new CustomEvent("navigate", { detail: { page } }));
  };

  return (
    <div className={`
      h-full flex flex-col p-4 gap-4
      bg-gradient-to-b from-[#070707] via-[#0f0f10] to-[#070707]
      border-r border-white/6
      transition-all duration-300
      ${open ? "w-full" : "w-20 items-center"}
    `}>

      {/* LOGO */}
      <div className={`flex items-center gap-3 ${open ? "" : "flex-col"}`}>
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-[0_0_14px_rgba(250,204,21,0.6)]" />
        {open && <div className="text-lg font-black tracking-tight text-white">MangaVault <span className="text-yellow-400">10X</span></div>}
      </div>

      {/* MENU PRINCIPALE */}
      <nav className={`flex flex-col gap-2 ${open ? "" : "items-center"}`}>

        <button
          onClick={() => navigate("favorites")}
          title="Preferiti (5 stelle)"
          className={`flex items-center gap-3 w-full ${open ? "px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10" : "p-2 rounded-md"}`}
        >
          <span className="text-2xl">⭐</span>
          {open && (
            <div className="flex-1 text-sm text-white flex justify-between items-center">
              <span>Preferiti</span>
              <span className="text-zinc-400 text-xs">{favoritesList.length}</span>
            </div>
          )}
        </button>

        <button
          onClick={() => navigate("records")}
          title="Records"
          className={`flex items-center gap-3 w-full ${open ? "px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10" : "p-2 rounded-md"}`}
        >
          <span className="text-2xl">📜</span>
          {open && <span className="text-sm text-white">Records</span>}
        </button>

        <button
          onClick={() => navigate("progress")}
          title="Progressi"
          className={`flex items-center gap-3 w-full ${open ? "px-3 py-2 rounded-lg bg-yellow-500/5 hover:bg-yellow-500/10" : "p-2 rounded-md"}`}
        >
          <span className="text-2xl">📈</span>
          {open && <span className="text-sm text-white">Progressi</span>}
        </button>

        <button
          onClick={() => navigate("history")}
          title="Ultime letture"
          className={`flex items-center gap-3 w-full ${open ? "px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10" : "p-2 rounded-md"}`}
        >
          <span className="text-2xl">🕒</span>
          {open && <span className="text-sm text-white">Ultime letture</span>}
        </button>

        <button
          onClick={() => navigate("wishlist")}
          title="Wishlist"
          className={`flex items-center gap-3 w-full ${open ? "px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10" : "p-2 rounded-md"}`}
        >
          <span className="text-2xl">📅</span>
          {open && <span className="text-sm text-white">Wishlist</span>}
        </button>

      </nav>

      {/* separatore sottile */}
      {open && <div className="h-px w-full bg-zinc-800 my-2" />}

      {/* AZIONI RAPIDE */}
      <div className={`flex ${open ? "flex-col gap-2" : "flex-col gap-3 items-center"}`}>
        <button
          onClick={() => window.dispatchEvent(new Event("openAddManga"))}
          title="Aggiungi manga"
          className={`${open ? "flex items-center gap-3 px-3 py-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20" : "p-2 rounded-md"}`}
        >
          <span className="text-2xl">➕</span>
          {open && <span className="text-sm text-yellow-300">Aggiungi</span>}
        </button>

        <button
          onClick={() => window.dispatchEvent(new Event("openCollection"))}
          title="Vai alla collezione"
          className={`${open ? "flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10" : "p-2 rounded-md"}`}
        >
          <span className="text-2xl">📚</span>
          {open && <span className="text-sm">Collezione</span>}
        </button>
      </div>

      {/* ULTIMI AGGIUNTI — stile più curato */}
      {open && (
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-400 mb-3">Ultimi aggiunti</p>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {manga
              .slice()
              .sort((a, b) => new Date(b.DataAggiunta) - new Date(a.DataAggiunta))
              .slice(0, 6)
              .map(m => (
                <div
                  key={m.ID}
                  onClick={() => window.dispatchEvent(new CustomEvent("openMangaDetail", { detail: m }))}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer bg-gradient-to-r from-[#0f0f0f] to-[#121212] border border-white/6 hover:scale-[1.01] transition-transform"
                >
                  <img src={m.CoverURL || "https://placehold.co/60x90"} className="w-10 h-14 rounded-md object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm truncate text-white">{m.Titolo}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(m.ID); }}
                        className="text-yellow-400 ml-2"
                        title={favorites.includes(m.ID) ? "Rimuovi preferito" : "Aggiungi ai preferiti"}
                      >
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

      {/* STATS */}
      {open && <div className="mt-auto"><StatsPanel /></div>}
    </div>
  );
}
