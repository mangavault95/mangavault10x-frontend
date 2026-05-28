import { useState } from "react";
import MobileDrawer from "./MobileDrawer";
import MobileReadingPlayer from "./MobileReadingPlayer";
import MobileMangaGrid from "./MobileMangaGrid";

/* ICON */
function SearchIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
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

  const [sort, setSort] = useState("title");

  function navigate(page) {
    window.dispatchEvent(
      new CustomEvent("navigate", { detail: { page } })
    );

    window.dispatchEvent(new Event("open" + page.charAt(0).toUpperCase() + page.slice(1) + "Modal"));

    setDrawerOpen(false);
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
      <div className="w-full min-h-screen flex flex-col relative pb-[90px]">

        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0b0b0f]">

          <button onClick={() => setDrawerOpen(true)} className="btn">
            ☰
          </button>

          <div className="text-lg font-black">
            MangaVault <span className="text-yellow-400">10X</span>
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center"
          >
            <SearchIcon />
          </button>
        </div>

        {/* TITLE */}
        <div className="px-4 pt-4">
          <h1 className="text-lg font-bold text-white">La Mia Collezione</h1>

          {/* FILTRI */}
          <div className="flex gap-2 overflow-x-auto mt-2">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs ${
                  filter === f.key
                    ? "bg-yellow-400 text-black"
                    : "bg-white/[0.06]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* SORT */}
          <div className="flex gap-2 mt-3">
            {[
              { key: "title", label: "Titolo" },
              { key: "volumes", label: "Volumi" },
              { key: "author", label: "Autore" }
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`px-3 py-1 text-xs rounded-lg ${
                  sort === s.key
                    ? "bg-yellow-400 text-black"
                    : "bg-white/10"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* GRID */}
        <div className="px-3 mt-2 flex-1">
          <MobileMangaGrid
            searchResults={filteredManga}
            filter={filter}
            sort={sort}
          />
        </div>

        {drawerOpen && (
          <MobileDrawer
            onClose={() => setDrawerOpen(false)}
            onNavigate={navigate}
            manga={manga}
          />
        )}

        <MobileReadingPlayer />
      </div>

      {/* SEARCH */}
      {searchOpen && (
        <div className="fixed inset-0 z-[1300] bg-black">

          <input
            autoFocus
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Cerca..."
            className="w-full p-4 text-white bg-transparent"
          />

          {filteredManga
            .filter((m) =>
              m.Titolo?.toLowerCase().includes(searchValue.toLowerCase())
            )
            .map((m) => (
              <div key={m.ID}>{m.Titolo}</div>
            ))}
        </div>
      )}
    </>
  );
}
