import { useState, useEffect, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import MangaGrid from "../components/MangaGrid";
import TopHero from "../components/TopHero";
import MangaDetail from "../components/MangaDetail";
import FavoritesModal from "../components/FavoritesModal";
import HistoryModal from "../components/HistoryModal";
import WishlistModal from "../components/WishlistModal";
import { getManga } from "../services/api";
import Fuse from "fuse.js";

export default function HomePage({ setAdminMode, setRecordsMode }) {
  const [search, setSearch] = useState("");
  const [selectedManga, setSelectedManga] = useState(null);
  const [mangaList, setMangaList] = useState([]);
  const [openMenu, setOpenMenu] = useState(false);

  // controllo apertura sidebar
  const [openSidebar, setOpenSidebar] = useState(true);

  // modali locali
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

    // apri modali da sidebar
    const favOpen = () => setShowFavorites(true);
    const histOpen = () => setShowHistory(true);
    const wishOpen = () => setShowWishlist(true);
    window.addEventListener("openFavoritesModal", favOpen);
    window.addEventListener("openHistoryModal", histOpen);
    window.addEventListener("openWishlistModal", wishOpen);

    // aggiornamento preferiti -> ricarica lista per badge
    const favUpdated = () => getManga().then(d => setMangaList(d || []));
    window.addEventListener("favoritesUpdated", favUpdated);

    return () => {
      window.removeEventListener("openMangaDetail", handler);
      window.removeEventListener("navigate", navHandler);
      window.removeEventListener("openFavoritesModal", favOpen);
      window.removeEventListener("openHistoryModal", histOpen);
      window.removeEventListener("openWishlistModal", wishOpen);
      window.removeEventListener("favoritesUpdated", favUpdated);
    };
  }, [setAdminMode, setRecordsMode]);

  // fuzzy search (manteniamo la barra principale)
  const filteredSearch = useMemo(() => {
    if (!search) return mangaList;
    const fuse = new Fuse(mangaList, {
      keys: ["Titolo", "Autore", "Genere"],
      threshold: 0.3,
      ignoreLocation: true,
    });
    return fuse.search(search).map(r => r.item);
  }, [search, mangaList]);

  // rimuovo i filtri dalla UI come richiesto: non mostro i bottoni filtro
  return (
    <div className="bg-[#111] text-white min-h-screen">

      {/* TOGGLE SIDEBAR: posizionato a destra del logo quando aperto */}
      <button
        onClick={() => setOpenSidebar(s => !s)}
        style={{ left: openSidebar ? 220 : 16 }}
        className="fixed top-4 z-50 bg-black/40 backdrop-blur-md border border-white/10 text-white px-3 py-2 rounded-lg hover:bg-black/60 transition"
        aria-label={openSidebar ? "Chiudi sidebar" : "Apri sidebar"}
      >
        {openSidebar ? "◀" : "▶"}
      </button>

      {/* SIDEBAR */}
      <div className={`fixed left-0 top-0 h-screen transition-all duration-300 ${openSidebar ? "w-72" : "w-24"}`}>
        <Sidebar open={openSidebar} />
      </div>

      {/* MAIN: margine dinamico */}
      <div style={{ marginLeft: openSidebar ? 288 : 96 }} className="px-10 py-6 space-y-8 transition-all duration-300">
        <TopHero manga={mangaList} onSelect={setSelectedManga} />

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">La Mia Collezione</h2>

          <div className="flex items-center gap-4">
            <div className="relative flex items-center">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca titolo, autore..."
                className="px-5 py-2.5 w-56 rounded-full bg-[#151515] border border-white/10 text-sm placeholder:text-zinc-500 outline-none focus:w-64 focus:border-yellow-400 transition-all duration-300 hover:border-white/20"
              />
            </div>

            <div className="relative">
              <button onClick={() => setOpenMenu(p => !p)} className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-white/10 hover:border-yellow-400 transition">☰</button>
              {openMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-[#151515]/95 backdrop-blur rounded-xl border border-white/10 shadow-xl">
                  <button className="w-full px-4 py-3 text-left hover:bg-[#1f1f1f] border-b border-white/5">Tema</button>
                  <button onClick={() => { setAdminMode(true); setRecordsMode(false); setOpenMenu(false); }} className="w-full px-4 py-3 text-left hover:bg-[#1f1f1f] border-b border-white/5">Admin</button>
                  <button onClick={() => { setRecordsMode(true); setAdminMode(false); setOpenMenu(false); }} className="w-full px-4 py-3 text-left hover:bg-[#1f1f1f]">Records</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* GRID */}
        <MangaGrid searchResults={filteredSearch} />

      </div>

      {selectedManga && <MangaDetail manga={selectedManga} onClose={() => setSelectedManga(null)} />}

      {/* MODALI per Preferiti / Ultime letture / Wishlist */}
      {showFavorites && <FavoritesModal onClose={() => setShowFavorites(false)} />}
      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
      {showWishlist && <WishlistModal onClose={() => setShowWishlist(false)} />}
    </div>
  );
}
