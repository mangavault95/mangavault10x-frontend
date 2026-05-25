import { useEffect, useMemo, useState } from "react";
import StatsPanel from "./StatsPanel";

export default function Sidebar({ open = true }) {
  const [manga, setManga] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(JSON.parse(localStorage.getItem("mv_favorites") || "[]"));

  const selected = JSON.parse(localStorage.getItem("mv_selected_manga"));
  const currentVol = localStorage.getItem("mv_current_vol") || "";

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((res) => res.json())
      .then((data) => setManga(Array.isArray(data) ? data : []))
      .catch(() => setManga([]));
  }, []);

  const latest = useMemo(() => {
    return [...manga].sort((a, b) => new Date(b.DataAggiunta) - new Date(a.DataAggiunta)).slice(0, 3);
  }, [manga]);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    return manga.filter(m => (m.Titolo || "").toLowerCase().includes(search.toLowerCase()));
  }, [search, manga]);

  const toggleFavorite = (id) => {
    let updated = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem("mv_favorites", JSON.stringify(updated));
  };

  return (
    <div className={`h-full flex flex-col p-4 gap-5 ${open ? "w-full" : "w-16 items-center"} transition-all`}>

      {/* LOGO */}
      <div className={`flex items-center gap-3 ${open ? "" : "flex-col"}`}>
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-[0_0_12px_rgba(250,204,21,0.6)]" />
        {open && <div className="text-xl font-black tracking-tight">MangaVault<span className="text-yellow-400 ml-1">10X</span></div>}
      </div>

      {/* QUICK ACTIONS */}
      <div className={`flex ${open ? "flex-col gap-2" : "flex-col gap-3 items-center"}`}>
        <button onClick={() => setSearchOpen(true)} title="Cerca" className={`flex items-center ${open ? "gap-3 px-3 py-2 rounded-lg bg-white/5" : "p-2 rounded-md"}`}>
          <span className="text-lg">🔍</span>
          {open && <span className="text-sm">Cerca</span>}
        </button>

        <button onClick={() => window.dispatchEvent(new Event("openAddManga"))} title="Aggiungi" className={`flex items-center ${open ? "gap-3 px-3 py-2 rounded-lg bg-yellow-500/10" : "p-2 rounded-md"}`}>
          <span className="text-lg">➕</span>
          {open && <span className="text-sm text-yellow-300">Aggiungi</span>}
        </button>

        <button onClick={() => window.dispatchEvent(new Event("openCollection"))} title="Collezione" className={`flex items-center ${open ? "gap-3 px-3 py-2 rounded-lg bg-white/5" : "p-2 rounded-md"}`}>
          <span className="text-lg">📚</span>
          {open && <span className="text-sm">Collezione</span>}
        </button>
      </div>

      {/* CURRENT READING */}
      {open && selected && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#121212] border border-white/10 shadow-[0_10px_25px_rgba(0,0,0,0.6)]">
          <div className="flex gap-3">
            <img src={selected.CoverURL || "https://placehold.co/80x120"} className="w-14 h-20 object-cover rounded-lg shadow-md" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-zinc-400">Stai leggendo</p>
              <p className="text-sm font-semibold truncate text-white">{selected.Titolo}</p>
              <p className="text-xs text-zinc-500 mt-1">Vol {currentVol} / {selected.VolumiTotali || "?"}</p>
            </div>
          </div>

          <div className="mt-3 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400" style={{ width: `${Math.min(((Number(currentVol)||0) / (Number(selected.VolumiTotali)||1)) * 100, 100)}%` }} />
          </div>

          <div className="mt-3 flex gap-2">
            <button onClick={() => window.dispatchEvent(new CustomEvent("openMangaDetail", { detail: selected }))} className="flex-1 py-2 rounded-md bg-white/5 text-sm text-white">Vai al dettaglio</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent("quickUpdateVolume", { detail: selected }))} className="py-2 px-3 rounded-md bg-yellow-500/20 text-yellow-300 text-sm">Aggiorna</button>
          </div>
        </div>
      )}

      {/* ULTIMI AGGIUNTI */}
      {open && (
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Ultimi aggiunti</p>
          <div className="space-y-2">
            {latest.map(m => (
              <div key={m.ID} onClick={() => window.dispatchEvent(new CustomEvent("openMangaDetail", { detail: m }))} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer bg-[#151515] border border-white/5 hover:bg-[#1c1c1c] transition">
                <img src={m.CoverURL || "https://placehold.co/60x90"} className="w-10 h-14 rounded-md object-cover" />
                <span className="text-sm truncate">{m.Titolo}</span>
                <button onClick={(e) => { e.stopPropagation(); toggleFavorite(m.ID); }} className="ml-auto text-yellow-400">{favorites.includes(m.ID) ? "★" : "☆"}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATS */}
      {open && <div className="mt-auto"><StatsPanel /></div>}

      {/* SEARCH DRAWER */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="bg-[#111] p-5 rounded-xl w-80 border border-white/10">
            <div className="flex gap-2">
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca manga..." className="flex-1 px-3 py-2 rounded-md bg-black/30 border border-white/10 text-white" />
              <button onClick={() => { setSearchOpen(false); setSearch(""); }} className="px-3 py-2 rounded-md bg-white/5 text-white">Chiudi</button>
            </div>

            <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
              {filtered.length === 0 && <div className="text-zinc-500 text-sm">Nessun risultato</div>}
              {filtered.map(m => (
                <div key={m.ID} onClick={() => { window.dispatchEvent(new CustomEvent("openMangaDetail", { detail: m })); setSearchOpen(false); }} className="p-2 rounded-md bg-white/5 hover:bg-white/10 cursor-pointer">
                  {m.Titolo}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
