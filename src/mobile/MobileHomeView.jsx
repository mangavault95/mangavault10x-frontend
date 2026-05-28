import { useState, useMemo } from "react";
import MobileDrawer from "./MobileDrawer";
import MobileReadingPlayer from "./MobileReadingPlayer";
import MobileMangaGrid from "./MobileMangaGrid";

/* ICON */
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export default function MobileHomeView({
  manga = [],
  filteredManga = [],
  filter,
  setFilter
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  /* FILTRI (completi) */
  const filters = [
    { key: "all", label: "Tutti" },
    { key: "ongoing", label: "In corso" },
    { key: "to_complete", label: "Da completare" },
    { key: "completed", label: "Completati" },
    { key: "short", label: "Serie brevi" },
    { key: "oneshot", label: "One-shot" }
  ];

  /* SEARCH */
  const searchResults = useMemo(() => {
    const q = searchValue.toLowerCase();
    return filteredManga.filter((m) => {
      if (!q) return true;
      return (
        m.Titolo?.toLowerCase().includes(q) ||
        m.Autore?.toLowerCase().includes(q)
      );
    });
  }, [searchValue, filteredManga]);

  return (
    <>
      <div className="min-h-screen pb-[100px]">

        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0b0b0f]">

          <button
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"
          >
            ☰
          </button>

          <div className="font-black text-white">
            MangaVault <span className="text-yellow-400">10X</span>
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"
          >
            <SearchIcon />
          </button>
        </div>

        {/* TITLE */}
        <div className="px-4 pt-4">
          <h1 className="text-lg font-bold text-white">
            La Mia Collezione
          </h1>

          {/* FILTRI PREMIUM */}
          <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`
                  px-4 py-2 rounded-xl text-[12px] font-medium border
                  backdrop-blur-md transition-all
                  ${
                    filter === f.key
                      ? "bg-yellow-400 text-black border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)]"
                      : "bg-white/[0.05] text-zinc-300 border-white/10 hover:border-yellow-400/30"
                  }
                `}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* GRID */}
        <div className="px-3 mt-3">
          <MobileMangaGrid
            searchResults={filteredManga}
            filter={filter}
          />
        </div>

        {drawerOpen && (
          <MobileDrawer
            onClose={() => setDrawerOpen(false)}
            manga={manga}
          />
        )}

        <MobileReadingPlayer />
      </div>

      {/* ✅ SEARCH OVERLAY FIXATO + GRID */}
      {searchOpen && (
        <div className="fixed inset-0 z-[2000] bg-[#0b0b0f] flex flex-col">

          {/* HEADER */}
          <div className="flex gap-3 p-4 border-b border-white/10">

            <button
              onClick={() => setSearchOpen(false)}
              className="text-white"
            >
              ←
            </button>

            <input
              autoFocus
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Cerca manga..."
              className="flex-1 bg-white/5 px-3 py-2 rounded-lg text-sm"
            />
          </div>

          {/* GRID RISULTATI */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3">

            {searchResults.map((m) => (
              <button
                key={m.ID}
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("openMangaDetail", { detail: m })
                  );
                  setSearchOpen(false);
                }}
                className="bg-white/5 rounded-xl p-2 border border-white/10"
              >
                <img
                  src={m.CoverURL}
                  className="w-full h-[120px] object-contain"
                />

                <div className="text-[11px] font-semibold mt-1 line-clamp-2">
                  {m.Titolo}
                </div>
              </button>
            ))}

          </div>
        </div>
      )}
    </>
  );
}
