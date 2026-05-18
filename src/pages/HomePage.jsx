import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import MangaGrid from "../components/MangaGrid";
import TopHero from "../components/TopHero";
import MangaDetail from "../components/MangaDetail";
import { getManga } from "../services/api";

export default function HomePage({
  setAdminMode,
  setRecordsMode,
  darkMode
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedManga, setSelectedManga] = useState(null);
  const [mangaList, setMangaList] = useState([]);
  const [openMenu, setOpenMenu] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getManga();
      setMangaList(data || []);
    }
    load();
  }, []);

  // APERTURA DETAIL DA SIDEBAR
  useEffect(() => {
    const handler = (e) => setSelectedManga(e.detail);
    window.addEventListener("openMangaDetail", handler);
    return () => window.removeEventListener("openMangaDetail", handler);
  }, []);

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

      {/* CONTENUTO */}
      <div className="ml-72 px-10 py-6 space-y-8">

        <TopHero manga={mangaList} onSelect={setSelectedManga} />

        {/* HEADER */}
        <div className="flex items-center justify-between">

          <h2 className="text-2xl font-bold">
            La Mia Collezione
          </h2>

          {/* SEARCH (ORA COERENTE) */}
          <div className="
            flex items-center gap-3 px-4 py-2
            rounded-full
            bg-[#1a1a1a]
            border border-white/10
            hover:border-yellow-400
            transition
          ">
            <span className="text-zinc-500 text-sm">🔍</span>
            <input
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
              placeholder="Cerca manga..."
              className="
                bg-transparent outline-none
                text-sm text-white
                placeholder:text-zinc-500
                w-56
              "
            />
          </div>

          {/* HAMBURGER MENU */}
          <div className="relative">

            <button
              onClick={()=>setOpenMenu(prev=>!prev)}
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
                rounded-xl overflow-hidden
                bg-[#151515]/95 backdrop-blur
                border border-white/10
                shadow-[0_10px_30px_rgba(0,0,0,0.7)]
              ">

                {/* TEMA */}
                <button
                  className="
                    w-full px-4 py-3 text-left
                    hover:bg-[#1f1f1f]
                    border-b border-white/5
                  "
                >
                  Tema
                </button>

                {/* ADMIN */}
                <button
                  onClick={()=>{
                    setAdminMode(true);
                    setRecordsMode(false);
                    setOpenMenu(false);
                  }}
                  className="
                    w-full px-4 py-3 text-left
                    hover:bg-[#1f1f1f]
                    border-b border-white/5
                  "
                >
                  Admin
                </button>

                {/* RECORDS */}
                <button
                  onClick={()=>{
                    setRecordsMode(true);
                    setAdminMode(false);
                    setOpenMenu(false);
                  }}
                  className="
                    w-full px-4 py-3 text-left
                    hover:bg-[#1f1f1f]
                  "
                >
                  Records
                </button>

              </div>
            )}

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
        <MangaGrid search={search} filter={filter} />

      </div>

      {/* DETTAGLIO */}
      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          onClose={()=>setSelectedManga(null)}
        />
      )}

    </div>
  );
}
