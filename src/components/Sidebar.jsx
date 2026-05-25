import { useEffect, useMemo, useState } from "react";
import StatsPanel from "./StatsPanel";

export default function Sidebar({ open }) {
  const [manga, setManga] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = JSON.parse(localStorage.getItem("mv_selected_manga"));
  const currentVol = localStorage.getItem("mv_current_vol") || "";

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then(r => r.json())
      .then(d => setManga(Array.isArray(d) ? d : []));
  }, []);

  const latest = useMemo(() => {
    return [...manga]
      .sort((a, b) => new Date(b.DataAggiunta) - new Date(a.DataAggiunta))
      .slice(0, 3);
  }, [manga]);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    return manga.filter(m =>
      m.Titolo.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, manga]);

  return (
    <div className="
      h-full flex flex-col
      bg-gradient-to-b from-[#0b0b0f] via-[#111] to-[#0b0b0f]
      border-r border-white/10
      p-4
      transition-all duration-300
    ">

      {/* LOGO */}
      <div className="flex items-center gap-3 mb-6">
        <div className="
          w-6 h-6 rounded-md
          bg-gradient-to-br from-yellow-400 to-yellow-600
          shadow-[0_0_12px_rgba(250,204,21,0.6)]
        " />
        {open && (
          <span className="text-xl font-black tracking-tight">
            MangaVault<span className="text-yellow-400 ml-1">10X</span>
          </span>
        )}
      </div>

      {/* QUICK ICONS */}
      <div className="flex flex-col gap-3 mb-6">

        {/* SEARCH BUTTON */}
        <button
          onClick={() => setSearchOpen(true)}
          className="
            flex items-center gap-3
            bg-white/10 border border-white/10
            px-3 py-2 rounded-lg text-white
            hover:bg-white/20 transition
          "
        >
          🔍 {open && "Cerca"}
        </button>

        {/* ADD */}
        <button
          onClick={() => window.dispatchEvent(new Event("openAddManga"))}
          className="
            flex items-center gap-3
            bg-yellow-500/20 border border-yellow-500/40
            px-3 py-2 rounded-lg text-yellow-300
            hover:bg-yellow-500/30 transition
          "
        >
          ➕ {open && "Aggiungi"}
        </button>

        {/* COLLECTION */}
        <button
          onClick={() => window.dispatchEvent(new Event("openCollection"))}
          className="
            flex items-center gap-3
            bg-white/10 border border-white/20
            px-3 py-2 rounded-lg text-white
            hover:bg-white/20 transition
          "
        >
          📚 {open && "Collezione"}
        </button>

      </div>

      {/* CURRENT READING */}
      {open && selected && (
        <div className="
          p-4 rounded-2xl mb-6
          bg-gradient-to-br from-[#1a1a1a] to-[#121212]
          border border-white/10
          shadow-[0_10px_25px_rgba(0,0,0,0.6)]
        ">
          <div className="flex gap-3">
            <img
              src={selected.CoverURL}
              className="w-14 h-20 object-cover rounded-lg shadow-md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-zinc-400">Stai leggendo</p>
              <p className="text-sm font-semibold truncate text-white">
                {selected.Titolo}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Vol {currentVol} / {selected.VolumiTotali}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LATEST */}
      {open && (
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
            Ultimi aggiunti
          </p>

          <div className="space-y-2">
            {latest.map(m => (
              <div
                key={m.ID}
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("openMangaDetail", { detail: m })
                  )
                }
                className="
                  flex items-center gap-3
                  p-3 rounded-xl cursor-pointer
                  bg-[#151515]
                  border border-white/5
                  hover:bg-[#1c1c1c]
                  hover:border-yellow-400/30
                  transition
                "
              >
                <img
                  src={m.CoverURL}
                  className="w-10 h-14 rounded-md object-cover"
                />
                <span className="text-sm truncate">{m.Titolo}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATS */}
      {open && (
        <div className="mt-auto">
          <StatsPanel />
        </div>
      )}

      {/* SEARCH DRAWER */}
      {searchOpen && (
        <div className="
          fixed inset-0 bg-black/70 backdrop-blur-md z-50
          flex items-center justify-center
        ">
          <div className="bg-[#111] p-6 rounded-xl w-80 border border-white/10">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca manga..."
              className="
                w-full px-3 py-2 rounded-lg
                bg-black/30 border border-white/10
                text-sm text-white placeholder-zinc-500
                focus:outline-none focus:border-yellow-400/40
              "
            />

            <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
              {filtered.map(m => (
                <div
                  key={m.ID}
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("openMangaDetail", { detail: m })
                    );
                    setSearchOpen(false);
                  }}
                  className="
                    p-2 rounded-lg bg-white/10 border border-white/10
                    hover:bg-white/20 transition cursor-pointer
                  "
                >
                  {m.Titolo}
                </div>
              ))}
            </div>

            <button
              onClick={() => setSearchOpen(false)}
              className="mt-4 w-full py-2 bg-white/10 rounded-lg text-white"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
