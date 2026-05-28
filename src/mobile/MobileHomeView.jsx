import { useState, useMemo } from "react";
import MobileDrawer from "./MobileDrawer";
import MobileReadingPlayer from "./MobileReadingPlayer";
import MobileMangaGrid from "./MobileMangaGrid";

/* ICONS */
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 17V7M7 7l-3 3M7 7l3 3" />
      <path d="M17 7v10M17 17l3-3M17 17l-3-3" />
    </svg>
  );
}

/* COMPONENT */
export default function MobileHomeView({
  manga = [],
  filteredManga = [],
  filter,
  setFilter
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [sortKey, setSortKey] = useState("title");
  const [sortDir, setSortDir] = useState("asc"); // ✅ asc / desc

  const [searchValue, setSearchValue] = useState("");

  /* -------------------- FILTERS -------------------- */

  const filters = [
    { key: "all", label: "Tutti" },
    { key: "ongoing", label: "In corso" },
    { key: "to_complete", label: "Da completare" },
    { key: "completed", label: "Completati" },
    { key: "short", label: "Serie brevi" },
    { key: "oneshot", label: "One-shot" }
  ];

  /* -------------------- SORT LABEL -------------------- */

  function nextSort() {
    const order = ["title", "author", "volumes"];
    const idx = order.indexOf(sortKey);
    setSortKey(order[(idx + 1) % order.length]);
  }

  function toggleDir() {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }

  /* -------------------- SEARCH LIST -------------------- */

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

  /* -------------------- UI -------------------- */

  return (
    <>
      <div className="min-h-screen pb-[90px]">

        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0b0b0f]">

          <button onClick={() => setDrawerOpen(true)} className="iconBtn">
            ☰
          </button>

          <div className="font-black text-white">
            MangaVault <span className="text-yellow-400">10X</span>
          </div>

          <button onClick={() => setSearchOpen(true)} className="iconBtn">
            <SearchIcon />
          </button>
        </div>

        {/* TITLE */}
        <div className="px-4 pt-4">

          <h1 className="text-lg font-bold">La Mia Collezione</h1>

          {/* FILTERS PREMIUM */}
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`
                  px-4 py-2 rounded-xl text-xs font-medium
                  border backdrop-blur-md transition-all
                  ${
                    filter === f.key
                      ? "bg-yellow-400 text-black border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.35)]"
                      : "bg-white/[0.05] border-white/10 text-zinc-300 hover:border-yellow-400/40"
                  }
                `}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* SORT CONTROL */}
          <div className="flex items-center gap-3 mt-3">

            <button
              onClick={nextSort}
              className="btnSmall"
            >
              {sortKey}
            </button>

            <button
              onClick={toggleDir}
              className="btnSmall flex items-center gap-1"
            >
              <SortIcon />
              {sortDir}
            </button>
          </div>
        </div>

        {/* GRID */}
        <div className="px-3 mt-3">
          <MobileMangaGrid
            searchResults={filteredManga}
            filter={filter}
            sortKey={sortKey}
            sortDir={sortDir}
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

      {/* ✅ SEARCH OVERLAY FIXATO */}
      {searchOpen && (
        <div className="fixed inset-0 z-[2000] bg-[#0b0b0f] flex flex-col">

          <div className="flex gap-3 p-4 border-b border-white/10">

            <button onClick={() => setSearchOpen(false)}>←</button>

            <input
              autoFocus
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Cerca manga..."
              className="flex-1 bg-white/5 px-3 py-2 rounded-lg"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {searchResults.map((m) => (
              <button
                key={m.ID}
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("openMangaDetail", { detail: m })
                  );
                  setSearchOpen(false);
                }}
                className="flex gap-3 bg-white/5 p-3 rounded-xl"
              >
                <img src={m.CoverURL} className="w-10 h-14 object-cover" />

                <div>
                  <div className="text-sm font-semibold">{m.Titolo}</div>
                  <div className="text-xs text-zinc-400">{m.Autore}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
