import { useState, useMemo, useRef, useEffect } from "react";
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
  const [previewManga, setPreviewManga] = useState(null);

  const touchStartX = useRef(0);

  /* ✅ SWIPE DRAWER */
  useEffect(() => {
    function onTouchStart(e) {
      touchStartX.current = e.touches[0].clientX;
    }

    function onTouchMove(e) {
      const x = e.touches[0].clientX;
      if (touchStartX.current < 30 && x > 80) {
        setDrawerOpen(true);
      }
    }

    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchmove", onTouchMove);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
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

          <button onClick={() => setDrawerOpen(true)} className="w-10 h-10 bg-white/5 rounded-xl">
            ☰
          </button>

          {/* ✅ LOGO GRANDE */}
          <div className="text-2xl font-black tracking-tight">
            <span className="text-white">MangaVault</span>{" "}
            <span className="text-yellow-400 text-3xl drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]">
              10X
            </span>
          </div>

          <button onClick={() => setSearchOpen(true)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
            <SearchIcon />
          </button>
        </div>

        {/* FILTERS */}
        <div className="px-4 pt-4 flex gap-2 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-xs border ${
                filter === f.key
                  ? "bg-yellow-400 text-black border-yellow-400"
                  : "bg-white/5 border-white/10 text-zinc-300"
              }`}
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
            <MobileMangaGrid
  searchResults={filteredManga}
  filter={filter}
          />
        </div>

        {drawerOpen && (
          <MobileDrawer onClose={() => setDrawerOpen(false)} manga={manga} />
        )}

        <MobileReadingPlayer />
      </div>

      {/* ✅ SEARCH iOS STYLE */}
      <div
        className={`fixed inset-0 z-[2000] bg-[#0b0b0f] transition-all duration-300 ${
          searchOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none"
        }`}
      >
        <div className="p-4 border-b border-white/10 flex gap-3">

          <button onClick={() => setSearchOpen(false)}>←</button>

          <input
            autoFocus
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Cerca manga..."
            className="flex-1 bg-white/5 px-3 py-2 rounded-lg"
          />
        </div>

        <div className="p-3 grid grid-cols-2 gap-3 overflow-y-auto">
          {searchResults.map((m) => (
            <button
              key={m.ID}
              onClick={() => {
                setPreviewManga(m);
                setSearchOpen(false);
              }}
              className="bg-white/5 rounded-xl p-2"
            >
              <img src={m.CoverURL} className="w-full h-[120px] object-contain" />
              <div className="text-xs mt-1 line-clamp-2">{m.Titolo}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ✅ PREVIEW */}
      {previewManga && (
        <div
          className="fixed inset-0 z-[2100] bg-black/70 backdrop-blur-sm flex items-end"
          onClick={() => setPreviewManga(null)}
        >
          <div className="w-full rounded-t-3xl bg-[#0b0b0f] p-4">
            <img
              src={previewManga.CoverURL}
              className="w-32 h-40 mx-auto object-contain"
            />

            <div className="text-center font-bold mt-3">
              {previewManga.Titolo}
            </div>

            <div className="text-center text-sm text-zinc-400">
              {previewManga.Autore}
            </div>

            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("openMangaDetail", {
                    detail: previewManga
                  })
                )
              }
              className="mt-4 w-full py-3 bg-yellow-400 text-black rounded-xl"
            >
              Apri dettaglio
            </button>
          </div>
        </div>
      )}
    </>
  );
}
