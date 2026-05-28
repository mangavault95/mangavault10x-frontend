import { useState, useEffect } from "react";
import MobileDrawer from "./MobileDrawer";
import MobileReadingPlayer from "./MobileReadingPlayer";
import MobileMangaGrid from "./MobileMangaGrid";

export default function MobileHomeView({
  manga = [],
  filteredManga = [],
  filter,
  setFilter
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  return (
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
          onClick={() =>
            window.dispatchEvent(new Event("openSearch"))
          }
          className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center"
        >
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
``
        </button>
      </div>

      {/* TITLE + FILTERS */}
      <div className="px-4 pt-4">
        <h1 className="text-lg font-bold text-white mb-2">
          La Mia Collezione
        </h1>

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
  );
}

