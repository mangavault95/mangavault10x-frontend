import { useState } from "react";
import MobileDrawer from "./MobileDrawer";
import MobileReadingPlayer from "./MobileReadingPlayer";
import MobileMangaGrid from "./MobileMangaGrid";

/* ---------- ICON ---------- */
function SearchIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
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

export default function MobileHomeView({
  manga = [],
  filteredManga = [],
  filter,
  setFilter
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  function navigate(page) {
    window.dispatchEvent(
      new CustomEvent("navigate", { detail: { page } })
    );

    if (page === "favorites") {
      window.dispatchEvent(new Event("openFavoritesModal"));
    }
    if (page === "history") {
      window.dispatchEvent(new Event("openHistoryModal"));
    }
    if (page === "records") {
      window.dispatchEvent(new Event("openRecordsModal"));
    }
    if (page === "wishlist") {
      window.dispatchEvent(new Event("openWishlistModal"));
    }

    setDrawerOpen(false);
  }

  /* -------------------- UI -------------------- */

  return (
    <>
      <div className="w-full min-h-screen flex flex-col relative pb-[90px]">

        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0b0b0f]">

          {/* hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center"
          >
            <div className="flex flex-col gap-[3px]">
              <span className="block w-[16px] h-[2px] bg-white" />
              <span className="block w-[16px] h-[2px] bg-white" />
              <span className="block w-[16px] h-[2px] bg-white" />
            </div>
          </button>

          {/* logo */}
          <div className="text-lg font-black tracking-tight">
            <span className="text-white">MangaVault</span>{" "}
            <span className="text-yellow-400">10X</span>
          </div>

          {/* search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center"
          >
            <SearchIcon />
          </button>
        </div>

        {/* TITLE */}
        <div className="px-4 pt-4">
          <h1 className="text-lg font-bold text-white mb-2">
            La Mia Collezione
          </h1>

          {/* FILTERS */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {[
              "all",
              "ongoing",
              "to_complete",
              "completed",
              "short",
              "oneshot"
            ].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  px-3 py-1.5 rounded-full text-xs whitespace-nowrap
                  border transition
                  ${
                    filter === f
                      ? "bg-yellow-400 text-black border-yellow-400"
                      : "bg-white/[0.05] border-white/10 text-zinc-300"
                  }
                `}
              >
                {f === "all"
                  ? "Tutti"
                  : f === "ongoing"
                  ? "In corso"
                  : f === "to_complete"
                  ? "Da completare"
                  : f === "completed"
                  ? "Completati"
                  : f === "short"
                  ? "Brevi"
                  : "One shot"}
              </button>
            ))}
          </div>
        </div>

        {/* GRID */}
        <div className="flex-1 px-3 mt-2">
          <MobileMangaGrid
            searchResults={filteredManga}
            filter={filter}
          />
        </div>

        {/* DRAWER */}
        {drawerOpen && (
          <MobileDrawer
            onClose={() => setDrawerOpen(false)}
            onNavigate={navigate}
            manga={manga}
          />
        )}

        {/* PLAYER */}
        <MobileReadingPlayer />
      </div>

      {/* ✅ SEARCH OVERLAY (CORRETTO) */}
      {searchOpen && (
        <div className="fixed inset-0 z-[1300] bg-[#0b0b0f] flex flex-col">

          {/* HEADER */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">

            <button
              onClick={() => setSearchOpen(false)}
              className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center"
            >
              ←
            </button>

            <input
              autoFocus
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Cerca manga..."
              className="flex-1 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 outline-none text-sm"
            />
          </div>

          {/* RESULTS */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">

            {filteredManga
              .filter((m) => {
                const q = searchValue.toLowerCase();
                if (!q) return true;

                return (
                  m.Titolo?.toLowerCase().includes(q) ||
                  m.Autore?.toLowerCase().includes(q) ||
                  m.Genere?.toLowerCase().includes(q)
                );
              })
              .slice(0, 20)
              .map((manga) => (
                <button
                  key={manga.ID}
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("openMangaDetail", {
                        detail: manga
                      })
                    );
                    setSearchOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.05] border border-white/10 w-full text-left"
                >
                  {manga.CoverURL && (
                    <img
                      src={manga.CoverURL}
                      className="w-10 h-14 object-cover rounded-md"
                    />
                  )}

                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {manga.Titolo}
                    </div>
                    <div className="text-xs text-zinc-400 truncate">
                      {manga.Autore}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </>
  );
}
