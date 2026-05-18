import { useState, useEffect, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import MangaGrid from "../components/MangaGrid";
import TopHero from "../components/TopHero";
import MangaDetail from "../components/MangaDetail";
import { getManga } from "../services/api";
import Fuse from "fuse.js";

export default function HomePage({
  setAdminMode,
  setRecordsMode
}) {

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedManga, setSelectedManga] = useState(null);
  const [mangaList, setMangaList] = useState([]);
  const [openMenu, setOpenMenu] = useState(false);

  useEffect(() => {
    getManga().then(d => setMangaList(d || []));
  }, []);

  useEffect(() => {
    const handler = (e) => setSelectedManga(e.detail);
    window.addEventListener("openMangaDetail", handler);
    return () => window.removeEventListener("openMangaDetail", handler);
  }, []);

  // ✅ SEARCH INTELLIGENTE (fuzzy)
  const filteredSearch = useMemo(() => {

    if (!search) return mangaList;

    const fuse = new Fuse(mangaList, {
      keys: ["Titolo", "Autore", "Genere"],
      threshold: 0.3,
      ignoreLocation: true,
    });

    return fuse.search(search).map(r => r.item);

  }, [search, mangaList]);

  const filters = [
    { key: "all", label: "Tutti" },
    { key: "ongoing", label: "In corso" },
    { key: "to_complete", label: "Da completare" },
    { key: "completed", label: "Completati" },
    { key: "short", label: "Serie brevi" },
    { key: "oneshot", label: "Volumi unici" }
  ];

  return (
    <div className="bg-[#111] text-white min-h-screen">

      {/* SIDEBAR */}
      <div className="fixed left-0 top-0 w-72 h-screen bg-black/60 border-r border-zinc-800 backdrop-blur-xl">
        <Sidebar />
      </div>

      {/* MAIN */}
      <div className="ml-72 px-10 py-6 space-y-8">

        <TopHero manga={mangaList} onSelect={setSelectedManga} />

        {/* HEADER */}
        <div className="flex items-center justify-between">

          <h2 className="text-2xl font-bold">
            La Mia Collezione
          </h2>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-4">

            {/* SEARCH PREMIUM INTELLIGENTE */}
            <div className="
              relative
              flex items-center
            ">

              <input
                value={search}
                onChange={(e)=>setSearch(e.target.value)}
                placeholder="Cerca titolo, autore..."
                className="
                  px-5 py-2.5 w-56
                  rounded-full
                  bg-[#151515]
                  border border-white/10
                  text-sm
                  placeholder:text-zinc-500
                  outline-none

                  focus:w-64
                  focus:border-yellow-400
                  transition-all duration-300

                  hover:border-white/20
                "
              />

              {/* glow sotto */}
              <div className="
                absolute inset-0 rounded-full
                bg-yellow-400/10 blur-md opacity-0
                pointer-events-none
                transition
              " />

            </div>

            {/* MENU */}
            <div className="relative">

              <button
                onClick={()=>setOpenMenu(p=>!p)}
                className="
                  w-10 h-10 rounded-xl
                  bg-[#1a1a1a]
                  border border-white/10
                  hover:border-yellow-400
                  transition
                "
              >
                ☰
              </button>

              {openMenu && (
                <div className="
                  absolute right-0 mt-2 w-44
                  bg-[#151515]/95
                  backdrop-blur
                  rounded-xl
                  border border-white/10
                  shadow-xl
                ">

                  <button className="w-full px-4 py-3 text-left hover:bg-[#1f1f1f] border-b border-white/5">
                    Tema
                  </button>

                  <button
                    onClick={()=>{
                      setAdminMode(true);
                      setRecordsMode(false);
                      setOpenMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-[#1f1f1f] border-b border-white/5"
                  >
                    Admin
                  </button>

                  <button
                    onClick={()=>{
                      setRecordsMode(true);
                      setAdminMode(false);
                      setOpenMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-[#1f1f1f]"
                  >
                    Records
                  </button>

                </div>
              )}

            </div>

          </div>

        </div>

        {/* FILTRI */}
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={()=>setFilter(f.key)}
              className={`
                px-4 py-2 rounded-xl text-sm
                transition
                ${filter === f.key
                  ? "bg-yellow-400 text-black"
                  : "bg-[#1a1a1a] border border-white/10 hover:bg-[#222]"}
              `}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* GRID */}
        <MangaGrid
          searchResults={filteredSearch}
          filter={filter}
        />

      </div>

      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          onClose={()=>setSelectedManga(null)}
        />
      )}

    </div>
  );
}
