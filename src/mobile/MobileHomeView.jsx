import { useState, useMemo, useRef, useEffect } from "react";
import MobileDrawer from "./MobileDrawer";
import MobileReadingPlayer from "./MobileReadingPlayer";
import MobileMangaGrid from "./MobileMangaGrid";
import MobileDetailOverlay from "./MobileDetailOverlay";

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

  const [detailIndex, setDetailIndex] = useState(null);

  const touchStartX = useRef(0);

  /* SWIPE DRAWER */
  useEffect(() => {
    function start(e) {
      touchStartX.current = e.touches[0].clientX;
    }
    function move(e) {
      if (touchStartX.current < 30 && e.touches[0].clientX > 80) {
        setDrawerOpen(true);
      }
    }
    window.addEventListener("touchstart", start);
    window.addEventListener("touchmove", move);
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
    };
  }, []);

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

  function openDetail(manga) {
    const index = filteredManga.findIndex(
      (x) => x.ID === manga.ID
    );
    setDetailIndex(index);
  }

  const filters = [
    { key: "all", label: "Tutti" },
    { key: "ongoing", label: "In corso" },
    { key: "to_complete", label: "Da completare" },
    { key: "completed", label: "Completati" },
    { key: "short", label: "Serie brevi" },
    { key: "oneshot", label: "One-shot" }
  ];

  return (
    <>
      <div className="min-h-screen pb-[100px]">

        {/* HEADER */}
        <div className="flex justify-between px-4 py-3 border-b border-white/10 bg-[#0b0b0f]">
          <button onClick={() => setDrawerOpen(true)}>☰</button>

          <div className="text-lg font-black">
            MangaVault <span className="text-yellow-400">10X</span>
          </div>

          <button onClick={() => setSearchOpen(true)}>
            <SearchIcon />
          </button>
        </div>

        {/* FILTERS */}
        <div className="px-4 pt-3 flex gap-2 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={
                filter === f.key
                  ? "px-3 py-1.5 bg-yellow-400 text-black rounded-lg text-xs"
                  : "px-3 py-1.5 bg-white/10 rounded-lg text-xs"
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* GRID */}
        <div className="px-3 mt-4">
          <MobileMangaGrid
            searchResults={filteredManga}
            filter={filter}
            onOpenDetail={openDetail}
          />
        </div>

        {drawerOpen && <MobileDrawer onClose={() => setDrawerOpen(false)} />}
        <MobileReadingPlayer />
      </div>

      {/* SEARCH */}
      {searchOpen && (
        <div className="fixed inset-0 bg-black z-[2000]">
          <input
            autoFocus
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full p-4"
          />
        </div>
      )}

      {/* ✅ VIEWER */}
      {detailIndex !== null && (
        <MobileDetailOverlay
          list={filteredManga}
          startIndex={detailIndex}
          onClose={() => setDetailIndex(null)}
        />
      )}
    </>
  );
}
