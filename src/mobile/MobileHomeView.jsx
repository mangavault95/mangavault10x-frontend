import { useState, useMemo, useRef, useEffect } from "react";
import MobileDrawer from "./MobileDrawer";
import MobileReadingPlayer from "./MobileReadingPlayer";
import MobileMangaGrid from "./MobileMangaGrid";
import MobileDetailOverlay from "./MobileDetailOverlay";

import MobileHistoryPanel from "./MobileHistoryPanel";
import MobileWishlistPanel from "./MobileWishlistPanel";
import MobileRecordsPanel from "./MobileRecordsPanel";

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
  const [panel, setPanel] = useState(null);

  const touchStartX = useRef(0);

  /* ✅ SWIPE DRAWER */
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

  /* ✅ NAVIGAZIONE PANNELLI (fix hamburger) */
  useEffect(() => {
    function nav(e) {
      setPanel(e.detail?.page);
    }

    window.addEventListener("navigate", nav);
    return () => window.removeEventListener("navigate", nav);
  }, []);

  /* ✅ SEARCH */
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

  /* ✅ OPEN DETAIL */
  function openDetail(mangaItem) {
    const index = filteredManga.findIndex(
      (x) => x.ID === mangaItem.ID
    );

    setDetailIndex(index);
  }

  /* FILTERS */
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0b0b0f]">

          <button
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"
          >
            ☰
          </button>

          <div className="text-[20px] font-black tracking-tight">
            <span className="text-white">MangaVault</span>{" "}
            <span className="text-yellow-400">10X</span>
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"
          >
            <SearchIcon />
          </button>
        </div>

        {/* FILTERS */}
        <div className="px-4 pt-4 flex gap-2 overflow-x-auto pb-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`
                px-4 py-2 rounded-xl text-[12px] border whitespace-nowrap
                ${
                  filter === f.key
                    ? "bg-yellow-400 text-black border-yellow-400"
                    : "bg-white/5 border-white/10 text-zinc-300"
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* GRID */}
        <div className="px-3 mt-3">
          <MobileMangaGrid
            searchResults={filteredManga}
            filter={filter}
            onOpenDetail={openDetail}
          />
        </div>

        {/* DRAWER */}
        {drawerOpen && (
          <MobileDrawer onClose={() => setDrawerOpen(false)} />
        )}

        {/* PLAYER */}
        <MobileReadingPlayer />
      </div>

      {/* ✅ SEARCH OVERLAY */}
      <div
        className={`
          fixed inset-0 z-[2000] bg-[#0b0b0f]
          transition-all duration-300
          ${
            searchOpen
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-full pointer-events-none"
          }
        `}
      >
        <div className="p-4 border-b border-white/10 flex gap-3">

          <button onClick={() => setSearchOpen(false)}>←</button>

          <input
            autoFocus
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Cerca manga..."
            className="flex-1 bg-white/5 px-3 py-2 rounded-lg text-sm text-white outline-none"
          />
        </div>

        <div className="p-3 grid grid-cols-2 gap-3 overflow-y-auto">
          {searchResults.map((m) => (
            <button
              key={m.ID}
              onClick={() => {
                openDetail(m);
                setSearchOpen(false);
              }}
              className="bg-white/5 rounded-xl p-2 border border-white/10 active:scale-95 transition"
            >
              <img
                src={m.CoverURL}
                className="w-full h-[120px] object-contain"
              />
              <div className="text-xs mt-1 line-clamp-2">
                {m.Titolo}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ✅ DETAIL VIEWER */}
      {detailIndex !== null && (
        <MobileDetailOverlay
          list={filteredManga}
          startIndex={detailIndex}
          onClose={() => setDetailIndex(null)}
        />
      )}

      {/* ✅ PANNELLI MOBILE */}
      {panel === "history" && (
        <MobileHistoryPanel onClose={() => setPanel(null)} />
      )}

      {panel === "wishlist" && (
        <MobileWishlistPanel onClose={() => setPanel(null)} />
      )}

      {panel === "records" && (
        <MobileRecordsPanel onClose={() => setPanel(null)} />
      )}
    </>
  );
}
