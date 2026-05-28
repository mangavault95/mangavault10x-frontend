import { useState, useMemo, useRef, useEffect } from "react";

import MobileDrawer from "./MobileDrawer";
import MobileReadingPlayer from "./MobileReadingPlayer";
import MobileMangaGrid from "./MobileMangaGrid";
import MobileDetailOverlay from "./MobileDetailOverlay";

import MobileNavStack from "./MobileNavStack";
import MobileHistoryPanel from "./MobileHistoryPanel";
import MobileWishlistPanel from "./MobileWishlistPanel";
import MobileRecordsPanel from "./MobileRecordsPanel";
import MobileFavoritesPanel from "./MobileFavoritesPanel";

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
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

  const [detailList, setDetailList] = useState([]);
  const [detailIndex, setDetailIndex] = useState(null);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const hasDetailOpen = detailIndex !== null;
  const anyOverlayOpen = drawerOpen || searchOpen || hasDetailOpen;

  /* BODY LOCK: evita che la home scrolli sotto overlay/pannelli */
  useEffect(() => {
    if (anyOverlayOpen) {
      const previousOverflow = document.body.style.overflow;
      const previousTouchAction = document.body.style.touchAction;

      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      return () => {
        document.body.style.overflow = previousOverflow;
        document.body.style.touchAction = previousTouchAction;
      };
    }
  }, [anyOverlayOpen]);

  /* SWIPE DRAWER PIÙ SICURO */
  useEffect(() => {
    function onTouchStart(e) {
      if (anyOverlayOpen) return;

      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
    }

    function onTouchEnd(e) {
      if (anyOverlayOpen) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX.current;
      const dy = touch.clientY - touchStartY.current;

      const startedFromEdge = touchStartX.current <= 18;
      const horizontalIntent = dx > 115 && Math.abs(dy) < 38;

      if (startedFromEdge && horizontalIntent) {
        setDrawerOpen(true);
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [anyOverlayOpen]);

  /* SEARCH */
  const searchResults = useMemo(() => {
    const q = searchValue.trim().toLowerCase();

    return filteredManga.filter((m) => {
      if (!q) return true;

      return (
        String(m?.Titolo || "").toLowerCase().includes(q) ||
        String(m?.Autore || "").toLowerCase().includes(q) ||
        String(m?.Genere || "").toLowerCase().includes(q)
      );
    });
  }, [searchValue, filteredManga]);

  /* APERTURA DETAIL DA GRID / SEARCH */
  function openDetail(mangaItem, sourceList = filteredManga) {
    const index = sourceList.findIndex((x) => String(x.ID) === String(mangaItem.ID));

    if (index >= 0) {
      setDetailList(sourceList);
      setDetailIndex(index);
    } else {
      setDetailList([mangaItem]);
      setDetailIndex(0);
    }
  }

  /* APERTURA DETAIL DA PANNELLI MOBILE */
  useEffect(() => {
    function handler(e) {
      const mangaItem = e.detail;
      if (!mangaItem) return;

      openDetail(mangaItem, filteredManga);
    }

    window.addEventListener("openMangaDetail", handler);

    return () => {
      window.removeEventListener("openMangaDetail", handler);
    };
  }, [filteredManga]);

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
      <div className="mobile-app min-h-screen pb-[100px]">
        {/* HEADER */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0b0b0f]/95 backdrop-blur-xl">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDrawerOpen(true);
            }}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition"
            aria-label="Apri menu"
          >
            <MenuIcon />
          </button>

          <div className="text-[20px] font-black tracking-tight mobile-no-select">
            <span className="text-white">MangaVault</span>{" "}
            <span className="text-yellow-400 text-[25px] drop-shadow-[0_0_10px_rgba(234,179,8,0.45)]">
              10X
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSearchOpen(true);
            }}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition"
            aria-label="Cerca"
          >
            <SearchIcon />
          </button>
        </div>

        {/* FILTERS */}
        <div className="px-4 pt-4 flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFilter(f.key);
              }}
              className={`
                px-4 py-2 rounded-xl text-[12px] border whitespace-nowrap
                active:scale-95 transition
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
            onOpenDetail={(mangaItem) => openDetail(mangaItem, filteredManga)}
          />
        </div>

        {drawerOpen && (
          <MobileDrawer
            onClose={() => setDrawerOpen(false)}
          />
        )}

        <MobileReadingPlayer />
      </div>

      {/* SEARCH OVERLAY */}
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
        <div className="sticky top-0 z-10 p-4 border-b border-white/10 flex gap-3 bg-[#0b0b0f]/95 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              setSearchValue("");
            }}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition"
            aria-label="Chiudi ricerca"
          >
            ←
          </button>

          <input
            autoFocus
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Cerca manga..."
            className="flex-1 bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-sm text-white outline-none"
          />
        </div>

        <div className="p-3 grid grid-cols-2 gap-3 overflow-y-auto h-[calc(100vh-73px)] no-scrollbar">
          {searchResults.map((m) => (
            <button
              key={m.ID}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openDetail(m, searchResults);
                setSearchOpen(false);
              }}
              className="bg-white/5 rounded-xl p-2 border border-white/10 active:scale-95 transition text-left"
            >
              <img
                src={m.CoverURL}
                alt={m.Titolo || "Cover manga"}
                className="w-full h-[120px] object-contain"
              />

              <div className="text-xs mt-1 line-clamp-2 text-white">
                {m.Titolo}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* DETAIL */}
      {detailIndex !== null && (
        <MobileDetailOverlay
          list={detailList}
          startIndex={detailIndex}
          onClose={() => {
            setDetailIndex(null);
            setDetailList([]);
          }}
        />
      )}

      {/* NAV STACK */}
      <MobileNavStack
        screens={{
          history: MobileHistoryPanel,
          wishlist: MobileWishlistPanel,
          records: (props) => (
            <MobileRecordsPanel
              {...props}
              list={filteredManga}
            />
          ),
          favorites: (props) => (
            <MobileFavoritesPanel
              {...props}
              list={filteredManga}
            />
          )
        }}
      />
    </>
  );
}
