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
      ignoreLocation: true,
    });

    return fuse.search(search).map((r) => r.item);
  }, [search, mangaList]);

  const filterButtons = [
    { key: "all", label: "Tutti" },
    { key: "ongoing", label: "In corso" },
    { key: "to_complete", label: "Da completare" },
    { key: "completed", label: "Completati" },
    { key: "short", label: "Serie brevi" },
    { key: "oneshot", label: "One-shot" },
  ];

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, rgb(8, 11, 22), rgb(10, 12, 24) 30%, rgb(8, 10, 18) 100%)",
      }}
    >
      {/* AMBIENT LIGHTS */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-80px] left-[180px] w-[420px] h-[420px] rounded-full bg-blue-500/15 blur-[130px]" />
        <div className="absolute top-[180px] right-[120px] w-[420px] h-[420px] rounded-full bg-violet-500/12 blur-[140px]" />
        <div className="absolute bottom-[-120px] left-[35%] w-[420px] h-[420px] rounded-full bg-indigo-500/10 blur-[130px]" />
      </div>

      {/* SIDEBAR */}
      <div
        className="fixed left-0 top-0 h-screen transition-all duration-300 z-20"
        style={{
          width: openSidebar ? sidebarOpenWidth : sidebarClosedWidth,
        }}
      >
        <Sidebar open={openSidebar} />
      </div>

      {/* MAIN */}
      <div
        style={{
          marginLeft: openSidebar ? sidebarOpenWidth : sidebarClosedWidth,
        }}
        className="relative z-10 px-10 py-6 space-y-8 transition-all duration-300"
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
              className="
                px-5 py-2.5 w-56 rounded-full
                bg-[rgba(24,30,56,0.42)]
                border border-white/10
                text-sm placeholder:text-zinc-500
                outline-none
                focus:w-64 focus:border-yellow-400
                transition-all duration-300
                hover:border-white/20
              "
            />

            <div className="relative">
              <button
                onClick={() => setOpenMenu((p) => !p)}
                className="
                  w-10 h-10 rounded-xl
                  bg-[rgba(24,30,56,0.42)]
                  border border-white/10
                  hover:border-yellow-400
                  transition
                "
              >
                ☰
              </button>

              {openMenu && (
                <div
                  className="
                    absolute right-0 mt-2 w-44
                    rounded-xl border border-white/10 shadow-xl z-50
                  "
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(20,26,52,0.92), rgba(12,16,32,0.92))",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                  }}
                >
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

            const baseClasses =
              "px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200";
            const activeClasses =
              "bg-yellow-400 text-black border-yellow-400 shadow-[0_0_18px_rgba(234,179,8,0.28)]";
            const inactiveClasses =
              "bg-[rgba(24,30,56,0.42)] text-zinc-300 border-white/10 hover:bg-[rgba(32,40,72,0.52)] hover:text-white hover:border-yellow-400/30";

            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`${baseClasses} ${
                  active ? activeClasses : inactiveClasses
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* GRID */}
        <MangaGrid
          searchResults={filteredSearch}
          filter={activeFilter === "all" ? undefined : activeFilter}
        />
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
