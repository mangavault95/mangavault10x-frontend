import { useState, useEffect, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import MangaGrid from "../components/MangaGrid";
import TopHero from "../components/TopHero";
import MangaDetail from "../components/MangaDetail";
import FavoritesModal from "../components/FavoritesModal";
import HistoryModal from "../components/HistoryModal";
import WishlistList from "../components/WishlistList";
import { getManga } from "../services/api";
import Fuse from "fuse.js";

export default function HomePage({ setAdminMode, setRecordsMode }) {
  const [search, setSearch] = useState("");
  const [selectedManga, setSelectedManga] = useState(null);
  const [mangaList, setMangaList] = useState([]);
  const [openMenu, setOpenMenu] = useState(false);
  const [openSidebar, setOpenSidebar] = useState(true);

  // MODALI
  const [showFavorites, setShowFavorites] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);

  useEffect(() => {
    getManga().then(d => setMangaList(d || []));
  }, []);

  useEffect(() => {
    const handler = (e) => setSelectedManga(e.detail);
    window.addEventListener("openMangaDetail", handler);

    const navHandler = (e) => {
      const page = e.detail?.page;
      if (!page) return;

      if (page === "records") {
        setRecordsMode(true);
        setAdminMode(false);
      } else if (page === "favorites") {
        setShowFavorites(true);
      } else if (page === "history") {
        setShowHistory(true);
      } else if (page === "wishlist") {
        setShowWishlist(true);
      }
    };

    window.addEventListener("navigate", navHandler);

    const toggleHandler = () => setOpenSidebar(s => !s);
    window.addEventListener("toggleSidebar", toggleHandler);

    return () => {
      window.removeEventListener("openMangaDetail", handler);
      window.removeEventListener("navigate", navHandler);
      window.removeEventListener("toggleSidebar", toggleHandler);
    };
  }, [setAdminMode, setRecordsMode]);

  const filteredSearch = useMemo(() => {
    if (!search) return mangaList;

    const fuse = new Fuse(mangaList, {
      keys: ["Titolo", "Autore", "Genere"],
      threshold: 0.3,
      ignoreLocation: true,
    });

    return fuse.search(search).map(r => r.item);
  }, [search, mangaList]);

  return (
    <div className="bg-[#111] text-white min-h-screen">

      {/* SIDEBAR */}
      <div className={`fixed left-0 top-0 h-screen ${openSidebar ? "w-72" : "w-28"}`}>
        <Sidebar open={openSidebar} />
      </div>

      {/* MAIN */}
      <div
        style={{ marginLeft: openSidebar ? 288 : 112 }}
        className="px-10 py-6 space-y-8 transition-all duration-300"
      >
        <TopHero manga={mangaList} onSelect={setSelectedManga} />

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">La Mia Collezione</h2>

          <div className="flex gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca..."
              className="px-4 py-2 rounded bg-[#1a1a1a]"
            />
          </div>
        </div>

        <MangaGrid searchResults={filteredSearch} />
      </div>

      {/* MODAL: MANGA DETAIL */}
      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          onClose={() => setSelectedManga(null)}
        />
      )}

      {/* FAVORITES */}
      {showFavorites && (
        <FavoritesModal onClose={() => setShowFavorites(false)} />
      )}

      {/* HISTORY */}
      {showHistory && (
        <HistoryModal onClose={() => setShowHistory(false)} />
      )}

      {/* ✅ WISHLIST OVERLAY FINALE */}
      {showWishlist && (
        <div
          className="fixed inset-0 z-[999]"
          style={{
            background:
              "linear-gradient(135deg, rgba(10,10,10,0.85), rgba(20,20,20,0.85))",
            backdropFilter: "blur(6px)"
          }}
        >
          <WishlistList onClose={() => setShowWishlist(false)} />
        </div>
      )}
    </div>
  );
}
