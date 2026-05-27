import { useState, useEffect, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import MangaGrid from "../components/MangaGrid";
import TopHero from "../components/TopHero";
import MangaDetail from "../components/MangaDetail";
import FavoritesModal from "../components/FavoritesModal";
import HistoryModal from "../components/HistoryModal";
import WishlistList from "../components/WishlistList";
import RecordsModal from "../components/RecordsModal";
import { getManga } from "../services/api";
import Fuse from "fuse.js";

export default function HomePage({ setAdminMode, setRecordsMode }) {
  const [search, setSearch] = useState("");
  const [selectedManga, setSelectedManga] = useState(null);
  const [mangaList, setMangaList] = useState([]);
  const [openMenu, setOpenMenu] = useState(false);

  const [openSidebar, setOpenSidebar] = useState(true);

  const [showFavorites, setShowFavorites] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [showRecords, setShowRecords] = useState(false);

  const [activeFilter, setActiveFilter] = useState("all");

  const sidebarOpenWidth = 340;
  const sidebarClosedWidth = 104;

  function refreshManga() {
    getManga().then((d) => setMangaList(d || []));
  }

  useEffect(() => {
    refreshManga();
  }, []);

  useEffect(() => {
    const handler = (e) => setSelectedManga(e.detail);

    const navHandler = (e) => {
      const page = e.detail?.page;
      if (!page) return;

      if (page === "records") {
        setShowRecords(true);
      } else if (page === "favorites") {
        setShowFavorites(true);
      } else if (page === "history") {
        setShowHistory(true);
      } else if (page === "wishlist") {
        setShowWishlist(true);
      }
    };

    const toggleHandler = () => setOpenSidebar((s) => !s);

    const favOpen = () => setShowFavorites(true);
    const histOpen = () => setShowHistory(true);
    const wishOpen = () => setShowWishlist(true);

    const refreshHandler = () => refreshManga();

    window.addEventListener("openMangaDetail", handler);
    window.addEventListener("navigate", navHandler);
    window.addEventListener("toggleSidebar", toggleHandler);

    window.addEventListener("openFavoritesModal", favOpen);
    window.addEventListener("openHistoryModal", histOpen);
    window.addEventListener("openWishlistModal", wishOpen);

    window.addEventListener("favoritesUpdated", refreshHandler);

    return () => {
      window.removeEventListener("openMangaDetail", handler);
      window.removeEventListener("navigate", navHandler);
      window.removeEventListener("toggleSidebar", toggleHandler);

      window.removeEventListener("openFavoritesModal", favOpen);
      window.removeEventListener("openHistoryModal", histOpen);
      window.removeEventListener("openWishlistModal", wishOpen);

      window.removeEventListener("favoritesUpdated", refreshHandler);
    };
  }, [setAdminMode, setRecordsMode]);

  const filteredSearch = useMemo(() => {
    if (!search) return mangaList;

    const fuse = new Fuse(mangaList, {
      keys: ["Titolo", "Autore", "Genere"],
      threshold: 0.3,
      ignoreLocation: true
    });

    return fuse.search(search).map((r) => r.item);
  }, [search, mangaList]);

  const filterButtons = [
    { key: "all", label: "Tutti" },
    { key: "ongoing", label: "In corso" },
    { key: "to_complete", label: "Da completare" },
    { key: "completed", label: "Completati" },
    { key: "short", label: "Serie brevi" },
    { key: "oneshot", label: "One-shot" }
  ];

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,12,22,1), rgba(8,10,18,1))"
      }}
    >
      {/* SIDEBAR */}
      <div
        className="fixed left-0 top-0 h-screen transition-all duration-300"
        style={{
          width: openSidebar ? sidebarOpenWidth : sidebarClosedWidth
        }}
      >
        <Sidebar open={openSidebar} />
      </div>

      {/* MAIN */}
      <div
        style={{
          marginLeft: openSidebar ? sidebarOpenWidth : sidebarClosedWidth
        }}
        className="px-10 py-6 space-y-8 transition-all duration-300"
      >
        <TopHero manga={mangaList} onSelect={setSelectedManga} />

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">La Mia Collezione</h2>

          <div className="flex items-center gap-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca titolo, autore..."
              className="px-5 py-2.5 w-56 rounded-full bg-white/[0.04] border border-white/10 text-sm placeholder:text-zinc-500 outline-none focus:w-64 focus:border-yellow-400 transition-all duration-300 hover:border-white/20"
            />

            <div className="relative">
              <button
                onClick={() => setOpenMenu((p) => !p)}
                className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 hover:border-yellow-400 transition"
              >
                ☰
              </button>

              {openMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-[rgba(18,22,42,0.92)] backdrop-blur-xl rounded-xl border border-white/10 shadow-xl z-50">
                  <button
                    onClick={() => {
                      setAdminMode(true);
                      setRecordsMode(false);
                      setOpenMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-white/10"
                  >
                    Admin
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FILTRI */}
        <div className="flex flex-wrap items-center gap-2">
          {filterButtons.map((f) => {
            const active = activeFilter === f.key;

            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={
                  "px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 " +
                  (active
                    ? "bg-yellow-400 text-black border-yellow-400 shadow-[0_0_18px_rgba(234,179,8,0.28)]"
                    : "bg-white/[0.05] text-zinc-300 border-white/10 hover:bg-white/[0.09] hover:text-white hover:border-yellow-400/30")
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* GRID */}
        <div
          className="rounded-[28px] p-5 border border-white/8"
          style={{
            background:
              "linear-gradient(180deg, rgba(18,22,42,0.20), rgba(12,14,28,0.20))",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)"
          }}
        >
          <MangaGrid
            searchResults={filteredSearch}
            filter={activeFilter === "all" ? undefined : activeFilter}
          />
        </div>
      </div>

      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          onClose={() => setSelectedManga(null)}
        />
      )}

      {showFavorites && (
        <FavoritesModal onClose={() => setShowFavorites(false)} />
      )}

      {showHistory && (
        <HistoryModal onClose={() => setShowHistory(false)} />
      )}

      {showWishlist && (
        <WishlistList onClose={() => setShowWishlist(false)} />
      )}

      {showRecords && (
        <RecordsModal onClose={() => setShowRecords(false)} />
      )}
    </div>
  );
}
